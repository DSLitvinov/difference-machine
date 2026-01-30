"""
Repository Manager for handling Forester repository operations.
"""

from pathlib import Path
from typing import Optional, List, Dict, Any
from PyQt6.QtCore import QObject, pyqtSignal, pyqtProperty, pyqtSlot, QTimer, QUrl
from PyQt6.QtWidgets import QApplication
from PyQt6.QtGui import QDesktopServices
import atexit
import json
import os
import sys
import time
import tempfile
import shutil
import subprocess

from .forester_api import get_api
from .logging_config import get_logger
from .config_loader import (
    get_user_name,
    get_blender_path,
    get_forester_binary_path,
    get_blender_executable,
    get_merge_apply_script_path,
)

log = get_logger()
# Import FileMetadata - use absolute import from package root
# This matches the import style used in main.py
from file_viewer.file_metadata import FileMetadata
from . import diff as _diff_module
from . import images as _images_module
from . import merge as _merge_module

class RepositoryManager(QObject):
    """Manages Forester repository operations."""
    
    # Signals
    repositoryChanged = pyqtSignal(str)  # repo_path
    statusChanged = pyqtSignal()
    errorChanged = pyqtSignal(str)
    apiAvailabilityChanged = pyqtSignal(bool)
    branchChanged = pyqtSignal(str)  # branch_name
    defaultAuthorChanged = pyqtSignal()
    compareChanged = pyqtSignal()
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self._current_repository = ""
        self._api = None
        self._last_status = None
        self._last_error = ""
        self._is_repository = False
        self._api_available = False
        self._api_wrapper = None
        self._api_initialized = False
        self._status_timer = None
        self._compare_temp_dirs = []
        self._compare_active = False
        atexit.register(self._cleanup_compare_dirs)
    
    def _cleanup_compare_dirs(self) -> None:
        """Remove compare temp dirs (same as clearCompare). Called on process exit via atexit."""
        if not self._compare_temp_dirs:
            self._set_compare_active(False)
            return
        for temp_dir in self._compare_temp_dirs:
            try:
                shutil.rmtree(temp_dir, ignore_errors=True)
            except Exception:
                pass
        self._compare_temp_dirs = []
        self._set_compare_active(False)
    
    @pyqtProperty(str, notify=repositoryChanged)
    def currentRepository(self):
        """Get the current repository path."""
        return self._current_repository

    @pyqtProperty('QVariant', notify=statusChanged)
    def lastStatus(self):
        """Get the last cached repository status."""
        return self._last_status

    @pyqtProperty(str, notify=errorChanged)
    def lastError(self):
        """Get the last error message."""
        return self._last_error

    @pyqtProperty(str, notify=defaultAuthorChanged)
    def defaultAuthor(self):
        """Get default author name from config."""
        # Initialize API on first property access to emit signal
        if not self._api_initialized:
            self._ensure_api_initialized()
        author = get_user_name()
        return author if author else ""

    @pyqtProperty(bool, notify=apiAvailabilityChanged)
    def apiAvailable(self):
        """Return whether Forester API is available."""
        return self._api_available

    @pyqtProperty(bool, notify=compareChanged)
    def compareActive(self):
        """Return whether compare temp dirs exist."""
        return self._compare_active

    def _set_api_available(self, available: bool):
        if available != self._api_available:
            self._api_available = available
            self.apiAvailabilityChanged.emit(available)

    def _set_compare_active(self, active: bool):
        if active != self._compare_active:
            self._compare_active = active
            self.compareChanged.emit()
    
    def _ensure_api_initialized(self):
        """Lazy initialization of API - only when needed."""
        if self._api_initialized:
            return
        
        try:
            # Initialize status timer lazily
            if self._status_timer is None:
                self._status_timer = QTimer(self)
                self._status_timer.timeout.connect(self._refresh_status)
            
            # Load API lazily
            self._api_wrapper = get_api()
            self._api = self._api_wrapper.api if self._api_wrapper else None
            if self._api:
                self._api_available = True
            else:
                self._api_available = False
                self._last_error = "Forester API not available."
            
            self._api_initialized = True
            
            # Emit signals to notify QML about initial values (only once)
            try:
                self.apiAvailabilityChanged.emit(self._api_available)
                if self._last_error:
                    self.errorChanged.emit(self._last_error)
                self.defaultAuthorChanged.emit()
            except Exception:
                # Ignore errors if Qt is not ready yet
                pass
        except Exception as e:
            # Silently ignore errors during initialization
            log.warning("Error initializing API: %s", e)
            self._api_available = False
            self._api_initialized = True
            self._last_error = f"API initialization failed: {e}"

    @pyqtProperty(bool, notify=statusChanged)
    def isRepository(self):
        """Return whether current path is a repository."""
        return self._is_repository
    
    @pyqtSlot(str)
    def setRepository(self, repo_path: str):
        """Set the current repository path."""
        if repo_path != self._current_repository:
            self._current_repository = repo_path
            _images_module.clear_image_cache()
            self.repositoryChanged.emit(repo_path)
            self._refresh_status()

    @pyqtSlot(str)
    def initRepository(self, repo_path: str = ""):
        """Initialize a Forester repository."""
        path = repo_path or self._current_repository
        if not path or not self._api_wrapper:
            self._set_error("Repository path not set or API unavailable.")
            return
        try:
            ok, error = self._api_wrapper.init(Path(path))
            if not ok:
                self._set_error(error or "Failed to initialize repository.")
            else:
                self._clear_error()
                self._refresh_status()
        except Exception as e:
            self._set_error(f"Init failed: {e}")
    
    @pyqtSlot()
    def _refresh_status(self):
        """Refresh repository status."""
        self._ensure_api_initialized()
        if self._current_repository and self._api:
            status = self.getStatus()
            self._last_status = status
            self._is_repository = bool(status)
            self.statusChanged.emit()

    @pyqtSlot()
    def refreshStatus(self):
        """Public wrapper for status refresh."""
        self._refresh_status()

    def _set_error(self, message: str):
        if message != self._last_error:
            self._last_error = message
            self.errorChanged.emit(message)

    def _clear_error(self):
        self._set_error("")
    
    @pyqtSlot(result='QVariant')
    def getStatus(self):
        """Get repository status."""
        self._ensure_api_initialized()
        if not self._current_repository or not self._api_wrapper:
            return None
        
        try:
            ok, status, error = self._api_wrapper.status(Path(self._current_repository))
            if ok and status:
                return status
            if error:
                self._set_error(error)
        except Exception as e:
            self._set_error(f"Status error: {e}")
        
        return None
    
    @pyqtSlot(int, str, result='QVariant')
    def getLog(self, max_count: int = 0, branch: Optional[str] = None):
        """Get commit log."""
        if not self._current_repository or not self._api_wrapper:
            return []
        
        try:
            ok, commits, error = self._api_wrapper.get_log(
                Path(self._current_repository),
                branch=branch,
                limit=max_count,
            )
            if ok:
                return commits
            if error:
                self._set_error(error)
        except Exception as e:
            log.warning("Error getting log: %s", e)
        
        return []
    
    @pyqtSlot(result='QVariant')
    def getBranches(self):
        """Get list of branches."""
        if not self._current_repository or not self._api_wrapper:
            return []
        
        try:
            ok, branches, error = self._api_wrapper.get_branches(Path(self._current_repository))
            if ok:
                return branches
            if error:
                self._set_error(error)
        except Exception as e:
            log.warning("Error getting branches: %s", e)
        
        return []

    @pyqtSlot(result='QVariant')
    def getLocks(self):
        """Get list of locks for current branch."""
        if not self._current_repository or not self._api_wrapper:
            return []
        try:
            ok, locks, error = self._api_wrapper.list_locks(Path(self._current_repository))
            if ok:
                return locks
            if error:
                self._set_error(error)
        except Exception as e:
            self._set_error(f"Locks error: {e}")
        return []

    @pyqtSlot(result='QVariant')
    def getDeletedFiles(self):
        """Get deleted files list using Forester."""
        if not self._current_repository or not self._api_wrapper:
            return {"staged_deleted_files": [], "unstaged_deleted_files": []}
        try:
            ok, deleted, error = self._api_wrapper.get_deleted_files(Path(self._current_repository))
            if ok and deleted is not None:
                return deleted
            if error:
                self._set_error(error)
        except Exception as e:
            self._set_error(f"Deleted files error: {e}")
        return {"staged_deleted_files": [], "unstaged_deleted_files": []}
    
    @pyqtSlot('QVariantList', result=bool)
    def addFiles(self, file_paths: List[str]) -> bool:
        """Add files to staging area."""
        if not self._current_repository or not self._api_wrapper:
            self._set_error("Repository path not set or API unavailable.")
            return False
        if not file_paths:
            self._set_error("No files specified.")
            return False
        try:
            # Convert to relative paths if needed
            repo_path = Path(self._current_repository)
            normalized_paths = []
            for file_path in file_paths:
                path_str = str(file_path)
                # Normalize path separators (use forward slashes)
                path_str = path_str.replace("\\", "/")
                
                # If absolute path, make it relative to repo root
                path_obj = Path(path_str)
                if path_obj.is_absolute():
                    try:
                        # Try to get relative path (works even if file doesn't exist on disk)
                        rel_path = path_obj.relative_to(repo_path)
                        # Convert to forward slashes for consistency
                        normalized_paths.append(str(rel_path).replace("\\", "/"))
                    except ValueError:
                        # Path is outside repo, try to extract relative part if it contains repo path
                        repo_str = str(repo_path).replace("\\", "/")
                        if path_str.startswith(repo_str + "/"):
                            rel_part = path_str[len(repo_str) + 1:]
                            normalized_paths.append(rel_part)
                        else:
                            # Path is outside repo, use as-is but normalize separators
                            normalized_paths.append(path_str)
                else:
                    # Already relative, just normalize separators
                    normalized_paths.append(path_str)
            
            ok, error = self._api_wrapper.add(Path(self._current_repository), normalized_paths)
            if ok:
                self._clear_error()
                self._refresh_status()
                return True
            if error:
                self._set_error(error)
        except Exception as e:
            self._set_error(f"Add files failed: {e}")
        return False

    @pyqtSlot(str, str, str, result=bool)
    def createCommit(self, message: str, author: str = "", tag: str = "") -> bool:
        """Create a commit with optional author and tag."""
        if not self._current_repository or not self._api_wrapper:
            self._set_error("Repository path not set or API unavailable.")
            return False
        if not message or not message.strip():
            self._set_error("Commit message is required.")
            return False
        try:
            ok, _, error = self._api_wrapper.create_commit(
                Path(self._current_repository),
                message.strip(),
                author.strip() if author else None,
                tag.strip() if tag else None,
            )
            if ok:
                self._clear_error()
                self._refresh_status()
                return True
            if error:
                self._set_error(error)
        except Exception as e:
            self._set_error(f"Commit failed: {e}")
        return False

    @pyqtSlot(str, result=bool)
    def createBranch(self, branch_name: str) -> bool:
        """Create a new branch."""
        if not self._current_repository or not self._api_wrapper:
            self._set_error("Repository path not set or API unavailable.")
            return False
        if not branch_name or not branch_name.strip():
            self._set_error("Branch name is required.")
            return False
        try:
            ok, error = self._api_wrapper.create_branch(
                Path(self._current_repository),
                branch_name.strip(),
            )
            if ok:
                self._clear_error()
                self._refresh_status()
                return True
            if error:
                self._set_error(error)
        except Exception as e:
            self._set_error(f"Branch creation failed: {e}")
        return False

    @pyqtSlot(str, str, result=bool)
    def createBranchFromCommit(self, branch_name: str, commit_hash: str) -> bool:
        """Create a new branch starting at the given commit."""
        if not self._current_repository or not self._api_wrapper:
            self._set_error("Repository path not set or API unavailable.")
            return False
        if not branch_name or not branch_name.strip():
            self._set_error("Branch name is required.")
            return False
        if not commit_hash or not commit_hash.strip():
            self._set_error("Commit hash is required.")
            return False
        try:
            ok, error = self._api_wrapper.create_branch(
                Path(self._current_repository),
                branch_name.strip(),
                commit_hash.strip(),
            )
            if ok:
                self._clear_error()
                self._refresh_status()
                return True
            if error:
                self._set_error(error)
        except Exception as e:
            self._set_error(f"Branch creation failed: {e}")
        return False

    @pyqtSlot(str, result=bool)
    def checkoutToCommit(self, commit_hash: str) -> bool:
        """Switch working directory to the given commit (detached HEAD)."""
        if not self._current_repository or not self._api_wrapper:
            self._set_error("Repository path not set or API unavailable.")
            return False
        if not commit_hash or not commit_hash.strip():
            self._set_error("Commit hash is required.")
            return False
        self._clear_error()
        try:
            ok, error = self._api_wrapper.switch_branch(
                Path(self._current_repository),
                commit_hash.strip(),
                False,
            )
            if ok:
                self._clear_error()
                self._refresh_status()
                return True
            if error:
                self._set_error(error)
        except Exception as e:
            self._set_error(f"Checkout failed: {e}")
        return False

    @pyqtSlot(str, result=bool)
    def revertCommit(self, commit_hash: str) -> bool:
        """Revert a commit by creating a new revert commit."""
        if not self._current_repository or not self._api_wrapper:
            self._set_error("Repository path not set or API unavailable.")
            return False
        if not commit_hash or not commit_hash.strip():
            self._set_error("Commit hash is required.")
            return False
        self._clear_error()
        try:
            ok, error = self._api_wrapper.revert_commit(
                Path(self._current_repository),
                commit_hash.strip(),
            )
            if ok:
                self._clear_error()
                self._refresh_status()
                return True
            if error:
                self._set_error(error)
        except Exception as e:
            self._set_error(f"Revert failed: {e}")
        return False

    @pyqtSlot(result=bool)
    def clearStashStates(self) -> bool:
        """Clear all stash entries via forester CLI."""
        self._clear_error()
        if not self._current_repository:
            self._set_error("Repository path not set.")
            return False
        forester_bin = get_forester_binary_path()
        if not forester_bin:
            self._set_error("Forester binary not found. Set path in ~/.dfm/setup.cfg [forester].")
            return False
        repo = Path(self._current_repository)
        if not repo.is_dir():
            self._set_error("Repository path is not a directory.")
            return False
        try:
            cmd = [forester_bin, "stash", "clear"]
            proc = subprocess.run(
                cmd,
                cwd=str(repo),
                capture_output=True,
                timeout=120,
                text=True,
            )
            if proc.returncode != 0:
                err = (proc.stderr or proc.stdout or "").strip() or f"forester stash clear exited with {proc.returncode}"
                self._set_error(err)
                return False
            self._clear_error()
            self._refresh_status()
            return True
        except subprocess.TimeoutExpired:
            self._set_error("Forester stash clear timed out.")
            return False
        except Exception as e:
            self._set_error(f"Stash clear failed: {e}")
            return False

    @pyqtSlot(result=bool)
    def deleteCurrentBranch(self) -> bool:
        """Delete the current branch."""
        if not self._current_repository or not self._api_wrapper:
            self._set_error("Repository path not set or API unavailable.")
            return False
        try:
            status = self.getStatus()
            if not status or not isinstance(status, dict):
                self._set_error("Repository status not available.")
                return False
            branch_name = status.get("current_branch", "")
            if not branch_name:
                self._set_error("Current branch not found.")
                return False
            if branch_name in ("main", "master"):
                self._set_error("Cannot delete the main branch.")
                return False

            # Pick a target branch to switch to before deletion
            target_branch = ""
            branches = self.getBranches()
            if branches:
                for candidate in ("main", "master"):
                    if candidate != branch_name and any(b.get("name") == candidate for b in branches):
                        target_branch = candidate
                        break
                if not target_branch:
                    for b in branches:
                        name = b.get("name", "")
                        if name and name != branch_name:
                            target_branch = name
                            break
            if not target_branch:
                self._set_error("No other branch available to switch to.")
                return False

            ok, error = self._api_wrapper.switch_branch(
                Path(self._current_repository),
                target_branch,
            )
            if not ok:
                self._set_error(error or "Failed to switch branch.")
                return False

            ok, error = self._api_wrapper.delete_branch(
                Path(self._current_repository),
                branch_name,
            )
            if ok:
                self._clear_error()
                self._refresh_status()
                return True
            if error:
                self._set_error(error)
        except Exception as e:
            self._set_error(f"Branch delete failed: {e}")
        return False

    @pyqtSlot(result=bool)
    def switchToCurrentBranchAutoStash(self) -> bool:
        """Switch to current branch with auto-stash enabled."""
        if not self._current_repository or not self._api_wrapper:
            self._set_error("Repository path not set or API unavailable.")
            return False
        try:
            status = self.getStatus()
            if not status or not isinstance(status, dict):
                self._set_error("Repository status not available.")
                return False
            branch_name = status.get("current_branch", "")
            if not branch_name:
                self._set_error("Current branch not found.")
                return False
            ok, error = self._api_wrapper.switch_branch(
                Path(self._current_repository),
                branch_name,
                True,
            )
            if ok:
                self._clear_error()
                self._refresh_status()
                return True
            if error:
                self._set_error(error)
        except Exception as e:
            self._set_error(f"Branch switch failed: {e}")
        return False

    @pyqtSlot(str, bool, result=bool)
    def switchBranch(self, branch_name: str, auto_stash: bool = False) -> bool:
        """Switch to another branch."""
        if not self._current_repository or not self._api_wrapper:
            self._set_error("Repository path not set or API unavailable.")
            return False
        if not branch_name or not branch_name.strip():
            self._set_error("Branch name is required.")
            return False
        try:
            ok, error = self._api_wrapper.switch_branch(
                Path(self._current_repository),
                branch_name.strip(),
                auto_stash,
            )
            if ok:
                self._clear_error()
                self._refresh_status()
                self.branchChanged.emit(branch_name.strip())
                return True
            if error:
                self._set_error(error)
        except Exception as e:
            self._set_error(f"Branch switch failed: {e}")
        return False

    @pyqtSlot(str, result='QVariant')
    def getCommit(self, commit_hash: str):
        """Get a single commit by hash."""
        if not self._current_repository or not self._api_wrapper:
            return None
        
        try:
            if not self._api:
                return None
            commit = self._api.get_commit(self._current_repository, commit_hash)
            if commit:
                return commit.to_dict() if hasattr(commit, "to_dict") else commit
        except Exception as e:
            log.warning("Error getting commit: %s", e)
        
        return None
    
    def _get_commit_files_impl(self, commit_hash: str, parent_hash: Optional[str] = None):
        """Internal: get changed files. If parent_hash is None, fetches it via get_log (expensive)."""
        if not self._current_repository or not self._api_wrapper:
            return []
        if not commit_hash or not commit_hash.strip():
            return []
        repo = Path(self._current_repository)

        try:
            if parent_hash is None:
                parent_hash = ""
                try:
                    ok, commits, error = self._api_wrapper.get_log(repo, limit=1000)
                    if ok and commits:
                        for commit in commits:
                            if commit.get("hash") == commit_hash:
                                parent_hash = commit.get("parent_hash", "") or ""
                                break
                except Exception:
                    pass

            def load_commit_files(target_hash: str):
                ok, files, error = self._api_wrapper.get_commit_files(
                    Path(self._current_repository),
                    target_hash,
                )
                if ok:
                    return files, None
                ok, files, error = self._api_wrapper.get_objects_by_commit(
                    Path(self._current_repository),
                    target_hash,
                )
                if ok:
                    return files, None
                return [], error

            def _ensure_text(value: Any) -> str:
                if value is None:
                    return ""
                if isinstance(value, bytes):
                    return value.decode("utf-8", errors="replace")
                return str(value)

            def build_file_map(files: List[Dict[str, Any]]):
                file_map: Dict[str, Dict[str, Any]] = {}
                for item in files:
                    if not isinstance(item, dict):
                        continue
                    path = _ensure_text(item.get("path") or item.get("file_path") or "")
                    if not path:
                        continue
                    file_type = _ensure_text(item.get("type") or item.get("object_type") or "")
                    if file_type and file_type != "blob":
                        continue
                    file_hash = _ensure_text(item.get("hash") or item.get("commit_hash") or "")
                    file_map[path] = {
                        "path": path,
                        "hash": file_hash,
                        "type": file_type,
                    }
                return file_map

            commit_files, error = load_commit_files(commit_hash)
            if error:
                self._set_error(error)
                return []

            commit_map = build_file_map(commit_files)
            if not parent_hash:
                result = []
                # Sort safely - ensure all keys are strings
                sorted_items = sorted(commit_map.items(), key=lambda item: str(item[0]) if item[0] is not None else "")
                for path, info in sorted_items:
                    if not isinstance(info, dict):
                        continue
                    result.append({
                        "path": str(path) if path else "",
                        "hash": str(info.get("hash", "")) if info.get("hash") else "",
                        "type": "added",
                    })
                return result

            parent_files, parent_error = load_commit_files(parent_hash)
            if parent_error:
                self._set_error(parent_error)
                result = []
                # Sort safely - ensure all keys are strings
                sorted_items = sorted(commit_map.items(), key=lambda item: str(item[0]) if item[0] is not None else "")
                for path, info in sorted_items:
                    if not isinstance(info, dict):
                        continue
                    result.append({
                        "path": str(path) if path else "",
                        "hash": str(info.get("hash", "")) if info.get("hash") else "",
                        "type": "added",
                    })
                return result

            parent_map = build_file_map(parent_files)
            changed_files: List[Dict[str, Any]] = []

            for path, info in commit_map.items():
                if not isinstance(info, dict):
                    continue
                parent_info = parent_map.get(path)
                if not parent_info:
                    changed_files.append({
                        "path": str(path) if path else "",
                        "hash": str(info.get("hash", "")) if info.get("hash") else "",
                        "type": "added",
                    })
                else:
                    commit_hash_value = info.get("hash", "")
                    parent_hash_value = parent_info.get("hash", "")
                    if commit_hash_value and parent_hash_value and commit_hash_value == parent_hash_value:
                        continue
                    changed_files.append({
                        "path": str(path) if path else "",
                        "hash": str(commit_hash_value) if commit_hash_value else "",
                        "type": "modified",
                    })

            for path, info in parent_map.items():
                if path not in commit_map:
                    if not isinstance(info, dict):
                        continue
                    changed_files.append({
                        "path": str(path) if path else "",
                        "hash": str(info.get("hash", "")) if info.get("hash") else "",
                        "type": "deleted",
                    })

            # Ensure all items have valid path strings for sorting
            def get_sort_key(item):
                if not isinstance(item, dict):
                    return ""
                path = item.get("path")
                if path is None:
                    return ""
                return str(path)

            result = sorted(changed_files, key=get_sort_key)
            return result
        except Exception as e:
            self._set_error(f"Error getting commit files: {e}")
            return []

    @pyqtSlot(str, result='QVariant')
    def getCommitFiles(self, commit_hash: str):
        """Get changed files for a commit (added/modified/deleted). Public slot for QML."""
        return self._get_commit_files_impl(commit_hash, None)

    @pyqtSlot(str, str, bool, result=str)
    def getDiffHtml(self, commit_hash: str, file_path: str, is_dark: bool = True) -> str:
        """
        Get HTML diff for a file in a commit.
        Compares the commit with its parent (like 'git show').
        """
        if not self._current_repository or not self._api_wrapper:
            return ""
        return _diff_module.get_diff_html(
            Path(self._current_repository),
            self._api_wrapper,
            commit_hash,
            file_path,
            is_dark,
            self._set_error,
        )
    
    _BINARY_EXTENSIONS = frozenset(
        (".blend", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".tga", ".exr",
         ".fbx", ".obj", ".glb", ".gltf", ".dae", ".3ds", ".stl", ".ply",
         ".ttf", ".otf", ".woff", ".woff2", ".ico", ".pdf", ".zip", ".tar", ".gz")
    )
    
    @pyqtSlot(str, result='QVariant')
    def getCommitInfo(self, commit_hash: str):
        """
        Get commit information including message, author, hash, and statistics.
        Uses a single get_log call and passes parent_hash to file list to avoid extra API calls.
        Skips binary extensions when computing line stats.
        """
        if not self._current_repository or not self._api_wrapper:
            return None
        if not commit_hash or not commit_hash.strip():
            return None
        repo = Path(self._current_repository)
        
        try:
            ok, commits, error = self._api_wrapper.get_log(repo, limit=1000)
            if not ok or not commits:
                return None
            commit_info = None
            for c in commits:
                if c.get("hash") == commit_hash:
                    commit_info = c
                    break
            if not commit_info:
                return None
            parent_hash = commit_info.get("parent_hash", "") or ""
            
            files = self._get_commit_files_impl(commit_hash, parent_hash)
            if not files:
                files = []
            
            added_lines = 0
            removed_lines = 0
            # Cap files for stats to keep response fast (3D repos often have many assets)
            max_files_for_stats = 150
            for idx, file_info in enumerate(files):
                if idx >= max_files_for_stats:
                    break
                file_path = (file_info.get("path") or "").strip()
                if not file_path:
                    continue
                low = file_path.lower()
                if any(low.endswith(ext) for ext in self._BINARY_EXTENSIONS):
                    continue
                
                ok_new, content_new, _ = self._api_wrapper.get_commit_file_content(
                    repo, commit_hash, file_path
                )
                content_old = None
                if parent_hash:
                    ok_old, content_old, _ = self._api_wrapper.get_commit_file_content(
                        repo, parent_hash, file_path
                    )
                    if not ok_old:
                        content_old = None
                
                new_text = ""
                if content_new is not None:
                    try:
                        new_text = content_new.decode("utf-8", errors="replace")
                    except Exception:
                        pass
                old_text = ""
                if content_old is not None:
                    try:
                        old_text = content_old.decode("utf-8", errors="replace")
                    except Exception:
                        pass
                if not (new_text or old_text):
                    continue
                opcodes = _diff_module.compute_line_opcodes(
                    old_text.splitlines(keepends=True),
                    new_text.splitlines(keepends=True),
                )
                for tag, i1, i2, j1, j2 in opcodes:
                    if tag == "delete":
                        removed_lines += (i2 - i1)
                    elif tag == "insert":
                        added_lines += (j2 - j1)
                    elif tag == "replace":
                        removed_lines += (i2 - i1)
                        added_lines += (j2 - j1)

            return {
                "message": commit_info.get("message", ""),
                "author": commit_info.get("author", ""),
                "hash": commit_info.get("hash", ""),
                "added_lines": added_lines,
                "removed_lines": removed_lines,
            }
        except Exception as e:
            log.warning("Error getting commit info: %s", e)
            return None
    
    @pyqtSlot(str)
    def copyToClipboard(self, text: str):
        """Copy text to clipboard."""
        try:
            clipboard = QApplication.clipboard()
            if clipboard:
                clipboard.setText(text)
        except Exception as e:
            log.warning("Error copying to clipboard: %s", e)

    @pyqtSlot(str, result='QVariant')
    def getWorkingFileMetadata(self, file_path: str):
        """Get metadata for a working directory file."""
        if not self._current_repository or not file_path:
            return None
        try:
            full_path = Path(self._current_repository) / file_path
            if not full_path.exists() or not full_path.is_file():
                return None
            metadata = FileMetadata(str(full_path))
            return metadata.to_dict()
        except Exception:
            return None

    @pyqtSlot(str, str, result=bool)
    def compareCommitFile(self, commit_hash: str, file_path: str) -> bool:
        """Export two commit versions to temp and open for compare.
        Temp dirs are removed in clearCompare and on app exit via atexit."""
        if not self._current_repository or not self._api_wrapper:
            return False
        if not commit_hash or not file_path:
            return False

        self.clearCompare()

        parent_hash = self.getCommitParentHash(commit_hash)
        if not parent_hash:
            # No parent: open file from working directory
            try:
                working_path = Path(self._current_repository) / file_path
                if not working_path.exists():
                    return False
                return QDesktopServices.openUrl(QUrl.fromLocalFile(str(working_path)))
            except Exception:
                return False

        def normalize_rel_path(raw_path: str) -> Path:
            rel = Path(raw_path)
            if rel.is_absolute():
                return Path(rel.name)
            return rel

        def write_temp_file(target_hash: str, label: str) -> Optional[Path]:
            ok, content, error = self._api_wrapper.get_commit_file_content(
                Path(self._current_repository),
                target_hash,
                file_path,
            )
            if not ok or content is None:
                return None

            rel_path = normalize_rel_path(file_path)
            temp_dir = Path(tempfile.mkdtemp(prefix=f"diffmachine_compare_{label}_"))
            target_path = temp_dir / rel_path
            target_path.parent.mkdir(parents=True, exist_ok=True)
            target_path.write_bytes(content)
            self._compare_temp_dirs.append(temp_dir)
            return target_path

        paths_to_open = []
        parent_path = write_temp_file(parent_hash, "parent")
        if parent_path:
            paths_to_open.append(parent_path)
        commit_path = write_temp_file(commit_hash, "commit")
        if commit_path:
            paths_to_open.append(commit_path)

        if not paths_to_open:
            return False

        blender_path = get_blender_path()
        is_blend_file = str(file_path).lower().endswith(".blend")

        def open_path(path: Path):
            if blender_path and is_blend_file:
                try:
                    if sys.platform == "darwin" and blender_path.lower().endswith(".app"):
                        subprocess.Popen(["open", "-n", "-a", blender_path, "--args", str(path)])
                    else:
                        subprocess.Popen([blender_path, str(path)])
                    return
                except Exception:
                    pass
            QDesktopServices.openUrl(QUrl.fromLocalFile(str(path)))

        if len(paths_to_open) == 1:
            open_path(paths_to_open[0])
        else:
            first_path = paths_to_open[0]
            second_path = paths_to_open[1]
            open_path(first_path)
            QTimer.singleShot(400, lambda: open_path(second_path))

        self._set_compare_active(True)
        return True

    @pyqtSlot(result=bool)
    def clearCompare(self) -> bool:
        """Remove compare temp directories. Also removed on app exit via atexit."""
        if not self._compare_temp_dirs:
            self._set_compare_active(False)
            return True

        ok = True
        for temp_dir in self._compare_temp_dirs:
            try:
                shutil.rmtree(temp_dir, ignore_errors=True)
            except Exception:
                ok = False
        self._compare_temp_dirs = []
        self._set_compare_active(False)
        return ok
    
    @pyqtSlot(int)
    def startAutoRefresh(self, interval_ms: int = 5000):
        """Start automatic status refresh."""
        self._ensure_api_initialized()
        if self._status_timer:
            self._status_timer.start(interval_ms)
    
    @pyqtSlot()
    def stopAutoRefresh(self):
        """Stop automatic status refresh."""
        if self._status_timer:
            self._status_timer.stop()
    
    @pyqtSlot(str, str, str, str, str, bool, result=str)
    def getDiffHtmlAdvanced(
        self,
        source1_type: str,
        source1_value: str,
        source2_type: str,
        source2_value: str,
        file_path: str,
        is_dark: bool = True
    ) -> str:
        """
        Get HTML diff for a file comparing two sources (working/commit/branch).
        """
        if not self._current_repository or not self._api_wrapper:
            return ""
        return _diff_module.get_diff_html_advanced(
            Path(self._current_repository),
            self._api_wrapper,
            source1_type,
            source1_value,
            source2_type,
            source2_value,
            file_path,
            is_dark,
            self._set_error,
        )

    @pyqtSlot(str, result=str)
    def getCommitParentHash(self, commit_hash: str) -> str:
        """Get parent hash of a commit from log."""
        if not self._current_repository or not self._api_wrapper:
            return ""
        return _diff_module.get_commit_parent_hash(
            self._api_wrapper, Path(self._current_repository), commit_hash
        )

    @pyqtSlot(str, str, result=str)
    def getImageFromCommit(self, commit_hash: str, file_path: str) -> str:
        """Get file:// URL for an image from a commit. Keeps at most one temp file."""
        if not self._current_repository or not self._api_wrapper:
            return ""
        return _images_module.get_image_from_commit(
            Path(self._current_repository),
            self._api_wrapper,
            commit_hash,
            file_path,
            self._set_error,
        )

    @pyqtSlot(str, result=str)
    def getImageFromWorkingDir(self, file_path: str) -> str:
        """Get file:// URL for an image from the working directory."""
        if not self._current_repository or not file_path:
            return ""
        return _images_module.get_image_from_working_dir(
            Path(self._current_repository), file_path, self._set_error
        )

    @pyqtSlot(str, str, result=str)
    def generateDiffImage(self, image1_url: str, image2_url: str) -> str:
        """Return file:// URL of a generated diff image, or "" on error."""
        return _images_module.generate_diff_image(
            image1_url, image2_url, self._set_error
        )

    @pyqtSlot(str, result=int)
    def getFileSize(self, file_url: str) -> int:
        """Return file size in bytes for a file:// URL, or 0 on error."""
        return _images_module.get_file_size(file_url)

    @pyqtSlot(str, result='QVariant')
    def getMergeFiles(self, branch_name: str):
        """Get list of file paths that will be affected by merging the given branch."""
        if not self._current_repository or not self._api_wrapper:
            return []
        if not branch_name or not branch_name.strip():
            return []
        try:
            status = self.getStatus()
            if not status:
                return []
            current_head = (status.get("head_commit") or "").strip()
            branches = self.getBranches()
            target_commit = ""
            for b in (branches or []):
                if (b.get("name") or "").strip() == branch_name.strip():
                    target_commit = (b.get("commit_hash") or "").strip()
                    break
            if not target_commit:
                return []
            file_set = set()
            for commit_hash in (current_head, target_commit):
                if not commit_hash:
                    continue
                ok, files, _ = self._api_wrapper.get_commit_files(
                    Path(self._current_repository),
                    commit_hash,
                )
                if ok and files:
                    for f in files:
                        path = (f.get("path") or f.get("file_path") or "").strip()
                        if path:
                            file_set.add(path)
            return sorted(list(file_set))
        except Exception as e:
            log.warning("Error getting merge files: %s", e)
            return []

    @pyqtSlot(result='QVariant')
    def getToMergeObjects(self):
        """Get list of objects with MERGE tag from current HEAD."""
        if not self._current_repository or not self._api_wrapper:
            return []
        try:
            status = self.getStatus()
            if not status:
                return []
            head_commit = (status.get("head_commit") or "").strip()
            if not head_commit:
                return []
            ok, objects, _ = self._api_wrapper.get_objects_raw_by_commit(
                Path(self._current_repository),
                head_commit,
            )
            if not ok or not objects:
                return []
            merge_objects = []
            for obj in objects:
                tags = obj.get("tags") or []
                if isinstance(tags, list) and "MERGE" in tags:
                    merge_objects.append({
                        "file_path": obj.get("file_path") or "",
                        "object_name": obj.get("object_name") or "",
                        "object_type": obj.get("object_type") or "",
                        "editor_type": obj.get("editor_type") or "",
                    })
            return merge_objects
        except Exception as e:
            log.warning("Error getting to_merge objects: %s", e)
            return []

    @pyqtSlot(str, str, result='QVariant')
    def getObjectsByFile(self, commit_hash: str, file_path: str):
        """Get all objects for a file in a commit."""
        if not self._current_repository or not self._api_wrapper:
            return []
        if not commit_hash or not file_path:
            return []
        try:
            ok, objects, _ = self._api_wrapper.get_objects_by_file(
                Path(self._current_repository),
                file_path.strip(),
                commit_hash.strip(),
            )
            return list(objects) if ok and objects else []
        except Exception as e:
            log.warning("Error getting objects by file: %s", e)
            return []

    @pyqtSlot(str, str, result='QVariant')
    def getMergeObjectsForFile(self, file_path: str, branch_name: str):
        """Get all objects for a file from both HEAD and the given branch (for merge UI)."""
        if not self._current_repository or not self._api_wrapper:
            return []
        if not file_path or not branch_name:
            return []
        try:
            status = self.getStatus()
            if not status:
                return []
            head_commit = (status.get("head_commit") or "").strip()
            branches = self.getBranches()
            target_commit = ""
            for b in (branches or []):
                if (b.get("name") or "").strip() == branch_name.strip():
                    target_commit = (b.get("commit_hash") or "").strip()
                    break
            result = []
            fp = file_path.strip()
            if head_commit:
                ok, objs, _ = self._api_wrapper.get_objects_by_file(
                    Path(self._current_repository), fp, head_commit,
                )
                if ok and objs:
                    for o in objs:
                        d = dict(o) if isinstance(o, dict) else {}
                        d["source"] = "ours"
                        result.append(d)
            if target_commit and target_commit != head_commit:
                ok, objs, _ = self._api_wrapper.get_objects_by_file(
                    Path(self._current_repository), fp, target_commit,
                )
                if ok and objs:
                    for o in objs:
                        d = dict(o) if isinstance(o, dict) else {}
                        d["source"] = "theirs"
                        result.append(d)
            return result
        except Exception as e:
            log.warning("Error getting merge objects for file: %s", e)
            return []

    @pyqtSlot(str, str, str, bool, result=bool)
    def setObjectMergeTag(self, commit_hash: str, file_path: str, object_name: str, add: bool) -> bool:
        """Add or remove MERGE tag on an object. Only for objects in current HEAD (ours)."""
        if not self._current_repository or not self._api_wrapper:
            return False
        if not commit_hash or not file_path or not object_name:
            return False
        try:
            repo = Path(self._current_repository)
            if add:
                ok, err = self._api_wrapper.add_tag_to_object(
                    repo, commit_hash.strip(), file_path.strip(), object_name.strip(), "MERGE",
                )
            else:
                ok, err = self._api_wrapper.remove_tag_from_object(
                    repo, commit_hash.strip(), file_path.strip(), object_name.strip(), "MERGE",
                )
            if not ok and err:
                self._set_error(err)
            return bool(ok)
        except Exception as e:
            self._set_error(str(e))
            return False

    @pyqtSlot(str, str, result=bool)
    def performMerge(self, branch_name: str, message: str = "") -> bool:
        """Run forester merge for the given branch. Returns True on success."""
        self._clear_error()
        if not self._current_repository:
            self._set_error("Repository not set.")
            return False
        if not branch_name or not branch_name.strip():
            self._set_error("Branch name is required.")
            return False
        forester_bin = get_forester_binary_path()
        if not forester_bin:
            self._set_error("Forester binary not found. Set path in ~/.dfm/setup.cfg [forester].")
            return False
        repo = Path(self._current_repository)
        if not repo.is_dir():
            self._set_error("Repository path is not a directory.")
            return False
        try:
            status = self.getStatus()
            head_commit = (status.get("head_commit") or "").strip() if status else ""
            branches = self.getBranches()
            target_commit = ""
            for b in (branches or []):
                if (b.get("name") or "").strip() == branch_name.strip():
                    target_commit = (b.get("commit_hash") or "").strip()
                    break

            tagged_blend_files = set()
            if head_commit:
                ok, objects, _ = self._api_wrapper.get_objects_raw_by_commit(
                    Path(self._current_repository),
                    head_commit,
                )
                if ok and objects:
                    for obj in objects:
                        tags = obj.get("tags") or []
                        if not tags:
                            continue
                        file_path = (obj.get("file_path") or "").strip()
                        if file_path and file_path.lower().endswith(".blend"):
                            tagged_blend_files.add(file_path)

            if tagged_blend_files:
                cmd = [forester_bin, "merge", branch_name.strip(), "--no-commit"]
            else:
                cmd = [forester_bin, "merge", branch_name.strip()]

            proc = subprocess.run(
                cmd,
                cwd=str(repo),
                capture_output=True,
                timeout=300,
                text=True,
            )
            if proc.returncode != 0:
                err = (proc.stderr or proc.stdout or "").strip() or f"forester merge exited with {proc.returncode}"
                self._set_error(err)
                return False

            if tagged_blend_files:
                blender_exe = get_blender_executable()
                script_path = get_merge_apply_script_path()
                if not blender_exe:
                    self._set_error("Blender not found. Set [blender] path in ~/.dfm/setup.cfg.")
                    return False
                if not script_path:
                    self._set_error("merge_apply_background.py not found. Set [blender] merge_apply_script.")
                    return False
                for path in sorted(tagged_blend_files):
                    ours = repo / path
                    if not ours.exists():
                        self._set_error(f"Ours blend missing: {path}")
                        return False

                    theirs_path = None
                    if target_commit:
                        ok, content, err = self._api_wrapper.get_commit_file_content(
                            Path(self._current_repository),
                            target_commit,
                            path,
                        )
                        if ok and content is not None:
                            try:
                                fd_theirs = tempfile.NamedTemporaryFile(
                                    mode="wb",
                                    suffix=".blend",
                                    delete=False,
                                )
                                fd_theirs.write(content)
                                fd_theirs.close()
                                theirs_path = fd_theirs.name
                            except Exception as e:
                                self._set_error(f"Failed to create theirs .blend: {e}")
                                return False

                    if not theirs_path:
                        theirs = repo / ".DFM" / "merge_theirs" / path
                        if not theirs.exists():
                            self._set_error(f"Theirs blend missing for {path}")
                            return False
                        theirs_path = str(theirs)

                    objs = self.getMergeObjectsForFile(path, branch_name.strip())
                    objects_list = []
                    for o in objs or []:
                        d = dict(o) if isinstance(o, dict) else {}
                        objects_list.append({
                            "object_name": (d.get("object_name") or "").strip(),
                            "object_type": (d.get("object_type") or "MESH").strip(),
                            "file_path": (d.get("file_path") or path).strip(),
                            "tags": d.get("tags") if isinstance(d.get("tags"), list) else [],
                            "metadata": d.get("metadata") if isinstance(d.get("metadata"), dict) else {},
                        })
                    try:
                        fd = tempfile.NamedTemporaryFile(
                            mode="w",
                            suffix=".json",
                            delete=False,
                            encoding="utf-8",
                        )
                        json.dump(objects_list, fd, ensure_ascii=False)
                        fd.close()
                        tmp_path = fd.name
                    except Exception as e:
                        self._set_error(f"Failed to create objects JSON: {e}")
                        return False

                    try:
                        cmd = [
                            blender_exe,
                            "--background",
                            str(ours),
                            "--python",
                            script_path,
                            "--",
                            "--objects_json",
                            tmp_path,
                            "--theirs_blend",
                            str(theirs_path),
                            "--repo_path",
                            str(repo),
                        ]
                        proc = subprocess.run(
                            cmd,
                            cwd=str(repo),
                            capture_output=True,
                            timeout=300,
                            text=True,
                        )
                        if proc.returncode != 0:
                            err = (proc.stderr or proc.stdout or "").strip() or f"exit {proc.returncode}"
                            self._set_error(f"merge_apply_background failed for {path}: {err}")
                            return False
                    except subprocess.TimeoutExpired:
                        self._set_error(f"merge_apply_background timed out for {path}.")
                        return False
                    except Exception as e:
                        self._set_error(f"merge_apply_background error for {path}: {e}")
                        return False
                    finally:
                        try:
                            os.unlink(tmp_path)
                        except Exception:
                            pass
                        if theirs_path and theirs_path.startswith("/tmp/"):
                            try:
                                os.unlink(theirs_path)
                            except Exception:
                                pass

                    if not self.addFiles([path]):
                        return False

                if not self.mergeContinue():
                    return False

            self._clear_error()
            self._refresh_status()
            return True
        except subprocess.TimeoutExpired:
            self._set_error("Forester merge timed out.")
            return False
        except Exception as e:
            self._set_error(f"Merge failed: {e}")
            return False

    @pyqtSlot(result='QVariant')
    def getMergeConflicts(self):
        """Return list of conflicted paths from .DFM/MERGE_HEAD, or [] if no merge in progress."""
        return _merge_module.get_merge_conflicts(Path(self._current_repository)) if self._current_repository else []

    @pyqtSlot(result='QVariant')
    def getMergeState(self):
        """Return MERGE_HEAD state: branch, conflicts (paths), current_head, target_head, or {}."""
        return _merge_module.get_merge_state(Path(self._current_repository)) if self._current_repository else {}

    @pyqtSlot(result=bool)
    def mergeContinue(self) -> bool:
        """Run 'forester merge --continue'. Returns True on success."""
        self._clear_error()
        repo = Path(self._current_repository) if self._current_repository else None
        ok = _merge_module.merge_continue(repo, self._set_error)
        if ok:
            self._clear_error()
            self._refresh_status()
        return ok

    @pyqtSlot(str, result=bool)
    def openBlendForResolve(self, file_path: str) -> bool:
        """Open .blend (ours) and optionally .theirs in Blender for conflict resolve."""
        repo = Path(self._current_repository) if self._current_repository else None
        return _merge_module.open_blend_for_resolve(repo, file_path or "", self._set_error)

    @pyqtSlot(result=bool)
    def resolveBlendConflictsAutomatically(self) -> bool:
        """Run merge_apply_background for each .blend conflict, forester add, then merge --continue."""
        self._clear_error()
        if not self._current_repository:
            self._set_error("Repository not set.")
            return False
        state = self.getMergeState()
        if not state:
            self._set_error("No merge in progress.")
            return False
        branch = (state.get("branch") or "").strip()
        conflicts = state.get("conflicts") or []
        blend_paths = [p.strip() for p in conflicts if p and str(p).lower().endswith(".blend")]
        if not blend_paths:
            self._set_error("No .blend conflicts to resolve.")
            return False
        blender_exe = get_blender_executable()
        script_path = get_merge_apply_script_path()
        forester_bin = get_forester_binary_path()
        if not blender_exe:
            self._set_error("Blender not found. Set [blender] path in ~/.dfm/setup.cfg.")
            return False
        if not script_path:
            self._set_error("merge_apply_background.py not found. Set [blender] merge_apply_script.")
            return False
        if not forester_bin:
            self._set_error("Forester binary not found.")
            return False
        repo = Path(self._current_repository)
        for path in blend_paths:
            ours = repo / path
            theirs = repo / ".DFM" / "merge_theirs" / path
            if not ours.exists():
                self._set_error(f"Ours blend missing: {path}")
                return False
            if not theirs.exists():
                self._set_error(f"Theirs blend missing: .DFM/merge_theirs/{path}")
                return False
            objs = self.getMergeObjectsForFile(path, branch)
            objects_list = []
            for o in objs or []:
                d = dict(o) if isinstance(o, dict) else {}
                objects_list.append({
                    "object_name": (d.get("object_name") or "").strip(),
                    "object_type": (d.get("object_type") or "MESH").strip(),
                    "file_path": (d.get("file_path") or path).strip(),
                    "tags": d.get("tags") if isinstance(d.get("tags"), list) else [],
                    "metadata": d.get("metadata") if isinstance(d.get("metadata"), dict) else {},
                })
            try:
                fd = tempfile.NamedTemporaryFile(
                    mode="w",
                    suffix=".json",
                    delete=False,
                    encoding="utf-8",
                )
                json.dump(objects_list, fd, ensure_ascii=False)
                fd.close()
                tmp_path = fd.name
            except Exception as e:
                self._set_error(f"Failed to create objects JSON: {e}")
                return False
            try:
                cmd = [
                    blender_exe,
                    "--background",
                    str(ours),
                    "--python",
                    script_path,
                    "--",
                    "--objects_json",
                    tmp_path,
                    "--theirs_blend",
                    str(theirs),
                    "--repo_path",
                    str(repo),
                ]
                proc = subprocess.run(
                    cmd,
                    cwd=str(repo),
                    capture_output=True,
                    timeout=300,
                    text=True,
                )
                if proc.returncode != 0:
                    err = (proc.stderr or proc.stdout or "").strip() or f"exit {proc.returncode}"
                    self._set_error(f"merge_apply_background failed for {path}: {err}")
                    return False
            except subprocess.TimeoutExpired:
                self._set_error(f"merge_apply_background timed out for {path}.")
                return False
            except Exception as e:
                self._set_error(f"merge_apply_background error for {path}: {e}")
                return False
            finally:
                try:
                    os.unlink(tmp_path)
                except Exception:
                    pass
            if not self.addFiles([path]):
                return False
        return self.mergeContinue()