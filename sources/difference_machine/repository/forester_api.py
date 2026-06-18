"""
Forester API wrapper for Diffmachine GUI.
API загружается только из одной папки: difference_machine/api/ (библиотека и api/python/ с биндингами).
"""

import logging
import sys
from pathlib import Path
from typing import Optional, Tuple, List, Dict, Any

from .config_loader import get_api_library_path, get_python_bindings_path

log = logging.getLogger("difference_machine")

# Единственное место API при установке: рядом с исполняемым файлом, папка api/
def _get_api_dir_for_log() -> Path:
    """Только для логов: каталог, откуда ожидаем API."""
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent / "api"
    return Path(__file__).resolve().parent.parent / "api"


# Импорт Forester API: биндинги только из get_python_bindings_path()
try:
    bindings_path = get_python_bindings_path()
    if bindings_path and bindings_path not in sys.path:
        sys.path.insert(0, bindings_path)
    # В frozen-сборке fallback по __file__ ведёт в бандл (forester/api там нет) — не используем
    if not getattr(sys, "frozen", False):
        current_file = Path(__file__).resolve()
        project_root = current_file.parent.parent.parent
        forester_api_path = project_root / "forester" / "api"
        if forester_api_path.exists() and str(forester_api_path) not in sys.path:
            sys.path.insert(0, str(forester_api_path))
    from python_bindings_structured import ForesterAPI
    _API_AVAILABLE = True
except Exception as e:
    log.warning(
        "Forester API: не удалось загрузить биндинги. Ожидаемая папка: %s (bindings: api/python/python_bindings_structured.py). Ошибка: %s",
        _get_api_dir_for_log(), e, exc_info=True
    )
    _API_AVAILABLE = False
    ForesterAPI = None


class ForesterAPIWrapper:
    """Wrapper for Forester API without fallbacks."""

    def __init__(self):
        self._api_instance: Optional[ForesterAPI] = None
        self._use_api = _API_AVAILABLE

        if self._use_api:
            try:
                api_lib_path = get_api_library_path()
                if api_lib_path:
                    self._api_instance = ForesterAPI(api_lib_path)
                else:
                    self._api_instance = ForesterAPI()
            except Exception as e:
                log.warning(
                    "Forester API: не удалось инициализировать библиотеку. Папка api: %s (нужны libforester.so/.dylib/forester.dll). Ошибка: %s",
                    _get_api_dir_for_log(), e, exc_info=True
                )
                self._use_api = False
                self._api_instance = None

    @property
    def api(self) -> Optional[ForesterAPI]:
        """Get API instance if available."""
        return self._api_instance if self._use_api else None

    def init(self, repo_path: Path) -> Tuple[bool, Optional[str]]:
        if self._use_api and self._api_instance:
            try:
                result = self._api_instance.init(str(repo_path))
                if result.get("success"):
                    return True, None
                return False, result.get("error", "Unknown error")
            except Exception as e:
                return False, str(e)
        return False, "Forester API not available"

    def status(self, repo_path: Path) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """Get repository status (structured)."""
        if self._use_api and self._api_instance:
            try:
                status = self._api_instance.get_status(str(repo_path))
                if status:
                    return True, status.to_dict(), None
                return False, None, "Failed to get status"
            except Exception as e:
                return False, None, str(e)
        return False, None, "Forester API not available"

    def get_branches(self, repo_path: Path) -> Tuple[bool, List[Dict[str, Any]], Optional[str]]:
        if self._use_api and self._api_instance:
            try:
                branches = self._api_instance.get_branches(str(repo_path))
                if branches is None:
                    return False, [], "Failed to get branches"
                branch_list = []
                for branch in branches:
                    branch_list.append({
                        "name": branch.name,
                        "is_current": branch.is_current,
                        "commit_hash": branch.commit_hash,
                    })
                return True, branch_list, None
            except Exception as e:
                return False, [], str(e)
        return False, [], "Forester API not available"

    def get_log(self, repo_path: Path, branch: Optional[str] = None, limit: int = 100) -> Tuple[bool, List[Dict[str, Any]], Optional[str]]:
        if self._use_api and self._api_instance:
            try:
                commits = self._api_instance.get_log(
                    str(repo_path),
                    max_count=limit if limit > 0 else 0,
                    branch=branch,
                )
                if commits is None:
                    return False, [], "Failed to get log"
                commit_list = []
                for commit in commits:
                    commit_list.append({
                        "hash": getattr(commit, "hash", ""),
                        "message": getattr(commit, "message", ""),
                        "author": getattr(commit, "author", ""),
                        "timestamp": getattr(commit, "timestamp", 0),
                        "parent_hash": getattr(commit, "parent_hash", ""),
                    })
                return True, commit_list, None
            except Exception as e:
                return False, [], str(e)
        return False, [], "Forester API not available"

    def get_commit(self, repo_path: Path, commit_hash: str) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """Get a single commit by hash. Returns (ok, commit_dict, error)."""
        if self._use_api and self._api_instance and hasattr(self._api_instance, "get_commit"):
            try:
                commit = self._api_instance.get_commit(str(repo_path), commit_hash)
                if commit:
                    data = commit.to_dict() if hasattr(commit, "to_dict") else commit
                    return True, data, None
                return False, None, "Commit not found"
            except Exception as e:
                return False, None, str(e)
        return False, None, "Forester API not available"

    def get_deleted_files(self, repo_path: Path) -> Tuple[bool, Dict[str, List[str]], Optional[str]]:
        """Get deleted files using the structured API."""
        if self._use_api and self._api_instance:
            try:
                status = self._api_instance.get_status(str(repo_path))
                if status:
                    status_dict = status.to_dict()
                    return True, {
                        "staged_deleted_files": status_dict.get("staged_deleted_files", []) or [],
                        "unstaged_deleted_files": status_dict.get("unstaged_deleted_files", []) or [],
                    }, None
            except Exception as e:
                return False, {"staged_deleted_files": [], "unstaged_deleted_files": []}, str(e)
        return False, {"staged_deleted_files": [], "unstaged_deleted_files": []}, "Forester API not available"

    def add(self, repo_path: Path, files: Optional[List[str]] = None) -> Tuple[bool, Optional[str]]:
        """Add files to staging area."""
        if self._use_api and self._api_instance:
            try:
                if files is None:
                    files = ["."]
                result = self._api_instance.add(str(repo_path), files)
                if result and result.get("success"):
                    return True, None
                return False, result.get("error", "Failed to add files")
            except Exception as e:
                return False, str(e)
        return False, "Forester API not available"

    def create_commit(
        self,
        repo_path: Path,
        message: str,
        author: Optional[str] = None,
        tag: Optional[str] = None,
    ) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """Create a commit. If tag is provided, create it after the commit."""
        if self._use_api and self._api_instance:
            try:
                result = self._api_instance.commit(
                    str(repo_path),
                    message,
                    author if author else None,
                )
                if result and result.get("success"):
                    # Get commit hash from status (head_commit)
                    commit_hash = None
                    if tag and tag.strip():
                        status = self._api_instance.get_status(str(repo_path))
                        if status:
                            status_dict = status.to_dict()
                            commit_hash = status_dict.get("head_commit", "")
                        
                        # Create tag if provided
                        if commit_hash:
                            tag_result = self.create_tag(repo_path, tag.strip(), commit_hash, author)
                            if not tag_result[0]:
                                # Tag creation failed, but commit succeeded
                                # Return success with warning
                                return True, result, f"Commit created but tag failed: {tag_result[1]}"
                        else:
                            return True, result, "Commit created but could not get commit hash for tag"
                    return True, result, None
                return False, None, (result.get("error") if result else "Commit failed")
            except Exception as e:
                return False, None, str(e)
        return False, None, "Forester API not available"

    def create_tag(
        self,
        repo_path: Path,
        tag_name: str,
        commit_hash: Optional[str] = None,
        author: Optional[str] = None,
    ) -> Tuple[bool, Optional[str]]:
        """Create a tag for a commit using the structured API."""
        return False, "Tag creation is not available in the structured API"

    def get_objects_by_commit(
        self,
        repo_path: Path,
        commit_hash: str,
    ) -> Tuple[bool, List[Dict[str, Any]], Optional[str]]:
        """Get all objects (files) for a commit."""
        if self._use_api and self._api_instance:
            try:
                objects = self._api_instance.get_objects_by_commit(
                    str(repo_path),
                    commit_hash,
                )
                if objects is None:
                    return False, [], "Failed to get objects"
                # Convert objects to list of dicts with file paths
                # Use a set to track unique file paths
                seen_paths = set()
                file_list = []
                for obj in objects:
                    # obj is already a dict from to_dict() method
                    if isinstance(obj, dict):
                        # ForesterObject has file_path, not path
                        file_path = obj.get("file_path", obj.get("path", ""))
                    else:
                        # If it's an object with attributes
                        file_path = getattr(obj, "file_path", getattr(obj, "path", ""))
                    
                    # Only add unique file paths
                    if file_path and file_path not in seen_paths:
                        seen_paths.add(file_path)
                        file_list.append({
                            "path": file_path,
                            "hash": obj.get("commit_hash", obj.get("hash", "")) if isinstance(obj, dict) else getattr(obj, "commit_hash", getattr(obj, "hash", "")),
                            "type": obj.get("object_type", obj.get("type", "")) if isinstance(obj, dict) else getattr(obj, "object_type", getattr(obj, "type", "")),
                        })
                return True, file_list, None
            except Exception as e:
                return False, [], str(e)
        return False, [], "Forester API not available"

    def get_objects_by_file(
        self,
        repo_path: Path,
        file_path: str,
        commit_hash: str,
    ) -> Tuple[bool, List[Dict[str, Any]], Optional[str]]:
        """Get all objects for a file in a commit (full dicts with tags, etc.)."""
        if not self._use_api or not self._api_instance:
            return False, [], "Forester API not available"
        if not hasattr(self._api_instance, "get_objects_by_file"):
            return False, [], "GetObjectsByFile not available"
        try:
            objects = self._api_instance.get_objects_by_file(
                str(repo_path),
                file_path,
                commit_hash,
            )
            if objects is None:
                return False, [], "Failed to get objects"
            return True, list(objects), None
        except Exception as e:
            return False, [], str(e)

    def get_objects_raw_by_commit(
        self,
        repo_path: Path,
        commit_hash: str,
    ) -> Tuple[bool, List[Dict[str, Any]], Optional[str]]:
        """Get all objects for a commit as full dicts (with tags, file_path, object_name, etc.)."""
        if self._use_api and self._api_instance:
            try:
                objects = self._api_instance.get_objects_by_commit(
                    str(repo_path),
                    commit_hash,
                )
                if objects is None:
                    return False, [], "Failed to get objects"
                return True, objects if isinstance(objects, list) else list(objects), None
            except Exception as e:
                return False, [], str(e)
        return False, [], "Forester API not available"
    
    def get_commit_files(
        self,
        repo_path: Path,
        commit_hash: str,
    ) -> Tuple[bool, List[Dict[str, Any]], Optional[str]]:
        """Get all files from commit tree."""
        if self._use_api and self._api_instance:
            try:
                # Try to use the new method if available
                if hasattr(self._api_instance, 'get_commit_files'):
                    files = self._api_instance.get_commit_files(
                        str(repo_path),
                        commit_hash,
                    )
                    if files is None:
                        return False, [], "Failed to get commit files"
                    return True, files, None
                else:
                    # Fallback to objects_by_commit if new method not available
                    return self.get_objects_by_commit(repo_path, commit_hash)
            except Exception as e:
                return False, [], str(e)
        return False, [], "Forester API not available"

    def get_diff(
        self,
        repo_path: Path,
        commit_hash: str,
        file_path: str,
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """Get diff for a file in a commit."""
        if self._use_api and self._api_instance:
            try:
                # Format: <commit>:<file>
                options = f"{commit_hash}:{file_path}"
                result = self._api_instance.diff(str(repo_path), [options])
                if result and result.get("success"):
                    diff_text = result.get("output", "")
                    return True, diff_text, None
                return False, None, result.get("error") if result else "Failed to get diff"
            except Exception as e:
                return False, None, str(e)
        return False, None, "Forester API not available"

    def get_commit_file_content(
        self,
        repo_path: Path,
        commit_hash: str,
        file_path: str,
    ) -> Tuple[bool, Optional[bytes], Optional[str]]:
        """Get file content from a commit using the structured API."""
        if self._use_api and self._api_instance:
            try:
                if hasattr(self._api_instance, "get_commit_file_content"):
                    result = self._api_instance.get_commit_file_content(
                        str(repo_path),
                        commit_hash,
                        file_path,
                    )
                    if result and result.get("success"):
                        return True, result.get("content", b""), None
                    return False, None, result.get("error") if result else "Failed to get file content"
                return False, None, "Forester API does not support file content retrieval"
            except Exception as e:
                return False, None, str(e)
        return False, None, "Forester API not available"

    def list_locks(self, repo_path: Path) -> Tuple[bool, List[Dict[str, Any]], Optional[str]]:
        """List locks for current branch using structured API."""
        if self._use_api and self._api_instance:
            try:
                result = self._api_instance.list_locks(str(repo_path))
                if result and result.get("success"):
                    return True, result.get("locks", []), None
                return False, [], result.get("error", "Failed to list locks")
            except Exception as e:
                return False, [], str(e)
        return False, [], "Forester API not available"

    def create_branch(
        self,
        repo_path: Path,
        branch_name: str,
        commit_hash: Optional[str] = None,
    ) -> Tuple[bool, Optional[str]]:
        """Create a new branch using the structured API. Optionally at commit_hash."""
        if not branch_name or not branch_name.strip():
            return False, "Branch name is required"
        if self._use_api and self._api_instance:
            try:
                result = self._api_instance.create_branch(
                    str(repo_path),
                    branch_name.strip(),
                    commit_hash.strip() if commit_hash and str(commit_hash).strip() else None,
                )
                if result and result.get("success"):
                    return True, None
                return False, result.get("error", "Failed to create branch")
            except Exception as e:
                return False, str(e)
        return False, "Forester API not available"

    def create_branch_cli(self, repo_path: Path, branch_name: str) -> Tuple[bool, Optional[str]]:
        """Create a branch using the API."""
        return self.create_branch(repo_path, branch_name)

    def delete_branch(self, repo_path: Path, branch_name: str) -> Tuple[bool, Optional[str]]:
        """Delete a branch using the structured API."""
        if not branch_name or not branch_name.strip():
            return False, "Branch name is required"
        if self._use_api and self._api_instance:
            try:
                result = self._api_instance.delete_branch(str(repo_path), branch_name.strip())
                if result and result.get("success"):
                    return True, None
                return False, result.get("error", "Failed to delete branch")
            except Exception as e:
                return False, str(e)
        return False, "Forester API not available"

    def rename_branch(self, repo_path: Path, old_name: str, new_name: str) -> Tuple[bool, Optional[str]]:
        """Rename a branch using the structured API."""
        if not old_name or not old_name.strip() or not new_name or not new_name.strip():
            return False, "Old and new branch names are required"
        if self._use_api and self._api_instance:
            try:
                result = self._api_instance.rename_branch(str(repo_path), old_name.strip(), new_name.strip())
                if result and result.get("success"):
                    return True, None
                return False, result.get("error", "Failed to rename branch")
            except Exception as e:
                return False, str(e)
        return False, "Forester API not available"

    def add_tag_to_object(
        self,
        repo_path: Path,
        commit_hash: str,
        file_path: str,
        object_name: str,
        tag: str,
    ) -> Tuple[bool, Optional[str]]:
        """Add a tag to an object."""
        if not self._use_api or not self._api_instance or not hasattr(self._api_instance, "add_tag_to_object"):
            return False, "Forester API not available"
        try:
            result = self._api_instance.add_tag_to_object(
                str(repo_path),
                commit_hash.strip(),
                file_path.strip(),
                object_name.strip(),
                tag.strip(),
            )
            if result and result.get("success"):
                return True, None
            return False, result.get("error", "Failed to add tag") if result else "Failed to add tag"
        except Exception as e:
            return False, str(e)

    def remove_tag_from_object(
        self,
        repo_path: Path,
        commit_hash: str,
        file_path: str,
        object_name: str,
        tag: str,
    ) -> Tuple[bool, Optional[str]]:
        """Remove a tag from an object."""
        if not self._use_api or not self._api_instance or not hasattr(self._api_instance, "remove_tag_from_object"):
            return False, "Forester API not available"
        try:
            result = self._api_instance.remove_tag_from_object(
                str(repo_path),
                commit_hash.strip(),
                file_path.strip(),
                object_name.strip(),
                tag.strip(),
            )
            if result and result.get("success"):
                return True, None
            return False, result.get("error", "Failed to remove tag") if result else "Failed to remove tag"
        except Exception as e:
            return False, str(e)

    def revert_commit(self, repo_path: Path, commit_hash: str) -> Tuple[bool, Optional[str]]:
        """Revert a commit using the structured API."""
        if not commit_hash or not commit_hash.strip():
            return False, "Commit hash is required"
        if self._use_api and self._api_instance:
            try:
                result = self._api_instance.revert_commit(str(repo_path), commit_hash.strip())
                if result and result.get("success"):
                    return True, None
                return False, result.get("error", "Failed to revert commit")
            except Exception as e:
                return False, str(e)
        return False, "Forester API not available"

    def restore_version(self, repo_path: Path, commit_hash: str) -> Tuple[bool, Optional[str]]:
        """Restore working directory to exactly match a commit (full overwrite)."""
        if not commit_hash or not commit_hash.strip():
            return False, "Commit hash is required"
        if not self._use_api or not self._api_instance:
            return False, "Forester API not available"
        if not hasattr(self._api_instance, "restore_version"):
            return False, "Restore version not available (update Forester)"
        try:
            result = self._api_instance.restore_version(str(repo_path), commit_hash.strip())
            if result and result.get("success"):
                return True, None
            return False, result.get("error", "Restore failed") if result else "Restore failed"
        except Exception as e:
            return False, str(e)

    def reset_commit(self, repo_path: Path, commit_hash: str, mode: str = "mixed") -> Tuple[bool, Optional[str]]:
        """Reset to a commit using the structured API."""
        if not commit_hash or not commit_hash.strip():
            return False, "Commit hash is required"
        if self._use_api and self._api_instance:
            try:
                result = self._api_instance.reset_commit(str(repo_path), commit_hash.strip(), mode)
                if result and result.get("success"):
                    return True, None
                return False, result.get("error", "Failed to reset commit")
            except Exception as e:
                return False, str(e)
        return False, "Forester API not available"

    def switch_branch(self, repo_path: Path, branch_name: str, auto_stash: bool = False) -> Tuple[bool, Optional[str]]:
        """Switch to another branch using the structured API."""
        if not branch_name or not branch_name.strip():
            return False, "Branch name is required"
        if self._use_api and self._api_instance:
            try:
                result = self._api_instance.switch(str(repo_path), branch_name.strip(), auto_stash)
                if result and result.get("success"):
                    return True, None
                return False, result.get("error", "Failed to switch branch")
            except Exception as e:
                return False, str(e)
        return False, "Forester API not available"

    def delete_branch_cli(self, repo_path: Path, branch_name: str) -> Tuple[bool, Optional[str]]:
        """Delete a branch using the API."""
        return self.delete_branch(repo_path, branch_name)


_api_wrapper_instance: Optional[ForesterAPIWrapper] = None


def get_api() -> ForesterAPIWrapper:
    """Get global ForesterAPIWrapper instance."""
    global _api_wrapper_instance
    if _api_wrapper_instance is None:
        _api_wrapper_instance = ForesterAPIWrapper()
    return _api_wrapper_instance
