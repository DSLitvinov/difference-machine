"""
Python bindings for Forester C API using ctypes - Structured API
"""

import ctypes
import json
import os
import sys
from pathlib import Path
from typing import Optional, List, Dict, Any


# Define C structures for ctypes
class ForesterResult(ctypes.Structure):
    _fields_ = [
        ("success", ctypes.c_int),
        ("error", ctypes.c_char_p),
    ]

class ForesterStatus(ctypes.Structure):
    _fields_ = [
        ("current_branch", ctypes.c_char_p),
        ("head_commit", ctypes.c_char_p),
        ("staged_new_count", ctypes.c_int),
        ("staged_new_files", ctypes.POINTER(ctypes.c_char_p)),
        ("staged_modified_count", ctypes.c_int),
        ("staged_modified_files", ctypes.POINTER(ctypes.c_char_p)),
        ("staged_deleted_count", ctypes.c_int),
        ("staged_deleted_files", ctypes.POINTER(ctypes.c_char_p)),
        ("unstaged_modified_count", ctypes.c_int),
        ("unstaged_modified_files", ctypes.POINTER(ctypes.c_char_p)),
        ("unstaged_deleted_count", ctypes.c_int),
        ("unstaged_deleted_files", ctypes.POINTER(ctypes.c_char_p)),
        ("untracked_count", ctypes.c_int),
        ("untracked_files", ctypes.POINTER(ctypes.c_char_p)),
    ]
    
    def to_dict(self):
        """Convert to dictionary"""
        def extract_array(arr_ptr, count):
            if not arr_ptr or count == 0:
                return []
            return [arr_ptr[i].decode('utf-8') for i in range(count) if arr_ptr[i]]
        
        return {
            "current_branch": self.current_branch.decode('utf-8') if self.current_branch else "",
            "head_commit": self.head_commit.decode('utf-8') if self.head_commit else "",
            "staged_new_files": extract_array(self.staged_new_files, self.staged_new_count),
            "staged_modified_files": extract_array(self.staged_modified_files, self.staged_modified_count),
            "staged_deleted_files": extract_array(self.staged_deleted_files, self.staged_deleted_count),
            "unstaged_modified_files": extract_array(self.unstaged_modified_files, self.unstaged_modified_count),
            "unstaged_deleted_files": extract_array(self.unstaged_deleted_files, self.unstaged_deleted_count),
            "untracked_files": extract_array(self.untracked_files, self.untracked_count),
        }
    
    def to_dict(self):
        """Convert to dictionary"""
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


class ForesterCommit(ctypes.Structure):
    _fields_ = [
        ("hash", ctypes.c_char_p),
        ("parent_hash", ctypes.c_char_p),
        ("parent_hashes", ctypes.POINTER(ctypes.c_char_p)),
        ("parent_count", ctypes.c_int),
        ("tree_hash", ctypes.c_char_p),
        ("author", ctypes.c_char_p),
        ("message", ctypes.c_char_p),
        ("timestamp", ctypes.c_longlong),
        ("type", ctypes.c_int),
        ("screenshot_path", ctypes.c_char_p),
    ]
    
    def to_dict(self):
        """Convert to dictionary"""
        parent_hashes = []
        if self.parent_hashes and self.parent_count > 0:
            for i in range(self.parent_count):
                if self.parent_hashes[i]:
                    parent_hashes.append(self.parent_hashes[i].decode('utf-8'))
        
        return {
            "hash": self.hash.decode('utf-8') if self.hash else "",
            "parent_hash": self.parent_hash.decode('utf-8') if self.parent_hash else "",
            "parent_hashes": parent_hashes,
            "tree_hash": self.tree_hash.decode('utf-8') if self.tree_hash else "",
            "author": self.author.decode('utf-8') if self.author else "",
            "message": self.message.decode('utf-8') if self.message else "",
            "timestamp": self.timestamp,
            "type": self.type,
            "screenshot_path": self.screenshot_path.decode('utf-8') if self.screenshot_path else "",
        }


class ForesterBranch(ctypes.Structure):
    _fields_ = [
        ("name", ctypes.c_char_p),
        ("commit_hash", ctypes.c_char_p),
        ("created_at", ctypes.c_longlong),
        ("is_current", ctypes.c_int),
    ]
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            "name": self.name.decode('utf-8') if self.name else "",
            "commit_hash": self.commit_hash.decode('utf-8') if self.commit_hash else "",
            "created_at": self.created_at,
            "is_current": bool(self.is_current),
        }

class ForesterCommitList(ctypes.Structure):
    _fields_ = [
        ("count", ctypes.c_int),
        ("commits", ctypes.POINTER(ForesterCommit)),
    ]

class ForesterBranchList(ctypes.Structure):
    _fields_ = [
        ("count", ctypes.c_int),
        ("branches", ctypes.POINTER(ForesterBranch)),
    ]


class ForesterObject(ctypes.Structure):
    _fields_ = [
        ("id", ctypes.c_longlong),
        ("editor_type", ctypes.c_char_p),
        ("file_path", ctypes.c_char_p),
        ("object_name", ctypes.c_char_p),
        ("object_type", ctypes.c_char_p),
        ("commit_hash", ctypes.c_char_p),
        ("object_data", ctypes.c_char_p),
        ("tags", ctypes.c_char_p),
        ("metadata", ctypes.c_char_p),
        ("created_at", ctypes.c_longlong),
        ("updated_at", ctypes.c_longlong),
    ]
    
    def to_dict(self):
        """Convert to dictionary"""
        import json
        object_data = {}
        tags = []
        metadata = {}
        
        if self.object_data:
            try:
                object_data = json.loads(self.object_data.decode('utf-8'))
            except:
                pass
        
        if self.tags:
            try:
                tags = json.loads(self.tags.decode('utf-8'))
            except:
                pass
        
        if self.metadata:
            try:
                metadata = json.loads(self.metadata.decode('utf-8'))
            except:
                pass
        
        return {
            "id": self.id,
            "editor_type": self.editor_type.decode('utf-8') if self.editor_type else "",
            "file_path": self.file_path.decode('utf-8') if self.file_path else "",
            "object_name": self.object_name.decode('utf-8') if self.object_name else "",
            "object_type": self.object_type.decode('utf-8') if self.object_type else "",
            "commit_hash": self.commit_hash.decode('utf-8') if self.commit_hash else "",
            "object_data": object_data,
            "tags": tags,
            "metadata": metadata,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


class ForesterObjectList(ctypes.Structure):
    _fields_ = [
        ("count", ctypes.c_int),
        ("objects", ctypes.POINTER(ForesterObject)),
    ]


class ForesterGcResult(ctypes.Structure):
    _fields_ = [
        ("success", ctypes.c_int),
        ("error", ctypes.c_char_p),
        ("commits_deleted", ctypes.c_int),
        ("trees_deleted", ctypes.c_int),
        ("blobs_deleted", ctypes.c_int),
        ("dry_run", ctypes.c_int),
    ]


class ForesterRebuildResult(ctypes.Structure):
    _fields_ = [
        ("success", ctypes.c_int),
        ("error", ctypes.c_char_p),
        ("commits_found", ctypes.c_int),
        ("commits_rebuilt", ctypes.c_int),
        ("trees_found", ctypes.c_int),
        ("blobs_found", ctypes.c_int),
    ]


class ForesterPathResult(ctypes.Structure):
    _fields_ = [
        ("success", ctypes.c_int),
        ("error", ctypes.c_char_p),
        ("path", ctypes.c_char_p),
    ]


class ForesterContentResult(ctypes.Structure):
    _fields_ = [
        ("success", ctypes.c_int),
        ("error", ctypes.c_char_p),
        ("data", ctypes.POINTER(ctypes.c_char)),
        ("size", ctypes.c_longlong),
    ]


class ForesterLock(ctypes.Structure):
    _fields_ = [
        ("file_path", ctypes.c_char_p),
        ("user", ctypes.c_char_p),
        ("branch", ctypes.c_char_p),
        ("lock_type", ctypes.c_int),
        ("created_at", ctypes.c_longlong),
        ("expires_at", ctypes.c_longlong),
    ]


class ForesterLockList(ctypes.Structure):
    _fields_ = [
        ("count", ctypes.c_int),
        ("locks", ctypes.POINTER(ForesterLock)),
    ]


class ForesterFileEntry(ctypes.Structure):
    _fields_ = [
        ("path", ctypes.c_char_p),
        ("hash", ctypes.c_char_p),
        ("type_", ctypes.c_char_p),  # type_ to avoid Go reserved word
    ]
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            "path": self.path.decode('utf-8') if self.path else "",
            "hash": self.hash.decode('utf-8') if self.hash else "",
            "type": self.type_.decode('utf-8') if self.type_ else "",
        }


class ForesterFileList(ctypes.Structure):
    _fields_ = [
        ("count", ctypes.c_int),
        ("files", ctypes.POINTER(ForesterFileEntry)),
    ]


class ForesterAPI:
    """Python wrapper for Forester C API - Structured version"""
    
    def __init__(self, library_path: Optional[str] = None):
        """
        Initialize Forester API
        
        Args:
            library_path: Path to libforester.so (Linux), libforester.dylib (macOS), 
                         or forester.dll (Windows). If None, tries to find automatically.
        """
        if library_path is None:
            library_path = self._find_library()
        
        if not os.path.exists(library_path):
            raise FileNotFoundError(f"Forester library not found: {library_path}")
        
        self.lib = ctypes.CDLL(library_path)
        self._setup_function_signatures()
    
    def _find_library(self) -> str:
        """Try to find the Forester library"""
        possible_paths = [
            os.path.join(os.path.dirname(__file__), "..", "build", "libforester.so"),
            os.path.join(os.path.dirname(__file__), "..", "build", "libforester.dylib"),
            os.path.join(os.path.dirname(__file__), "..", "build", "forester.dll"),
            "/usr/local/lib/libforester.so",
            "/usr/lib/libforester.so",
            "/opt/DiffMachine/lib/libforester.so",
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                return path
        
        raise FileNotFoundError("Forester library not found. Please specify library_path.")
    
    def _setup_function_signatures(self):
        """Setup ctypes function signatures"""
        # ForesterResult functions
        self.lib.ForesterInit.argtypes = [ctypes.c_char_p]
        self.lib.ForesterInit.restype = ctypes.POINTER(ForesterResult)
        
        self.lib.ForesterAdd.argtypes = [ctypes.c_char_p, ctypes.c_char_p]
        self.lib.ForesterAdd.restype = ctypes.POINTER(ForesterResult)
        
        self.lib.ForesterCreateCommit.argtypes = [
            ctypes.c_char_p,
            ctypes.c_char_p,
            ctypes.c_char_p,
            ctypes.c_int,
        ]
        self.lib.ForesterCreateCommit.restype = ctypes.POINTER(ForesterResult)

        if hasattr(self.lib, "ForesterCreateBranch"):
            self.lib.ForesterCreateBranch.argtypes = [
                ctypes.c_char_p,
                ctypes.c_char_p,
                ctypes.c_char_p,
            ]
            self.lib.ForesterCreateBranch.restype = ctypes.POINTER(ForesterResult)

        if hasattr(self.lib, "ForesterDeleteBranch"):
            self.lib.ForesterDeleteBranch.argtypes = [
                ctypes.c_char_p,
                ctypes.c_char_p,
            ]
            self.lib.ForesterDeleteBranch.restype = ctypes.POINTER(ForesterResult)

        if hasattr(self.lib, "ForesterRenameBranch"):
            self.lib.ForesterRenameBranch.argtypes = [
                ctypes.c_char_p,
                ctypes.c_char_p,
                ctypes.c_char_p,
            ]
            self.lib.ForesterRenameBranch.restype = ctypes.POINTER(ForesterResult)

        if hasattr(self.lib, "ForesterRevertCommit"):
            self.lib.ForesterRevertCommit.argtypes = [
                ctypes.c_char_p,
                ctypes.c_char_p,
            ]
            self.lib.ForesterRevertCommit.restype = ctypes.POINTER(ForesterResult)

        if hasattr(self.lib, "ForesterResetCommit"):
            self.lib.ForesterResetCommit.argtypes = [
                ctypes.c_char_p,
                ctypes.c_char_p,
                ctypes.c_char_p,
            ]
            self.lib.ForesterResetCommit.restype = ctypes.POINTER(ForesterResult)
        
        self.lib.ForesterSwitch.argtypes = [ctypes.c_char_p, ctypes.c_char_p, ctypes.c_int]
        self.lib.ForesterSwitch.restype = ctypes.POINTER(ForesterResult)
        
        # Structured functions
        self.lib.ForesterGetStatus.argtypes = [ctypes.c_char_p]
        self.lib.ForesterGetStatus.restype = ctypes.POINTER(ForesterStatus)
        
        self.lib.ForesterGetLog.argtypes = [ctypes.c_char_p, ctypes.c_int, ctypes.c_char_p]
        self.lib.ForesterGetLog.restype = ctypes.POINTER(ForesterCommitList)
        
        self.lib.ForesterGetBranches.argtypes = [ctypes.c_char_p]
        self.lib.ForesterGetBranches.restype = ctypes.POINTER(ForesterBranchList)
        
        self.lib.ForesterGetCommit.argtypes = [ctypes.c_char_p, ctypes.c_char_p]
        self.lib.ForesterGetCommit.restype = ctypes.POINTER(ForesterCommit)

        self.lib.ForesterCompareExtract.argtypes = [
            ctypes.c_char_p,
            ctypes.c_char_p,
            ctypes.c_int,
            ctypes.c_char_p,
        ]
        self.lib.ForesterCompareExtract.restype = ctypes.POINTER(ForesterPathResult)

        self.lib.ForesterGC.argtypes = [ctypes.c_char_p, ctypes.c_int, ctypes.c_int]
        self.lib.ForesterGC.restype = ctypes.POINTER(ForesterGcResult)

        self.lib.ForesterRebuild.argtypes = [ctypes.c_char_p]
        self.lib.ForesterRebuild.restype = ctypes.POINTER(ForesterRebuildResult)

        self.lib.ForesterListLocks.argtypes = [ctypes.c_char_p]
        self.lib.ForesterListLocks.restype = ctypes.POINTER(ForesterLockList)

        self.lib.ForesterAcquireLock.argtypes = [
            ctypes.c_char_p,
            ctypes.c_char_p,
            ctypes.c_char_p,
            ctypes.c_int,
            ctypes.c_int,
        ]
        self.lib.ForesterAcquireLock.restype = ctypes.POINTER(ForesterResult)

        self.lib.ForesterReleaseLock.argtypes = [
            ctypes.c_char_p,
            ctypes.c_char_p,
            ctypes.c_char_p,
        ]
        self.lib.ForesterReleaseLock.restype = ctypes.POINTER(ForesterResult)
        
        # Free functions
        self.lib.ForesterFreeResult.argtypes = [ctypes.POINTER(ForesterResult)]
        self.lib.ForesterFreeResult.restype = None
        
        self.lib.ForesterFreeStatus.argtypes = [ctypes.POINTER(ForesterStatus)]
        self.lib.ForesterFreeStatus.restype = None
        
        self.lib.ForesterFreeCommit.argtypes = [ctypes.POINTER(ForesterCommit)]
        self.lib.ForesterFreeCommit.restype = None
        
        self.lib.ForesterFreeCommitList.argtypes = [ctypes.POINTER(ForesterCommitList)]
        self.lib.ForesterFreeCommitList.restype = None
        
        self.lib.ForesterFreeBranchList.argtypes = [ctypes.POINTER(ForesterBranchList)]
        self.lib.ForesterFreeBranchList.restype = None

        self.lib.ForesterFreeGcResult.argtypes = [ctypes.POINTER(ForesterGcResult)]
        self.lib.ForesterFreeGcResult.restype = None

        self.lib.ForesterFreeRebuildResult.argtypes = [ctypes.POINTER(ForesterRebuildResult)]
        self.lib.ForesterFreeRebuildResult.restype = None

        self.lib.ForesterFreePathResult.argtypes = [ctypes.POINTER(ForesterPathResult)]
        self.lib.ForesterFreePathResult.restype = None

        if hasattr(self.lib, "ForesterFreeContentResult"):
            self.lib.ForesterFreeContentResult.argtypes = [ctypes.POINTER(ForesterContentResult)]
            self.lib.ForesterFreeContentResult.restype = None

        self.lib.ForesterFreeLockList.argtypes = [ctypes.POINTER(ForesterLockList)]
        self.lib.ForesterFreeLockList.restype = None
        
        # Object functions
        self.lib.ForesterAddObject.argtypes = [
            ctypes.c_char_p,  # repoPath
            ctypes.c_char_p,  # editorType
            ctypes.c_char_p,  # filePath
            ctypes.c_char_p,  # objectName
            ctypes.c_char_p,  # objectType
            ctypes.c_char_p,  # commitHash
            ctypes.c_char_p,  # objectDataJSON
            ctypes.c_char_p,  # tagsJSON
            ctypes.c_char_p,  # metadataJSON
        ]
        self.lib.ForesterAddObject.restype = ctypes.POINTER(ForesterResult)
        
        self.lib.ForesterGetObject.argtypes = [
            ctypes.c_char_p,  # repoPath
            ctypes.c_char_p,  # commitHash
            ctypes.c_char_p,  # filePath
            ctypes.c_char_p,  # objectName
        ]
        self.lib.ForesterGetObject.restype = ctypes.POINTER(ForesterObject)
        
        self.lib.ForesterFreeObject.argtypes = [ctypes.POINTER(ForesterObject)]
        self.lib.ForesterFreeObject.restype = None
        
        self.lib.ForesterGetObjectsByCommit.argtypes = [
            ctypes.c_char_p,  # repoPath
            ctypes.c_char_p,  # commitHash
        ]
        self.lib.ForesterGetObjectsByCommit.restype = ctypes.POINTER(ForesterObjectList)
        
        if hasattr(self.lib, "ForesterGetObjectsByFile"):
            self.lib.ForesterGetObjectsByFile.argtypes = [
                ctypes.c_char_p,  # repoPath
                ctypes.c_char_p,  # filePath
                ctypes.c_char_p,  # commitHash
            ]
            self.lib.ForesterGetObjectsByFile.restype = ctypes.POINTER(ForesterObjectList)
        
        self.lib.ForesterFreeObjectList.argtypes = [ctypes.POINTER(ForesterObjectList)]
        self.lib.ForesterFreeObjectList.restype = None
        
        # Commit files functions
        self._has_commit_file_content = hasattr(self.lib, "ForesterGetCommitFileContent")
        if self._has_commit_file_content:
            self.lib.ForesterGetCommitFileContent.argtypes = [
                ctypes.c_char_p,  # repoPath
                ctypes.c_char_p,  # commitHash
                ctypes.c_char_p,  # filePath
            ]
            self.lib.ForesterGetCommitFileContent.restype = ctypes.POINTER(ForesterContentResult)

        self.lib.ForesterGetCommitFiles.argtypes = [
            ctypes.c_char_p,  # repoPath
            ctypes.c_char_p,  # commitHash
        ]
        self.lib.ForesterGetCommitFiles.restype = ctypes.POINTER(ForesterFileList)
        
        self.lib.ForesterFreeFileList.argtypes = [ctypes.POINTER(ForesterFileList)]
        self.lib.ForesterFreeFileList.restype = None
        
        self.lib.ForesterAddTagToObject.argtypes = [
            ctypes.c_char_p,  # repoPath
            ctypes.c_char_p,  # commitHash
            ctypes.c_char_p,  # filePath
            ctypes.c_char_p,  # objectName
            ctypes.c_char_p,  # tag
        ]
        self.lib.ForesterAddTagToObject.restype = ctypes.POINTER(ForesterResult)
        
        self.lib.ForesterRemoveTagFromObject.argtypes = [
            ctypes.c_char_p,  # repoPath
            ctypes.c_char_p,  # commitHash
            ctypes.c_char_p,  # filePath
            ctypes.c_char_p,  # objectName
            ctypes.c_char_p,  # tag
        ]
        self.lib.ForesterRemoveTagFromObject.restype = ctypes.POINTER(ForesterResult)

        if hasattr(self.lib, "ForesterDeleteObject"):
            self.lib.ForesterDeleteObject.argtypes = [
                ctypes.c_char_p,  # repoPath
                ctypes.c_char_p,  # commitHash
                ctypes.c_char_p,  # filePath
                ctypes.c_char_p,  # objectName
            ]
            self.lib.ForesterDeleteObject.restype = ctypes.POINTER(ForesterResult)

        if hasattr(self.lib, "ForesterDeleteObjectsByFile"):
            self.lib.ForesterDeleteObjectsByFile.argtypes = [
                ctypes.c_char_p,  # repoPath
                ctypes.c_char_p,  # commitHash
                ctypes.c_char_p,  # filePath
            ]
            self.lib.ForesterDeleteObjectsByFile.restype = ctypes.POINTER(ForesterResult)
        
        self.lib.ForesterSetObjectMetadata.argtypes = [
            ctypes.c_char_p,  # repoPath
            ctypes.c_char_p,  # commitHash
            ctypes.c_char_p,  # filePath
            ctypes.c_char_p,  # objectName
            ctypes.c_char_p,  # key
            ctypes.c_char_p,  # value
        ]
        self.lib.ForesterSetObjectMetadata.restype = ctypes.POINTER(ForesterResult)
    
    def init(self, repo_path: str) -> Dict[str, Any]:
        """Initialize a Forester repository"""
        result_ptr = self.lib.ForesterInit(repo_path.encode('utf-8'))
        if not result_ptr:
            return {"success": False, "error": "Function returned NULL"}
        
        result = result_ptr.contents
        success = bool(result.success)
        error = result.error.decode('utf-8') if result.error else None
        self.lib.ForesterFreeResult(result_ptr)
        
        if success:
            return {"success": True}
        else:
            return {"success": False, "error": error}
    
    def add(self, repo_path: str, files: List[str] = None) -> Dict[str, Any]:
        """Add files to staging area"""
        if files is None:
            files = ["."]
        files_json = json.dumps(files)
        result_ptr = self.lib.ForesterAdd(repo_path.encode('utf-8'), files_json.encode('utf-8'))
        if not result_ptr:
            return {"success": False, "error": "Function returned NULL"}
        
        result = result_ptr.contents
        success = bool(result.success)
        error = result.error.decode('utf-8') if result.error else None
        self.lib.ForesterFreeResult(result_ptr)
        
        if success:
            return {"success": True}
        else:
            return {"success": False, "error": error}
    
    def commit(
        self,
        repo_path: str,
        message: str,
        author: Optional[str] = None,
        amend: bool = False
    ) -> Dict[str, Any]:
        """Create a commit"""
        author_bytes = author.encode('utf-8') if author else None
        result_ptr = self.lib.ForesterCreateCommit(
            repo_path.encode('utf-8'),
            message.encode('utf-8'),
            author_bytes,
            1 if amend else 0
        )
        if not result_ptr:
            return {"success": False, "error": "Function returned NULL"}
        
        result = result_ptr.contents
        success = bool(result.success)
        error = result.error.decode('utf-8') if result.error else None
        self.lib.ForesterFreeResult(result_ptr)
        
        if success:
            return {"success": True}
        else:
            return {"success": False, "error": error}

    def create_branch(
        self,
        repo_path: str,
        branch_name: str,
        commit_hash: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a branch"""
        if not hasattr(self.lib, "ForesterCreateBranch"):
            return {"success": False, "error": "Branch creation API not available"}
        commit_hash_bytes = commit_hash.encode('utf-8') if commit_hash else None
        result_ptr = self.lib.ForesterCreateBranch(
            repo_path.encode('utf-8'),
            branch_name.encode('utf-8'),
            commit_hash_bytes,
        )
        if not result_ptr:
            return {"success": False, "error": "Function returned NULL"}

        result = result_ptr.contents
        success = bool(result.success)
        error = result.error.decode('utf-8') if result.error else None
        self.lib.ForesterFreeResult(result_ptr)

        if success:
            return {"success": True}
        return {"success": False, "error": error}

    def delete_branch(self, repo_path: str, branch_name: str) -> Dict[str, Any]:
        """Delete a branch"""
        if not hasattr(self.lib, "ForesterDeleteBranch"):
            return {"success": False, "error": "Branch deletion API not available"}
        result_ptr = self.lib.ForesterDeleteBranch(
            repo_path.encode('utf-8'),
            branch_name.encode('utf-8'),
        )
        if not result_ptr:
            return {"success": False, "error": "Function returned NULL"}

        result = result_ptr.contents
        success = bool(result.success)
        error = result.error.decode('utf-8') if result.error else None
        self.lib.ForesterFreeResult(result_ptr)

        if success:
            return {"success": True}
        return {"success": False, "error": error}

    def rename_branch(self, repo_path: str, old_name: str, new_name: str) -> Dict[str, Any]:
        """Rename a branch"""
        if not hasattr(self.lib, "ForesterRenameBranch"):
            return {"success": False, "error": "Branch rename API not available"}
        result_ptr = self.lib.ForesterRenameBranch(
            repo_path.encode('utf-8'),
            old_name.encode('utf-8'),
            new_name.encode('utf-8'),
        )
        if not result_ptr:
            return {"success": False, "error": "Function returned NULL"}

        result = result_ptr.contents
        success = bool(result.success)
        error = result.error.decode('utf-8') if result.error else None
        self.lib.ForesterFreeResult(result_ptr)

        if success:
            return {"success": True}
        return {"success": False, "error": error}

    def revert_commit(self, repo_path: str, commit_hash: str) -> Dict[str, Any]:
        """Revert a commit"""
        if not hasattr(self.lib, "ForesterRevertCommit"):
            return {"success": False, "error": "Revert API not available"}
        result_ptr = self.lib.ForesterRevertCommit(
            repo_path.encode('utf-8'),
            commit_hash.encode('utf-8'),
        )
        if not result_ptr:
            return {"success": False, "error": "Function returned NULL"}

        result = result_ptr.contents
        success = bool(result.success)
        error = result.error.decode('utf-8') if result.error else None
        self.lib.ForesterFreeResult(result_ptr)

        if success:
            return {"success": True}
        return {"success": False, "error": error}

    def reset_commit(self, repo_path: str, commit_hash: str, mode: str = "mixed") -> Dict[str, Any]:
        """Reset to a commit"""
        if not hasattr(self.lib, "ForesterResetCommit"):
            return {"success": False, "error": "Reset API not available"}
        mode_bytes = mode.encode('utf-8') if mode else None
        result_ptr = self.lib.ForesterResetCommit(
            repo_path.encode('utf-8'),
            commit_hash.encode('utf-8'),
            mode_bytes,
        )
        if not result_ptr:
            return {"success": False, "error": "Function returned NULL"}

        result = result_ptr.contents
        success = bool(result.success)
        error = result.error.decode('utf-8') if result.error else None
        self.lib.ForesterFreeResult(result_ptr)

        if success:
            return {"success": True}
        return {"success": False, "error": error}
    
    def get_status(self, repo_path: str) -> Optional[ForesterStatus]:
        """Get repository status (structured)"""
        status_ptr = self.lib.ForesterGetStatus(repo_path.encode('utf-8'))
        if not status_ptr:
            return None
        
        status = status_ptr.contents
        
        # Extract strings and arrays before freeing
        def safe_decode(ptr):
            if not ptr:
                return ""
            try:
                return ptr.decode('utf-8')
            except:
                return ""
        
        def extract_array(arr_ptr, count):
            if not arr_ptr or count == 0:
                return []
            result = []
            # Access array elements directly
            arr = ctypes.cast(arr_ptr, ctypes.POINTER(ctypes.c_char_p * count)).contents
            for i in range(count):
                if arr[i]:
                    try:
                        result.append(arr[i].decode('utf-8'))
                    except:
                        pass
            return result
        
        # Extract all data
        current_branch = safe_decode(status.current_branch)
        head_commit = safe_decode(status.head_commit)
        staged_new = extract_array(status.staged_new_files, status.staged_new_count)
        staged_modified = extract_array(status.staged_modified_files, status.staged_modified_count)
        staged_deleted = extract_array(status.staged_deleted_files, status.staged_deleted_count)
        unstaged_modified = extract_array(status.unstaged_modified_files, status.unstaged_modified_count)
        unstaged_deleted = extract_array(status.unstaged_deleted_files, status.unstaged_deleted_count)
        untracked = extract_array(status.untracked_files, status.untracked_count)
        
        # Free the C structure
        self.lib.ForesterFreeStatus(status_ptr)
        
        # Create a Python-friendly status object
        class StatusWrapper:
            def __init__(self, data):
                self.current_branch = data['current_branch']
                self.head_commit = data['head_commit']
                self.staged_new_files = data['staged_new']
                self.staged_modified_files = data['staged_modified']
                self.staged_deleted_files = data['staged_deleted']
                self.unstaged_modified_files = data['unstaged_modified']
                self.unstaged_deleted_files = data['unstaged_deleted']
                self.untracked_files = data['untracked']
            
            def to_dict(self):
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
        
        return StatusWrapper({
            'current_branch': current_branch,
            'head_commit': head_commit,
            'staged_new': staged_new,
            'staged_modified': staged_modified,
            'staged_deleted': staged_deleted,
            'unstaged_modified': unstaged_modified,
            'unstaged_deleted': unstaged_deleted,
            'untracked': untracked,
        })
    
    def get_log(self, repo_path: str, max_count: int = 0, branch: Optional[str] = None) -> Optional[List[ForesterCommit]]:
        """Get commit log (structured)"""
        branch_bytes = branch.encode('utf-8') if branch else None
        list_ptr = self.lib.ForesterGetLog(repo_path.encode('utf-8'), max_count, branch_bytes)
        if not list_ptr:
            return None
        
        try:
            commit_list = list_ptr.contents
        except Exception as e:
            # If we can't access contents, free and return None
            self.lib.ForesterFreeCommitList(list_ptr)
            return None
        
        commits = []
        
        def safe_decode(ptr):
            if not ptr:
                return ""
            try:
                return ptr.decode('utf-8')
            except:
                return ""
        
        # Validate commit_list structure
        if not hasattr(commit_list, 'count') or not hasattr(commit_list, 'commits'):
            self.lib.ForesterFreeCommitList(list_ptr)
            return None
        
        commit_count = commit_list.count
        if commit_count < 0 or commit_count > 10000:  # Sanity check
            self.lib.ForesterFreeCommitList(list_ptr)
            return None
        
        # Create wrapper
        class CommitWrapper:
            def __init__(self, data):
                self.hash = data['hash']
                self.parent_hash = data['parent_hash']
                self.parent_hashes = data['parent_hashes']
                self.tree_hash = data['tree_hash']
                self.author = data['author']
                self.message = data['message']
                self.timestamp = data['timestamp']
                self.type = data['type']
            
            def to_dict(self):
                return {
                    "hash": self.hash,
                    "parent_hash": self.parent_hash,
                    "parent_hashes": self.parent_hashes,
                    "tree_hash": self.tree_hash,
                    "author": self.author,
                    "message": self.message,
                    "timestamp": self.timestamp,
                    "type": self.type,
                }
        
        # Extract commits before freeing
        try:
            for i in range(commit_count):
                # Validate commits pointer
                if not commit_list.commits:
                    break
                
                try:
                    # Access commit by index
                    commit_addr = ctypes.addressof(commit_list.commits.contents) + i * ctypes.sizeof(ForesterCommit)
                    commit = ctypes.cast(commit_addr, ctypes.POINTER(ForesterCommit)).contents
                except (ValueError, TypeError, AttributeError) as e:
                    # Skip invalid commit
                    continue
                
                # Extract parent hashes array
                parent_hashes = []
                try:
                    if commit.parent_hashes and commit.parent_count > 0:
                        # Validate parent_count
                        if commit.parent_count > 100:  # Sanity check
                            commit.parent_count = 0
                        else:
                            arr = ctypes.cast(commit.parent_hashes, ctypes.POINTER(ctypes.c_char_p * commit.parent_count)).contents
                            for j in range(commit.parent_count):
                                if arr[j]:
                                    try:
                                        parent_hashes.append(arr[j].decode('utf-8'))
                                    except:
                                        pass
                except (ValueError, TypeError, AttributeError):
                    # Ignore parent_hashes if invalid
                    pass
                
                # Safely extract commit data
                try:
                    commits.append(CommitWrapper({
                        'hash': safe_decode(commit.hash) if commit.hash else '',
                        'parent_hash': safe_decode(commit.parent_hash) if commit.parent_hash else '',
                        'parent_hashes': parent_hashes,
                        'tree_hash': safe_decode(commit.tree_hash) if commit.tree_hash else '',
                        'author': safe_decode(commit.author) if commit.author else '',
                        'message': safe_decode(commit.message) if commit.message else '',
                        'timestamp': getattr(commit, 'timestamp', 0),
                        'type': getattr(commit, 'type', 0),
                    }))
                except (ValueError, TypeError, AttributeError) as e:
                    # Skip commit if we can't extract data
                    continue
        except Exception as e:
            # If anything goes wrong, free memory and return None
            self.lib.ForesterFreeCommitList(list_ptr)
            return None
        
        # Free memory after extracting all data
        try:
            self.lib.ForesterFreeCommitList(list_ptr)
        except Exception:
            # Ignore errors during cleanup
            pass
        
        return commits
    
    def get_branches(self, repo_path: str) -> Optional[List[ForesterBranch]]:
        """Get list of branches (structured)"""
        list_ptr = self.lib.ForesterGetBranches(repo_path.encode('utf-8'))
        if not list_ptr:
            return None
        
        branch_list = list_ptr.contents
        branches = []
        
        def safe_decode(ptr):
            if not ptr:
                return ""
            try:
                return ptr.decode('utf-8')
            except:
                return ""
        
        # Extract branches before freeing
        for i in range(branch_list.count):
            # Access branch by index
            branch_addr = ctypes.addressof(branch_list.branches.contents) + i * ctypes.sizeof(ForesterBranch)
            branch = ctypes.cast(branch_addr, ctypes.POINTER(ForesterBranch)).contents
            
            # Create wrapper
            class BranchWrapper:
                def __init__(self, data):
                    self.name = data['name']
                    self.commit_hash = data['commit_hash']
                    self.created_at = data['created_at']
                    self.is_current = data['is_current']
                
                def to_dict(self):
                    return {
                        "name": self.name,
                        "commit_hash": self.commit_hash,
                        "created_at": self.created_at,
                        "is_current": self.is_current,
                    }
            
            branches.append(BranchWrapper({
                'name': safe_decode(branch.name),
                'commit_hash': safe_decode(branch.commit_hash),
                'created_at': branch.created_at,
                'is_current': bool(branch.is_current),
            }))
        
        self.lib.ForesterFreeBranchList(list_ptr)
        return branches
    
    def get_commit(self, repo_path: str, hash: str) -> Optional[ForesterCommit]:
        """Get a single commit by hash (structured)"""
        # Handle both str and bytes
        if isinstance(hash, bytes):
            hash_str = hash.decode('utf-8')
        else:
            hash_str = hash
        
        commit_ptr = self.lib.ForesterGetCommit(repo_path.encode('utf-8'), hash_str.encode('utf-8'))
        if not commit_ptr:
            return None
        
        commit = commit_ptr.contents
        
        def safe_decode(ptr):
            if not ptr:
                return ""
            try:
                return ptr.decode('utf-8')
            except:
                return ""
        
        # Extract parent hashes array
        parent_hashes = []
        if commit.parent_hashes and commit.parent_count > 0:
            arr = ctypes.cast(commit.parent_hashes, ctypes.POINTER(ctypes.c_char_p * commit.parent_count)).contents
            for j in range(commit.parent_count):
                if arr[j]:
                    try:
                        parent_hashes.append(arr[j].decode('utf-8'))
                    except:
                        pass
        
        # Free the C structure
        self.lib.ForesterFreeCommit(commit_ptr)
        
        # Create wrapper
        class CommitWrapper:
            def __init__(self, data):
                self.hash = data['hash']
                self.parent_hash = data['parent_hash']
                self.parent_hashes = data['parent_hashes']
                self.tree_hash = data['tree_hash']
                self.author = data['author']
                self.message = data['message']
                self.timestamp = data['timestamp']
                self.type = data['type']
            
            def to_dict(self):
                return {
                    "hash": self.hash,
                    "parent_hash": self.parent_hash,
                    "parent_hashes": self.parent_hashes,
                    "tree_hash": self.tree_hash,
                    "author": self.author,
                    "message": self.message,
                    "timestamp": self.timestamp,
                    "type": self.type,
                }
        
        return CommitWrapper({
            'hash': safe_decode(commit.hash),
            'parent_hash': safe_decode(commit.parent_hash),
            'parent_hashes': parent_hashes,
            'tree_hash': safe_decode(commit.tree_hash),
            'author': safe_decode(commit.author),
            'message': safe_decode(commit.message),
            'timestamp': commit.timestamp,
            'type': commit.type,
        })
    
    def switch(self, repo_path: str, target: str, auto_stash: bool = False) -> Dict[str, Any]:
        """Switch branch or commit"""
        result_ptr = self.lib.ForesterSwitch(
            repo_path.encode('utf-8'),
            target.encode('utf-8'),
            1 if auto_stash else 0
        )
        if not result_ptr:
            return {"success": False, "error": "Function returned NULL"}
        
        result = result_ptr.contents
        success = bool(result.success)
        error = result.error.decode('utf-8') if result.error else None
        self.lib.ForesterFreeResult(result_ptr)
        
        if success:
            return {"success": True}
        else:
            return {"success": False, "error": error}

    def compare_extract(
        self,
        repo_path: str,
        commit_hash: str,
        cleanup: bool = False,
        editor_path: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Extract commit to tmp_review or cleanup."""
        editor = editor_path if editor_path else ""
        result_ptr = self.lib.ForesterCompareExtract(
            repo_path.encode('utf-8'),
            commit_hash.encode('utf-8'),
            1 if cleanup else 0,
            editor.encode('utf-8'),
        )
        if not result_ptr:
            return {"success": False, "error": "Function returned NULL"}

        result = result_ptr.contents
        success = bool(result.success)
        error = result.error.decode('utf-8') if result.error else None
        path = result.path.decode('utf-8') if result.path else None
        self.lib.ForesterFreePathResult(result_ptr)

        if success:
            return {"success": True, "path": path}
        return {"success": False, "error": error}

    def gc(self, repo_path: str, dry_run: bool = False, reflog_expire_days: int = 90) -> Dict[str, Any]:
        """Run garbage collection."""
        result_ptr = self.lib.ForesterGC(
            repo_path.encode('utf-8'),
            1 if dry_run else 0,
            int(reflog_expire_days),
        )
        if not result_ptr:
            return {"success": False, "error": "Function returned NULL"}

        result = result_ptr.contents
        success = bool(result.success)
        error = result.error.decode('utf-8') if result.error else None
        data = {
            "commits_deleted": int(result.commits_deleted),
            "trees_deleted": int(result.trees_deleted),
            "blobs_deleted": int(result.blobs_deleted),
            "dry_run": bool(result.dry_run),
        }
        self.lib.ForesterFreeGcResult(result_ptr)

        if success:
            return {"success": True, **data}
        return {"success": False, "error": error}

    def rebuild(self, repo_path: str) -> Dict[str, Any]:
        """Rebuild database from storage."""
        result_ptr = self.lib.ForesterRebuild(repo_path.encode('utf-8'))
        if not result_ptr:
            return {"success": False, "error": "Function returned NULL"}

        result = result_ptr.contents
        success = bool(result.success)
        error = result.error.decode('utf-8') if result.error else None
        data = {
            "commits_found": int(result.commits_found),
            "commits_rebuilt": int(result.commits_rebuilt),
            "trees_found": int(result.trees_found),
            "blobs_found": int(result.blobs_found),
        }
        self.lib.ForesterFreeRebuildResult(result_ptr)

        if success:
            return {"success": True, **data}
        return {"success": False, "error": error}

    def list_locks(self, repo_path: str) -> Dict[str, Any]:
        """List locks for current branch."""
        list_ptr = self.lib.ForesterListLocks(repo_path.encode('utf-8'))
        if not list_ptr:
            return {"success": False, "error": "Function returned NULL"}

        lock_list = list_ptr.contents
        locks = []

        def safe_decode(ptr):
            if not ptr:
                return ""
            try:
                return ptr.decode('utf-8')
            except Exception:
                return ""

        for i in range(lock_list.count):
            lock_addr = ctypes.addressof(lock_list.locks.contents) + i * ctypes.sizeof(ForesterLock)
            lock = ctypes.cast(lock_addr, ctypes.POINTER(ForesterLock)).contents
            locks.append({
                "file_path": safe_decode(lock.file_path),
                "user": safe_decode(lock.user),
                "branch": safe_decode(lock.branch),
                "lock_type": int(lock.lock_type),
                "created_at": int(lock.created_at),
                "expires_at": int(lock.expires_at),
            })

        self.lib.ForesterFreeLockList(list_ptr)
        return {"success": True, "locks": locks}

    def acquire_lock(
        self,
        repo_path: str,
        file_path: str,
        user: str,
        lock_type: int = 0,
        expire_hours: int = 0,
    ) -> Dict[str, Any]:
        """Acquire a lock on a file."""
        result_ptr = self.lib.ForesterAcquireLock(
            repo_path.encode('utf-8'),
            file_path.encode('utf-8'),
            user.encode('utf-8'),
            int(lock_type),
            int(expire_hours),
        )
        if not result_ptr:
            return {"success": False, "error": "Function returned NULL"}

        result = result_ptr.contents
        success = bool(result.success)
        error = result.error.decode('utf-8') if result.error else None
        self.lib.ForesterFreeResult(result_ptr)
        if success:
            return {"success": True}
        return {"success": False, "error": error}

    def release_lock(self, repo_path: str, file_path: str, user: str) -> Dict[str, Any]:
        """Release a lock on a file."""
        result_ptr = self.lib.ForesterReleaseLock(
            repo_path.encode('utf-8'),
            file_path.encode('utf-8'),
            user.encode('utf-8'),
        )
        if not result_ptr:
            return {"success": False, "error": "Function returned NULL"}

        result = result_ptr.contents
        success = bool(result.success)
        error = result.error.decode('utf-8') if result.error else None
        self.lib.ForesterFreeResult(result_ptr)
        if success:
            return {"success": True}
        return {"success": False, "error": error}
    
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
        """Add an object to the database."""
        object_data_json = json.dumps(object_data or {})
        tags_json = json.dumps(tags or [])
        metadata_json = json.dumps(metadata or {})
        
        result_ptr = self.lib.ForesterAddObject(
            repo_path.encode('utf-8'),
            editor_type.encode('utf-8'),
            file_path.encode('utf-8'),
            object_name.encode('utf-8'),
            object_type.encode('utf-8'),
            commit_hash.encode('utf-8'),
            object_data_json.encode('utf-8'),
            tags_json.encode('utf-8'),
            metadata_json.encode('utf-8'),
        )
        if not result_ptr:
            return {"success": False, "error": "Function returned NULL"}
        
        result = result_ptr.contents
        success = bool(result.success)
        error = result.error.decode('utf-8') if result.error else None
        self.lib.ForesterFreeResult(result_ptr)
        
        if success:
            return {"success": True}
        return {"success": False, "error": error}
    
    def get_object(
        self,
        repo_path: str,
        commit_hash: str,
        file_path: str,
        object_name: str,
    ) -> Optional[Dict[str, Any]]:
        """Get an object from the database."""
        obj_ptr = self.lib.ForesterGetObject(
            repo_path.encode('utf-8'),
            commit_hash.encode('utf-8'),
            file_path.encode('utf-8'),
            object_name.encode('utf-8'),
        )
        if not obj_ptr:
            return None
        
        obj = obj_ptr.contents
        obj_dict = obj.to_dict()
        self.lib.ForesterFreeObject(obj_ptr)
        
        return obj_dict
    
    def get_objects_by_commit(
        self,
        repo_path: str,
        commit_hash: str,
    ) -> List[Dict[str, Any]]:
        """Get all objects for a commit."""
        list_ptr = self.lib.ForesterGetObjectsByCommit(
            repo_path.encode('utf-8'),
            commit_hash.encode('utf-8'),
        )
        if not list_ptr:
            return []
        
        obj_list = list_ptr.contents
        objects = []
        
        for i in range(obj_list.count):
            obj_addr = ctypes.addressof(obj_list.objects.contents) + i * ctypes.sizeof(ForesterObject)
            obj = ctypes.cast(obj_addr, ctypes.POINTER(ForesterObject)).contents
            objects.append(obj.to_dict())
        
        self.lib.ForesterFreeObjectList(list_ptr)
        return objects
    
    def get_objects_by_file(
        self,
        repo_path: str,
        file_path: str,
        commit_hash: str,
    ) -> List[Dict[str, Any]]:
        """Get all objects for a file in a commit."""
        if not hasattr(self.lib, "ForesterGetObjectsByFile"):
            return []
        list_ptr = self.lib.ForesterGetObjectsByFile(
            repo_path.encode('utf-8'),
            file_path.encode('utf-8'),
            commit_hash.encode('utf-8'),
        )
        if not list_ptr:
            return []
        obj_list = list_ptr.contents
        objects = []
        for i in range(obj_list.count):
            obj_addr = ctypes.addressof(obj_list.objects.contents) + i * ctypes.sizeof(ForesterObject)
            obj = ctypes.cast(obj_addr, ctypes.POINTER(ForesterObject)).contents
            objects.append(obj.to_dict())
        self.lib.ForesterFreeObjectList(list_ptr)
        return objects
    
    def get_commit_files(
        self,
        repo_path: str,
        commit_hash: str,
    ) -> List[Dict[str, Any]]:
        """Get all files from commit tree."""
        list_ptr = self.lib.ForesterGetCommitFiles(
            repo_path.encode('utf-8'),
            commit_hash.encode('utf-8'),
        )
        if not list_ptr:
            return []
        
        file_list = list_ptr.contents
        files = []
        
        for i in range(file_list.count):
            file_addr = ctypes.addressof(file_list.files.contents) + i * ctypes.sizeof(ForesterFileEntry)
            file_entry = ctypes.cast(file_addr, ctypes.POINTER(ForesterFileEntry)).contents
            files.append(file_entry.to_dict())
        
        self.lib.ForesterFreeFileList(list_ptr)
        return files

    def get_commit_file_content(
        self,
        repo_path: str,
        commit_hash: str,
        file_path: str,
    ) -> Dict[str, Any]:
        """Get file content from a commit."""
        if not getattr(self, "_has_commit_file_content", False):
            return {"success": False, "error": "Commit file content API not available"}
        result_ptr = self.lib.ForesterGetCommitFileContent(
            repo_path.encode('utf-8'),
            commit_hash.encode('utf-8'),
            file_path.encode('utf-8'),
        )
        if not result_ptr:
            return {"success": False, "error": "Function returned NULL"}

        result = result_ptr.contents
        success = bool(result.success)
        error = result.error.decode('utf-8') if result.error else None
        content = b""
        if success and result.data and result.size:
            content = ctypes.string_at(result.data, result.size)

        if hasattr(self.lib, "ForesterFreeContentResult"):
            self.lib.ForesterFreeContentResult(result_ptr)

        if success:
            return {"success": True, "content": content}
        return {"success": False, "error": error}
    
    def add_tag_to_object(
        self,
        repo_path: str,
        commit_hash: str,
        file_path: str,
        object_name: str,
        tag: str,
    ) -> Dict[str, Any]:
        """Add a tag to an object."""
        result_ptr = self.lib.ForesterAddTagToObject(
            repo_path.encode('utf-8'),
            commit_hash.encode('utf-8'),
            file_path.encode('utf-8'),
            object_name.encode('utf-8'),
            tag.encode('utf-8'),
        )
        if not result_ptr:
            return {"success": False, "error": "Function returned NULL"}
        
        result = result_ptr.contents
        success = bool(result.success)
        error = result.error.decode('utf-8') if result.error else None
        self.lib.ForesterFreeResult(result_ptr)
        
        if success:
            return {"success": True}
        return {"success": False, "error": error}
    
    def remove_tag_from_object(
        self,
        repo_path: str,
        commit_hash: str,
        file_path: str,
        object_name: str,
        tag: str,
    ) -> Dict[str, Any]:
        """Remove a tag from an object."""
        result_ptr = self.lib.ForesterRemoveTagFromObject(
            repo_path.encode('utf-8'),
            commit_hash.encode('utf-8'),
            file_path.encode('utf-8'),
            object_name.encode('utf-8'),
            tag.encode('utf-8'),
        )
        if not result_ptr:
            return {"success": False, "error": "Function returned NULL"}
        
        result = result_ptr.contents
        success = bool(result.success)
        error = result.error.decode('utf-8') if result.error else None
        self.lib.ForesterFreeResult(result_ptr)
        
        if success:
            return {"success": True}
        return {"success": False, "error": error}
    
    def delete_object(
        self,
        repo_path: str,
        commit_hash: str,
        file_path: str,
        object_name: str,
    ) -> Dict[str, Any]:
        """Delete an object."""
        if not hasattr(self.lib, "ForesterDeleteObject"):
            return {"success": False, "error": "DeleteObject API not available"}
        result_ptr = self.lib.ForesterDeleteObject(
            repo_path.encode('utf-8'),
            commit_hash.encode('utf-8'),
            file_path.encode('utf-8'),
            object_name.encode('utf-8'),
        )
        if not result_ptr:
            return {"success": False, "error": "Function returned NULL"}

        result = result_ptr.contents
        success = bool(result.success)
        error = result.error.decode('utf-8') if result.error else None
        self.lib.ForesterFreeResult(result_ptr)

        if success:
            return {"success": True}
        return {"success": False, "error": error}

    def delete_objects_by_file(
        self,
        repo_path: str,
        commit_hash: str,
        file_path: str,
    ) -> Dict[str, Any]:
        """Delete all objects for a file."""
        if not hasattr(self.lib, "ForesterDeleteObjectsByFile"):
            return {"success": False, "error": "DeleteObjectsByFile API not available"}
        result_ptr = self.lib.ForesterDeleteObjectsByFile(
            repo_path.encode('utf-8'),
            commit_hash.encode('utf-8'),
            file_path.encode('utf-8'),
        )
        if not result_ptr:
            return {"success": False, "error": "Function returned NULL"}

        result = result_ptr.contents
        success = bool(result.success)
        error = result.error.decode('utf-8') if result.error else None
        self.lib.ForesterFreeResult(result_ptr)

        if success:
            return {"success": True}
        return {"success": False, "error": error}

    def set_object_metadata(
        self,
        repo_path: str,
        commit_hash: str,
        file_path: str,
        object_name: str,
        key: str,
        value: str,
    ) -> Dict[str, Any]:
        """Set metadata for an object."""
        result_ptr = self.lib.ForesterSetObjectMetadata(
            repo_path.encode('utf-8'),
            commit_hash.encode('utf-8'),
            file_path.encode('utf-8'),
            object_name.encode('utf-8'),
            key.encode('utf-8'),
            value.encode('utf-8'),
        )
        if not result_ptr:
            return {"success": False, "error": "Function returned NULL"}
        
        result = result_ptr.contents
        success = bool(result.success)
        error = result.error.decode('utf-8') if result.error else None
        self.lib.ForesterFreeResult(result_ptr)
        
        if success:
            return {"success": True}
        return {"success": False, "error": error}


if __name__ == "__main__":
    # Example usage
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python python_bindings_structured.py <repo_path>")
        sys.exit(1)
    
    repo_path = sys.argv[1]
    api = ForesterAPI()
    
    # Test status
    status = api.get_status(repo_path)
    if status:
        print("Status:", json.dumps(status.to_dict(), indent=2))
    
    # Test branches
    branches = api.get_branches(repo_path)
    if branches:
        print("\nBranches:")
        for branch in branches:
            print(f"  {branch.name} ({'current' if branch.is_current else ''})")
