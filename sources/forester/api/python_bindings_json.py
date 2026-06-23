"""
Python bindings for Forester JSON C API (thin layer).
"""

import ctypes
import json
import os
import sys
import weakref
from pathlib import Path
from typing import Any, Dict, List, Optional

# Keep CDLL handles alive for the process lifetime. Unloading a Go c-shared
# library during interpreter shutdown can crash Python on macOS.
_LIB_CACHE: Dict[str, ctypes.CDLL] = {}
_API_INSTANCES: "weakref.WeakSet[ForesterAPI]" = weakref.WeakSet()


def _load_library(library_path: str) -> ctypes.CDLL:
    cached = _LIB_CACHE.get(library_path)
    if cached is not None:
        return cached

    lib = ctypes.CDLL(library_path)
    lib.ForesterOpen.argtypes = [ctypes.c_char_p]
    lib.ForesterOpen.restype = ctypes.c_void_p
    lib.ForesterCall.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_char_p]
    lib.ForesterCall.restype = ctypes.c_void_p
    lib.ForesterFreeString.argtypes = [ctypes.c_void_p]
    lib.ForesterFreeString.restype = None
    lib.ForesterClose.argtypes = [ctypes.c_void_p]
    lib.ForesterClose.restype = None

    _LIB_CACHE[library_path] = lib
    return lib


class _CommitView:
    """Lightweight commit object for compatibility with structured bindings."""

    def __init__(self, data: Dict[str, Any]):
        self.hash = data.get("hash", "")
        self.parent_hash = data.get("parent_hash", "")
        self.parent_hashes = data.get("parent_hashes", [])
        self.tree_hash = data.get("tree_hash", "")
        self.author = data.get("author", "")
        self.message = data.get("message", "")
        self.timestamp = data.get("timestamp", 0)
        self.type = data.get("type", 0)
        self.screenshot_path = data.get("screenshot_path", "")
        self.tag = data.get("tag", "")


class _BranchView:
    def __init__(self, data: Dict[str, Any]):
        self.name = data.get("name", "")
        self.commit_hash = data.get("commit_hash", "")
        self.created_at = data.get("created_at", 0)
        self.is_current = bool(data.get("is_current", False))


class _StatusView:
    def __init__(self, data: Dict[str, Any]):
        self.current_branch = data.get("current_branch", "")
        self.head_commit = data.get("head_commit", "")
        self.staged_new_files = data.get("staged_new_files", [])
        self.staged_modified_files = data.get("staged_modified_files", [])
        self.staged_deleted_files = data.get("staged_deleted_files", [])
        self.unstaged_modified_files = data.get("unstaged_modified_files", [])
        self.unstaged_deleted_files = data.get("unstaged_deleted_files", [])
        self.untracked_files = data.get("untracked_files", [])

    def to_dict(self) -> Dict[str, Any]:
        return {
            "current_branch": self.current_branch,
            "head_commit": self.head_commit,
            "staged_new_files": self.staged_new_files,
            "staged_modified_files": self.staged_modified_files,
            "staged_deleted_files": self.staged_deleted_files,
            "unstaged_modified_files": self.unstaged_modified_files,
            "unstaged_deleted_files": self.unstaged_deleted_files,
            "untracked_files": self.untracked_files,
        }


class ForesterAPI:
    """Python wrapper for Forester JSON C API."""

    def __init__(self, library_path: Optional[str] = None):
        if library_path is None:
            library_path = self._find_library()
        if not library_path or not os.path.exists(library_path):
            raise FileNotFoundError("Forester library not found")

        self._library_path = library_path
        self._lib = _load_library(library_path)
        self._handles: Dict[str, ctypes.c_void_p] = {}
        self._closed = False
        _API_INSTANCES.add(self)

    def _find_library(self) -> Optional[str]:
        if sys.platform == "win32":
            names = ["forester.dll", "libforester.dll"]
        elif sys.platform == "darwin":
            names = ["libforester.dylib", "libforester_arm64.dylib"]
        else:
            names = ["libforester.so"]

        possible_paths = []
        for name in names:
            possible_paths.extend([
                os.path.join(os.path.dirname(__file__), "..", name),
                os.path.join(os.path.dirname(__file__), name),
                os.path.join(os.path.dirname(__file__), "..", "build", name),
            ])
        possible_paths.extend([
            "/usr/local/lib/libforester.so",
            "/usr/lib/libforester.so",
            "/opt/DiffMachine/lib/libforester.so",
        ])

        for path in possible_paths:
            if os.path.exists(path):
                return path
        return None

    def _get_handle(self, repo_path: str) -> ctypes.c_void_p:
        if self._closed:
            raise RuntimeError("ForesterAPI is closed")
        key = str(Path(repo_path).resolve())
        handle = self._handles.get(key)
        if handle is None:
            handle = self._lib.ForesterOpen(key.encode("utf-8"))
            if not handle:
                raise RuntimeError(f"ForesterOpen failed for {key}")
            self._handles[key] = handle
        return handle

    def close(self) -> None:
        """Close all open session handles. Safe to call multiple times."""
        if self._closed:
            return
        for handle in self._handles.values():
            if handle:
                self._lib.ForesterClose(handle)
        self._handles.clear()
        self._closed = True

    def close_all(self) -> None:
        """Backward-compatible alias for close()."""
        self.close()

    def __enter__(self) -> "ForesterAPI":
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        self.close()

    def _call(self, repo_path: str, method: str, args: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        handle = self._get_handle(repo_path)
        args_json = json.dumps(args or {})
        raw_ptr = self._lib.ForesterCall(
            handle,
            method.encode("utf-8"),
            args_json.encode("utf-8"),
        )
        if not raw_ptr:
            raise RuntimeError(f"ForesterCall returned null for {method}")

        # Copy JSON before freeing the C heap allocation returned by ForesterCall.
        text = ctypes.string_at(raw_ptr).decode("utf-8")
        self._lib.ForesterFreeString(raw_ptr)

        payload = json.loads(text)
        if not payload.get("ok"):
            raise RuntimeError(payload.get("error") or f"API call failed: {method}")
        result = payload.get("result")
        return result if isinstance(result, dict) else {"value": result}

    def init(self, repo_path: str) -> Dict[str, Any]:
        return self._call(repo_path, "repo.init")

    def add(self, repo_path: str, files: Optional[List[str]] = None) -> Dict[str, Any]:
        return self._call(repo_path, "index.add", {"files": files or ["."]})

    def commit(
        self,
        repo_path: str,
        message: str,
        author: Optional[str] = None,
        amend: bool = False,
        tag: Optional[str] = None,
    ) -> Dict[str, Any]:
        args: Dict[str, Any] = {"message": message, "amend": amend}
        if author:
            args["author"] = author
        if tag:
            args["tag"] = tag
        return self._call(repo_path, "commit.create", args)

    def get_status(self, repo_path: str) -> Optional[_StatusView]:
        result = self._call(repo_path, "status.get")
        return _StatusView(result)

    def get_log(
        self,
        repo_path: str,
        max_count: int = 100,
        branch: Optional[str] = None,
        path: Optional[str] = None,
    ) -> Optional[List[_CommitView]]:
        args: Dict[str, Any] = {"max_count": max_count}
        if branch:
            args["branch"] = branch
        if path:
            args["path"] = path
        result = self._call(repo_path, "log.get", args)
        commits = result.get("commits", [])
        return [_CommitView(c) for c in commits]

    def get_commit(self, repo_path: str, commit_hash: str) -> Optional[Dict[str, Any]]:
        return self._call(repo_path, "commit.get", {"hash": commit_hash})

    def get_branches(self, repo_path: str) -> Optional[List[_BranchView]]:
        result = self._call(repo_path, "branch.list")
        return [_BranchView(b) for b in result.get("branches", [])]

    def switch(self, repo_path: str, target: str, auto_stash: bool = False) -> Dict[str, Any]:
        return self._call(repo_path, "repo.switch", {"target": target, "auto_stash": auto_stash})

    def compare_extract(
        self,
        repo_path: str,
        commit_hash: str,
        cleanup: bool = False,
        editor_path: str = "",
    ) -> Dict[str, Any]:
        return self._call(
            repo_path,
            "compare.extract",
            {"commit_hash": commit_hash, "cleanup": cleanup, "editor_path": editor_path},
        )

    def restore_version(self, repo_path: str, commit_hash: str) -> Dict[str, Any]:
        return self._call(repo_path, "restore.version", {"commit_hash": commit_hash})

    def restore_file(self, repo_path: str, commit_hash: str, paths: List[str]) -> Dict[str, Any]:
        return self._call(repo_path, "restore.file", {"commit_hash": commit_hash, "paths": paths})

    def gc(self, repo_path: str, dry_run: bool = False, reflog_expire_days: int = 90) -> Dict[str, Any]:
        result = self._call(
            repo_path,
            "gc.run",
            {"dry_run": dry_run, "reflog_expire_days": reflog_expire_days},
        )
        return {"success": True, **result}

    def rebuild(self, repo_path: str) -> Dict[str, Any]:
        result = self._call(repo_path, "repo.rebuild")
        return {"success": True, **result}

    def list_locks(self, repo_path: str) -> Dict[str, Any]:
        result = self._call(repo_path, "lock.list")
        return {"success": True, "locks": result.get("locks", [])}

    def acquire_lock(
        self,
        repo_path: str,
        file_path: str,
        user: str,
        lock_type: int = 0,
        expire_hours: int = 0,
    ) -> Dict[str, Any]:
        return self._call(
            repo_path,
            "lock.acquire",
            {
                "file_path": file_path,
                "user": user,
                "lock_type": lock_type,
                "expire_hours": expire_hours,
            },
        )

    def release_lock(self, repo_path: str, file_path: str, user: str) -> Dict[str, Any]:
        return self._call(repo_path, "lock.release", {"file_path": file_path, "user": user})

    def add_object(
        self,
        repo_path: str,
        editor_type: str,
        file_path: str,
        object_name: str,
        object_type: str,
        commit_hash: str,
        object_data: Optional[Dict[str, Any]] = None,
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        return self._call(
            repo_path,
            "object.add",
            {
                "editor_type": editor_type,
                "file_path": file_path,
                "object_name": object_name,
                "object_type": object_type,
                "commit_hash": commit_hash,
                "object_data": object_data,
                "tags": tags,
                "metadata": metadata,
            },
        )

    def get_object(self, repo_path: str, commit_hash: str, file_path: str, object_name: str) -> Optional[Dict[str, Any]]:
        return self._call(
            repo_path,
            "object.get",
            {"commit_hash": commit_hash, "file_path": file_path, "object_name": object_name},
        )

    def get_objects_by_commit(self, repo_path: str, commit_hash: str) -> List[Dict[str, Any]]:
        result = self._call(repo_path, "object.list_by_commit", {"commit_hash": commit_hash})
        return result.get("objects", [])

    def get_objects_by_file(self, repo_path: str, commit_hash: str, file_path: str) -> List[Dict[str, Any]]:
        result = self._call(
            repo_path,
            "object.list_by_file",
            {"commit_hash": commit_hash, "file_path": file_path},
        )
        return result.get("objects", [])

    def add_tag_to_object(
        self,
        repo_path: str,
        commit_hash: str,
        file_path: str,
        object_name: str,
        tag: str,
    ) -> Dict[str, Any]:
        return self._call(
            repo_path,
            "object.tag.add",
            {"commit_hash": commit_hash, "file_path": file_path, "object_name": object_name, "tag": tag},
        )

    def remove_tag_from_object(
        self,
        repo_path: str,
        commit_hash: str,
        file_path: str,
        object_name: str,
        tag: str,
    ) -> Dict[str, Any]:
        return self._call(
            repo_path,
            "object.tag.remove",
            {"commit_hash": commit_hash, "file_path": file_path, "object_name": object_name, "tag": tag},
        )

    def set_object_metadata(
        self,
        repo_path: str,
        commit_hash: str,
        file_path: str,
        object_name: str,
        key: str,
        value: str,
    ) -> Dict[str, Any]:
        return self._call(
            repo_path,
            "object.metadata.set",
            {
                "commit_hash": commit_hash,
                "file_path": file_path,
                "object_name": object_name,
                "key": key,
                "value": value,
            },
        )

    def delete_object(self, repo_path: str, commit_hash: str, file_path: str, object_name: str) -> Dict[str, Any]:
        return self._call(
            repo_path,
            "object.delete",
            {"commit_hash": commit_hash, "file_path": file_path, "object_name": object_name},
        )

    def delete_objects_by_file(self, repo_path: str, commit_hash: str, file_path: str) -> Dict[str, Any]:
        return self._call(
            repo_path,
            "object.delete_by_file",
            {"commit_hash": commit_hash, "file_path": file_path},
        )

    def create_branch(self, repo_path: str, branch_name: str, commit_hash: str = "") -> Dict[str, Any]:
        args: Dict[str, Any] = {"name": branch_name}
        if commit_hash:
            args["commit_hash"] = commit_hash
        return self._call(repo_path, "branch.create", args)

    def delete_branch(self, repo_path: str, branch_name: str) -> Dict[str, Any]:
        return self._call(repo_path, "branch.delete", {"name": branch_name})

    def rename_branch(self, repo_path: str, old_name: str, new_name: str) -> Dict[str, Any]:
        return self._call(repo_path, "branch.rename", {"old_name": old_name, "new_name": new_name})

    def revert_commit(self, repo_path: str, commit_hash: str) -> Dict[str, Any]:
        return self._call(repo_path, "commit.revert", {"commit_hash": commit_hash})

    def reset_commit(self, repo_path: str, commit_hash: str, mode: str = "mixed") -> Dict[str, Any]:
        return self._call(repo_path, "commit.reset", {"commit_hash": commit_hash, "mode": mode})
