"""
Forester API wrapper for Difference Machine addon.
Provides functions to use Forester API for repository operations.
"""

import logging
import sys
from pathlib import Path
from typing import Optional, Tuple, List, Dict, Any

logger = logging.getLogger(__name__)


def _result_ok(result: Optional[Dict[str, Any]]) -> bool:
    """JSON API methods return success:true or omit success when the envelope is ok."""
    if result is None:
        return False
    return result.get("success", True)


def _commit_dict(commit: Any) -> Dict[str, Any]:
    """Normalize a commit view/object to the dict shape expected by UI code."""
    if isinstance(commit, dict):
        data = commit
    else:
        data = {
            "hash": getattr(commit, "hash", ""),
            "message": getattr(commit, "message", ""),
            "author": getattr(commit, "author", ""),
            "timestamp": getattr(commit, "timestamp", 0),
            "tag": getattr(commit, "tag", ""),
            "screenshot_path": getattr(commit, "screenshot_path", ""),
        }
    screenshot_path = data.get("screenshot_path", "") or data.get("screenshot_hash", "")
    return {
        "hash": data.get("hash", ""),
        "message": data.get("message", ""),
        "author": data.get("author", ""),
        "tag": data.get("tag", "") or "",
        "timestamp": data.get("timestamp", 0),
        "screenshot_path": screenshot_path,
        "screenshot_hash": screenshot_path,
        "is_head": data.get("is_head", False),
    }


# Try to import Forester API (bindings from addon api/python/ only)
try:
    from .config_loader import get_python_bindings_path
    bindings_path = get_python_bindings_path()
    if bindings_path and bindings_path not in sys.path:
        sys.path.insert(0, bindings_path)
    from python_bindings_json import ForesterAPI
    _API_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Forester API not available: {e}.")
    _API_AVAILABLE = False
    ForesterAPI = None
except Exception as e:
    logger.warning(f"Forester API initialization error: {e}.")
    _API_AVAILABLE = False
    ForesterAPI = None


class ForesterAPIWrapper:
    """Wrapper for Forester API without fallbacks."""
    
    def __init__(self):
        self._api_instance: Optional[ForesterAPI] = None
        self._use_api = _API_AVAILABLE
        
        if self._use_api:
            try:
                # Try to get library path from config
                from .config_loader import get_api_library_path
                api_lib_path = get_api_library_path()
                
                if api_lib_path:
                    # Use path from config
                    self._api_instance = ForesterAPI(api_lib_path)
                    logger.info(f"Forester API initialized from config: {api_lib_path}")
                else:
                    # Try auto-detection
                    self._api_instance = ForesterAPI()
                    logger.info("Forester API initialized with auto-detection")
            except Exception as e:
                logger.warning(f"Failed to initialize Forester API: {e}.")
                self._use_api = False
                self._api_instance = None
    
    @property
    def api(self) -> Optional[ForesterAPI]:
        """Get API instance if available."""
        return self._api_instance if self._use_api else None
    
    def init(self, repo_path: Path) -> Tuple[bool, Optional[str]]:
        """Initialize a new forester repository."""
        if self._use_api and self._api_instance:
            try:
                result = self._api_instance.init(str(repo_path))
                if _result_ok(result):
                    return True, None
                else:
                    return False, result.get("error", "Unknown error")
            except Exception as e:
                logger.error(f"API init failed: {e}")
                return False, str(e)
        
        return False, "Forester API not available"
    
    def status(self, repo_path: Path) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """Get repository status."""
        if self._use_api and self._api_instance:
            try:
                status = self._api_instance.get_status(str(repo_path))
                if status:
                    # Convert to dict format compatible with existing UI expectations
                    status_dict = status.to_dict()
                    return True, {
                        "branch": status_dict.get("current_branch", ""),
                        "head": status_dict.get("head_commit", ""),
                        "modified": status_dict.get("unstaged_modified_files", []),
                        "deleted": status_dict.get("unstaged_deleted_files", []),
                        "untracked": status_dict.get("untracked_files", []),
                    }, None
                else:
                    return False, None, "Failed to get status"
            except Exception as e:
                logger.error(f"API status failed: {e}")
                return False, None, str(e)
        
        return False, None, "Forester API not available"
    
    def add(self, repo_path: Path, files: Optional[List[str]] = None) -> Tuple[bool, Optional[str]]:
        """Add files to staging area."""
        if self._use_api and self._api_instance:
            try:
                if files is None:
                    files = ["."]
                result = self._api_instance.add(str(repo_path), files)
                if _result_ok(result):
                    return True, None
                else:
                    return False, result.get("error", "Unknown error")
            except Exception as e:
                logger.error(f"API add failed: {e}")
                return False, str(e)
        
        return False, "Forester API not available"
    
    def commit(self, repo_path: Path, message: str, author: Optional[str] = None, tag: Optional[str] = None) -> Tuple[bool, Optional[str], Optional[str]]:
        """Create a commit."""
        if self._use_api and self._api_instance:
            try:
                result = self._api_instance.commit(
                    str(repo_path),
                    message,
                    author,
                    tag=tag or None,
                )
                if not _result_ok(result):
                    return False, None, result.get("error", "Unknown error")

                commit_hash = result.get("hash") or result.get("commit_hash")
                if not commit_hash:
                    try:
                        commits = self._api_instance.get_log(str(repo_path), max_count=1)
                        if commits and len(commits) > 0:
                            commit_hash = commits[0].hash
                    except Exception:
                        pass
                return True, commit_hash, None
            except Exception as e:
                logger.error(f"API commit failed: {e}")
                return False, None, str(e)

        return False, None, "Forester API not available"

    def log(
        self,
        repo_path: Path,
        branch: Optional[str] = None,
        limit: int = 100,
        path: Optional[str] = None,
    ) -> Tuple[bool, List[Dict[str, Any]], Optional[str]]:
        """Get commit log, optionally filtered by file path."""
        if self._use_api and self._api_instance:
            try:
                if not repo_path or not repo_path.exists():
                    return False, [], f"Repository path does not exist: {repo_path}"

                commits = self._api_instance.get_log(
                    str(repo_path),
                    max_count=limit if limit > 0 else 0,
                    branch=branch,
                    path=path,
                )

                if commits is None:
                    logger.warning(
                        "get_log returned None for repo_path=%s, branch=%s, path=%s",
                        repo_path,
                        branch,
                        path,
                    )
                    return False, [], "Failed to get log (API returned None)"

                commit_list = []
                try:
                    for commit in commits:
                        if not commit or not hasattr(commit, "hash"):
                            logger.warning("Invalid commit object in log result, skipping")
                            continue
                        commit_list.append(_commit_dict(commit))
                except (AttributeError, TypeError) as e:
                    logger.error(f"Error processing commit list: {e}")
                    return False, [], f"Error processing commit list: {e}"

                return True, commit_list, None
            except Exception as e:
                logger.error(f"API log failed: {e}", exc_info=True)
                return False, [], str(e)

        return False, [], "Forester API not available"
    
    def switch(self, repo_path: Path, target: str, auto_stash: bool = False) -> Tuple[bool, Optional[str]]:
        """Switch branch or commit."""
        if self._use_api and self._api_instance:
            try:
                result = self._api_instance.switch(str(repo_path), target, auto_stash)
                if _result_ok(result):
                    return True, None
                else:
                    return False, result.get("error", "Unknown error")
            except Exception as e:
                logger.error(f"API switch failed: {e}")
                return False, str(e)
        
        return False, "Forester API not available"
    
    def get_branches(self, repo_path: Path) -> Tuple[bool, List[Dict[str, Any]], Optional[str]]:
        """Get list of branches."""
        if self._use_api and self._api_instance:
            try:
                branches = self._api_instance.get_branches(str(repo_path))
                if branches is not None:
                    # Convert to list of dicts compatible with existing UI expectations
                    branch_list = []
                    for branch in branches:
                        branch_dict = {
                            "name": branch.name,
                            "is_current": branch.is_current,
                            "commit_hash": branch.commit_hash,
                        }
                        branch_list.append(branch_dict)
                    return True, branch_list, None
                else:
                    return False, [], "Failed to get branches"
            except Exception as e:
                logger.error(f"API get_branches failed: {e}")
                return False, [], str(e)
        
        return False, [], "Forester API not available"

    def compare_extract(
        self,
        repo_path: Path,
        commit_hash: str,
        cleanup: bool = False,
        editor_path: Optional[str] = None,
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """Extract commit to tmp_review or cleanup."""
        if self._use_api and self._api_instance:
            try:
                result = self._api_instance.compare_extract(
                    str(repo_path),
                    commit_hash,
                    cleanup=cleanup,
                    editor_path=editor_path or "",
                )
                if result.get("success"):
                    return True, result.get("path"), None
                return False, None, result.get("error", "Unknown error")
            except Exception as e:
                logger.error(f"API compare_extract failed: {e}")
                return False, None, str(e)

        return False, None, "Forester API not available"

    def restore_version(self, repo_path: Path, commit_hash: str) -> Tuple[bool, Optional[str]]:
        """Restore working directory to exactly match a commit (full overwrite)."""
        if self._use_api and self._api_instance:
            try:
                result = self._api_instance.restore_version(str(repo_path), commit_hash)
                if _result_ok(result):
                    return True, None
                return False, result.get("error", "Unknown error")
            except Exception as e:
                logger.error(f"API restore_version failed: {e}")
                return False, str(e)
        return False, "Forester API not available"

    def restore_file(
        self,
        repo_path: Path,
        commit_hash: str,
        paths: List[str],
    ) -> Tuple[bool, Optional[str]]:
        """Restore specific file paths from a commit into the working tree."""
        if self._use_api and self._api_instance:
            try:
                result = self._api_instance.restore_file(str(repo_path), commit_hash, paths)
                if _result_ok(result):
                    return True, None
                return False, result.get("error", "Unknown error")
            except Exception as e:
                logger.error(f"API restore_file failed: {e}")
                return False, str(e)
        return False, "Forester API not available"

    def get_commit(
        self,
        repo_path: Path,
        commit_hash: str,
    ) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """Get a single commit by hash."""
        if self._use_api and self._api_instance:
            try:
                commit = self._api_instance.get_commit(str(repo_path), commit_hash)
                if commit:
                    return True, _commit_dict(commit), None
                return False, None, "Commit not found"
            except Exception as e:
                logger.error(f"API get_commit failed: {e}")
                return False, None, str(e)
        return False, None, "Forester API not available"

    def gc(self, repo_path: Path, dry_run: bool = False, reflog_expire_days: int = 90) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """Run garbage collection."""
        if self._use_api and self._api_instance:
            try:
                result = self._api_instance.gc(str(repo_path), dry_run=dry_run, reflog_expire_days=reflog_expire_days)
                if result.get("success"):
                    return True, {
                        "commits_deleted": result.get("commits_deleted", 0),
                        "trees_deleted": result.get("trees_deleted", 0),
                        "blobs_deleted": result.get("blobs_deleted", 0),
                        "dry_run": result.get("dry_run", False),
                    }, None
                return False, None, result.get("error", "Unknown error")
            except Exception as e:
                logger.error(f"API gc failed: {e}")
                return False, None, str(e)

        return False, None, "Forester API not available"

    def rebuild(self, repo_path: Path) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """Rebuild database from storage."""
        if self._use_api and self._api_instance:
            try:
                result = self._api_instance.rebuild(str(repo_path))
                if result.get("success"):
                    return True, {
                        "commits_found": result.get("commits_found", 0),
                        "commits_rebuilt": result.get("commits_rebuilt", 0),
                        "trees_found": result.get("trees_found", 0),
                        "blobs_found": result.get("blobs_found", 0),
                    }, None
                return False, None, result.get("error", "Unknown error")
            except Exception as e:
                logger.error(f"API rebuild failed: {e}")
                return False, None, str(e)

        return False, None, "Forester API not available"

    def list_locks(self, repo_path: Path) -> Tuple[bool, Optional[List[Dict[str, Any]]], Optional[str]]:
        """List locks for current branch."""
        if self._use_api and self._api_instance:
            try:
                result = self._api_instance.list_locks(str(repo_path))
                if result.get("success"):
                    return True, result.get("locks", []), None
                return False, None, result.get("error", "Unknown error")
            except Exception as e:
                logger.error(f"API list_locks failed: {e}")
                return False, None, str(e)

        return False, None, "Forester API not available"

    def acquire_lock(
        self,
        repo_path: Path,
        file_path: Path,
        user: str,
        lock_type: int = 0,
        expire_hours: int = 0,
    ) -> Tuple[bool, Optional[str]]:
        """Acquire a lock on a file."""
        if self._use_api and self._api_instance:
            try:
                result = self._api_instance.acquire_lock(
                    str(repo_path),
                    str(file_path),
                    user,
                    lock_type=lock_type,
                    expire_hours=expire_hours,
                )
                if result.get("success"):
                    return True, None
                return False, result.get("error", "Unknown error")
            except Exception as e:
                logger.error(f"API acquire_lock failed: {e}")
                return False, str(e)

        return False, "Forester API not available"

    def release_lock(self, repo_path: Path, file_path: Path, user: str) -> Tuple[bool, Optional[str]]:
        """Release a lock on a file."""
        if self._use_api and self._api_instance:
            try:
                result = self._api_instance.release_lock(str(repo_path), str(file_path), user)
                if result.get("success"):
                    return True, None
                return False, result.get("error", "Unknown error")
            except Exception as e:
                logger.error(f"API release_lock failed: {e}")
                return False, str(e)

        return False, "Forester API not available"
    
    def add_object(
        self,
        repo_path: Path,
        editor_type: str,
        file_path: str,
        object_name: str,
        object_type: str,
        commit_hash: str,
        object_data: Optional[Dict[str, Any]] = None,
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict[str, str]] = None,
    ) -> Tuple[bool, Optional[str]]:
        """Add an object to the database."""
        if self._use_api and self._api_instance:
            try:
                result = self._api_instance.add_object(
                    str(repo_path),
                    editor_type,
                    file_path,
                    object_name,
                    object_type,
                    commit_hash,
                    object_data,
                    tags,
                    metadata,
                )
                if result.get("success"):
                    return True, None
                return False, result.get("error", "Unknown error")
            except Exception as e:
                logger.error(f"API add_object failed: {e}")
                return False, str(e)
        
        return False, "Forester API not available"
    
    def get_object(
        self,
        repo_path: Path,
        commit_hash: str,
        file_path: str,
        object_name: str,
    ) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """Get an object from the database."""
        if self._use_api and self._api_instance:
            try:
                obj = self._api_instance.get_object(
                    str(repo_path),
                    commit_hash,
                    file_path,
                    object_name,
                )
                if obj:
                    return True, obj, None
                return False, None, "Object not found"
            except Exception as e:
                logger.error(f"API get_object failed: {e}")
                return False, None, str(e)
        
        return False, None, "Forester API not available"
    
    def get_objects_by_commit(
        self,
        repo_path: Path,
        commit_hash: str,
    ) -> Tuple[bool, Optional[List[Dict[str, Any]]], Optional[str]]:
        """Get all objects for a commit."""
        if self._use_api and self._api_instance:
            try:
                objects = self._api_instance.get_objects_by_commit(
                    str(repo_path),
                    commit_hash,
                )
                return True, objects, None
            except Exception as e:
                logger.error(f"API get_objects_by_commit failed: {e}")
                return False, None, str(e)
        
        return False, None, "Forester API not available"
    
    def add_tag_to_object(
        self,
        repo_path: Path,
        commit_hash: str,
        file_path: str,
        object_name: str,
        tag: str,
    ) -> Tuple[bool, Optional[str]]:
        """Add a tag to an object."""
        if self._use_api and self._api_instance:
            try:
                result = self._api_instance.add_tag_to_object(
                    str(repo_path),
                    commit_hash,
                    file_path,
                    object_name,
                    tag,
                )
                if result.get("success"):
                    return True, None
                return False, result.get("error", "Unknown error")
            except Exception as e:
                logger.error(f"API add_tag_to_object failed: {e}")
                return False, str(e)
        
        return False, "Forester API not available"
    
    def remove_tag_from_object(
        self,
        repo_path: Path,
        commit_hash: str,
        file_path: str,
        object_name: str,
        tag: str,
    ) -> Tuple[bool, Optional[str]]:
        """Remove a tag from an object."""
        if self._use_api and self._api_instance:
            try:
                result = self._api_instance.remove_tag_from_object(
                    str(repo_path),
                    commit_hash,
                    file_path,
                    object_name,
                    tag,
                )
                if result.get("success"):
                    return True, None
                return False, result.get("error", "Unknown error")
            except Exception as e:
                logger.error(f"API remove_tag_from_object failed: {e}")
                return False, str(e)
        
        return False, "Forester API not available"

    def delete_object(
        self,
        repo_path: Path,
        commit_hash: str,
        file_path: str,
        object_name: str,
    ) -> Tuple[bool, Optional[str]]:
        """Delete an object from the database."""
        if self._use_api and self._api_instance:
            try:
                result = self._api_instance.delete_object(
                    str(repo_path),
                    commit_hash,
                    file_path,
                    object_name,
                )
                if result.get("success"):
                    return True, None
                return False, result.get("error", "Unknown error")
            except Exception as e:
                logger.error(f"API delete_object failed: {e}")
                return False, str(e)
        return False, "Forester API not available"

    def delete_objects_by_file(
        self,
        repo_path: Path,
        commit_hash: str,
        file_path: str,
    ) -> Tuple[bool, Optional[str]]:
        """Delete all objects for a file in a commit."""
        if self._use_api and self._api_instance:
            try:
                result = self._api_instance.delete_objects_by_file(
                    str(repo_path),
                    commit_hash,
                    file_path,
                )
                if result.get("success"):
                    return True, None
                return False, result.get("error", "Unknown error")
            except Exception as e:
                logger.error(f"API delete_objects_by_file failed: {e}")
                return False, str(e)
        return False, "Forester API not available"
    
    def set_object_metadata(
        self,
        repo_path: Path,
        commit_hash: str,
        file_path: str,
        object_name: str,
        key: str,
        value: str,
    ) -> Tuple[bool, Optional[str]]:
        """Set metadata for an object."""
        if self._use_api and self._api_instance:
            try:
                result = self._api_instance.set_object_metadata(
                    str(repo_path),
                    commit_hash,
                    file_path,
                    object_name,
                    key,
                    value,
                )
                if result.get("success"):
                    return True, None
                return False, result.get("error", "Unknown error")
            except Exception as e:
                logger.error(f"API set_object_metadata failed: {e}")
                return False, str(e)

        return False, "Forester API not available"

    def create_branch(
        self,
        repo_path: Path,
        branch_name: str,
        commit_hash: str = "",
    ) -> Tuple[bool, Optional[str]]:
        """Create a new branch."""
        if self._use_api and self._api_instance:
            try:
                result = self._api_instance.create_branch(str(repo_path), branch_name, commit_hash)
                if _result_ok(result):
                    return True, None
                return False, result.get("error", "Unknown error")
            except Exception as e:
                logger.error(f"API create_branch failed: {e}")
                return False, str(e)
        return False, "Forester API not available"

    def delete_branch(self, repo_path: Path, branch_name: str) -> Tuple[bool, Optional[str]]:
        """Delete a branch."""
        if self._use_api and self._api_instance:
            try:
                result = self._api_instance.delete_branch(str(repo_path), branch_name)
                if _result_ok(result):
                    return True, None
                return False, result.get("error", "Unknown error")
            except Exception as e:
                logger.error(f"API delete_branch failed: {e}")
                return False, str(e)
        return False, "Forester API not available"

    def rename_branch(
        self,
        repo_path: Path,
        old_name: str,
        new_name: str,
    ) -> Tuple[bool, Optional[str]]:
        """Rename a branch."""
        if self._use_api and self._api_instance:
            try:
                result = self._api_instance.rename_branch(str(repo_path), old_name, new_name)
                if _result_ok(result):
                    return True, None
                return False, result.get("error", "Unknown error")
            except Exception as e:
                logger.error(f"API rename_branch failed: {e}")
                return False, str(e)
        return False, "Forester API not available"

    def revert_commit(self, repo_path: Path, commit_hash: str) -> Tuple[bool, Optional[str]]:
        """Revert a commit."""
        if self._use_api and self._api_instance:
            try:
                result = self._api_instance.revert_commit(str(repo_path), commit_hash)
                if _result_ok(result):
                    return True, None
                return False, result.get("error", "Unknown error")
            except Exception as e:
                logger.error(f"API revert_commit failed: {e}")
                return False, str(e)
        return False, "Forester API not available"

    def reset_commit(
        self,
        repo_path: Path,
        commit_hash: str,
        mode: str = "mixed",
    ) -> Tuple[bool, Optional[str]]:
        """Reset branch HEAD to a commit."""
        if self._use_api and self._api_instance:
            try:
                result = self._api_instance.reset_commit(str(repo_path), commit_hash, mode)
                if _result_ok(result):
                    return True, None
                return False, result.get("error", "Unknown error")
            except Exception as e:
                logger.error(f"API reset_commit failed: {e}")
                return False, str(e)
        return False, "Forester API not available"

    def get_objects_by_file(
        self,
        repo_path: Path,
        commit_hash: str,
        file_path: str,
    ) -> Tuple[bool, Optional[List[Dict[str, Any]]], Optional[str]]:
        """Get all objects for a file in a commit."""
        if self._use_api and self._api_instance:
            try:
                objects = self._api_instance.get_objects_by_file(
                    str(repo_path),
                    commit_hash,
                    file_path,
                )
                return True, objects, None
            except Exception as e:
                logger.error(f"API get_objects_by_file failed: {e}")
                return False, None, str(e)
        return False, None, "Forester API not available"


# Global instance
_api_wrapper_instance: Optional[ForesterAPIWrapper] = None


def get_api() -> ForesterAPIWrapper:
    """Get global ForesterAPIWrapper instance."""
    global _api_wrapper_instance
    if _api_wrapper_instance is None:
        _api_wrapper_instance = ForesterAPIWrapper()
    return _api_wrapper_instance


def close_api() -> None:
    """Close Forester API session handles and reset the global wrapper."""
    global _api_wrapper_instance
    if _api_wrapper_instance is not None:
        instance = _api_wrapper_instance._api_instance
        if instance is not None:
            try:
                instance.close()
            except Exception as e:
                logger.warning("Failed to close Forester API: %s", e)
        _api_wrapper_instance = None
