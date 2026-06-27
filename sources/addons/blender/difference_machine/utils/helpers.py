"""
Helper functions for Difference Machine addon.
"""

import time
import bpy
from pathlib import Path
from typing import Optional, Tuple, List, Dict, Any, Union
from ..utils.logging_config import get_logger

logger = get_logger(__name__)

# Constants for path waiting
DEFAULT_PATH_WAIT_TIMEOUT: float = 5.0  # Default timeout in seconds for waiting for paths
DEFAULT_PATH_CHECK_INTERVAL: float = 0.1  # Default interval in seconds for checking path existence

# Constants for commit hash validation
COMMIT_HASH_LENGTH: int = 64  # Full SHA-256 hash length


def normalize_commit_hash(commit_hash: Optional[str]) -> Optional[str]:
    """
    Validate and normalize commit hash to full format (64 characters).
    
    This function validates and normalizes commit hashes to ensure consistency.
    
    Args:
        commit_hash: Commit hash string (must be 64 hex characters)
        
    Returns:
        Normalized commit hash (64 characters, lowercase) or None if input is invalid
    """
    if not commit_hash:
        return None
    
    # Clean whitespace
    hash_str = ''.join(commit_hash.strip().split())
    
    if not hash_str:
        return None
    
    # Validate hex format
    if not all(c in '0123456789abcdefABCDEF' for c in hash_str):
        logger.warning(f"Invalid commit hash format: {hash_str[:16]}...")
        return None
    
    # Normalize to lowercase
    normalized = hash_str.lower()
    
    # Validate length - must be exactly 64 characters
    if len(normalized) != COMMIT_HASH_LENGTH:
        logger.warning(f"Commit hash must be exactly {COMMIT_HASH_LENGTH} characters, got {len(normalized)}: {hash_str[:16]}...")
        return None
    
    return normalized


def wait_for_path(path: Path, timeout: float = DEFAULT_PATH_WAIT_TIMEOUT, interval: float = DEFAULT_PATH_CHECK_INTERVAL, is_file: bool = False) -> bool:
    """
    Wait for a file or directory to appear with timeout.
    
    Args:
        path: Path to wait for
        timeout: Maximum time to wait in seconds (default: 5.0)
        interval: Check interval in seconds (default: 0.1)
        is_file: If True, check for file existence; if False, check for directory
    
    Returns:
        True if path exists within timeout, False otherwise
    """
    waited = 0.0
    while waited < timeout:
        if is_file:
            if path.is_file():
                logger.debug(f"File {path} appeared after {waited:.1f}s")
                return True
        else:
            if path.exists() and path.is_dir():
                logger.debug(f"Directory {path} appeared after {waited:.1f}s")
                return True
        
        time.sleep(interval)
        waited += interval
        if waited % 1.0 < interval:  # Log every second
            logger.debug(f"Waiting for {'file' if is_file else 'directory'} {path}... ({waited:.1f}s)")
    
    logger.warning(f"Timeout waiting for {'file' if is_file else 'directory'} {path} after {timeout}s")
    return False


def find_repository_root(start_path: Path) -> Optional[Path]:
    """
    Find repository root by looking for .DFM directory.
    
    Args:
        start_path: Starting directory path
        
    Returns:
        Path to repository root, or None if not found
    """
    current = Path(start_path).absolute()
    
    while True:
        dfm_path = current / ".DFM"
        if dfm_path.exists() and dfm_path.is_dir():
            return current
        
        parent = current.parent
        if parent == current:
            # Reached filesystem root
            return None
        
        current = parent


def is_repository_initialized(context) -> bool:
    """
    Check if repository is initialized (has .DFM folder).
    
    Args:
        context: Blender context
        
    Returns:
        True if .DFM folder exists, False otherwise
    """
    if not bpy.data.filepath:
        return False
    
    blend_file = Path(bpy.data.filepath)
    project_root = blend_file.parent
    dfm_dir = project_root / ".DFM"
    
    return dfm_dir.exists() and dfm_dir.is_dir()


def get_repository_path() -> Tuple[Optional[Path], Optional[str]]:
    """
    Get repository path for current Blender file.

    Returns:
        Tuple of (repository_path, error_message).
        If successful: (Path, None). If failed: (None, error_message).
    """
    if not bpy.data.filepath:
        return None, "Please save the Blender file first"
    
    blend_file = Path(bpy.data.filepath)
    repo_path = find_repository_root(blend_file.parent)
    
    if not repo_path:
        return None, "Not a Forester repository"
    
    return repo_path, None


def get_addon_preferences(
    context: bpy.types.Context
) -> Any:
    """
    Get addon preferences with fallback to default values.

    Args:
        context: Blender context.

    Returns:
        Addon preferences object or DefaultPreferences instance.
    """
    if context is not None:
        try:
            from .. import preferences
            addon_id = preferences.DifferenceMachinePreferences.bl_idname
            addon = getattr(context.preferences, 'addons', {}).get(addon_id)
            if addon and hasattr(addon, 'preferences'):
                return addon.preferences
        except (KeyError, AttributeError, ImportError, TypeError):
            pass

    # Fallback: return a simple object with default values
    class DefaultPreferences:
        default_author = "Unknown"
        reflog_expire_days = 90
        gc_schedule_enabled = False
        gc_schedule_hour = 2
        gc_schedule_minute = 0
        gc_schedule_interval_days = 7
        gc_last_run = 0.0
        auto_save_enabled = False
        auto_save_interval = 5
    
    return DefaultPreferences()


def repo_relative_path(repo_path: Path, file_path: Union[Path, str]) -> str:
    """Return a repo-relative path with forward slashes for Forester API calls."""
    path = Path(file_path)
    if not path.is_absolute():
        return str(path).replace("\\", "/")

    resolved_repo = Path(repo_path).resolve()
    try:
        return str(path.resolve().relative_to(resolved_repo)).replace("\\", "/")
    except ValueError:
        return path.name


def author_display_name(formatted: str) -> str:
    trimmed = (formatted or "").strip()
    lt = trimmed.rfind("<")
    gt = trimmed.rfind(">")
    if lt >= 0 and gt > lt:
        return trimmed[:lt].strip()
    return trimmed


def format_author_name(name: str, email: str = "") -> str:
    trimmed_name = (name or "").strip()
    trimmed_email = (email or "").strip()
    if trimmed_name and trimmed_email:
        return f"{trimmed_name} <{trimmed_email}>"
    if trimmed_email:
        return f"<{trimmed_email}>"
    return trimmed_name or "Unknown"


def get_lock_author(context: bpy.types.Context) -> str:
    prefs = get_addon_preferences(context)
    name = getattr(prefs, "default_author", None) or "Unknown"
    email = getattr(prefs, "user_email", None) or ""
    return format_author_name(name, email)


def is_lock_owner(lock_user: str, current_author: str) -> bool:
    if not lock_user or not current_author:
        return False
    current = current_author.strip()
    if lock_user == current:
        return True
    if lock_user == author_display_name(current):
        return True
    return author_display_name(lock_user) == author_display_name(current)


def find_lock_for_file(
    repo_path: Path,
    file_path: Path,
    locks: List[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    rel = repo_relative_path(repo_path, file_path)
    try:
        target = file_path.resolve()
    except Exception:
        target = Path(file_path)

    for lock in locks:
        lock_fp = (lock.get("file_path") or "").replace("\\", "/")
        if lock_fp == rel:
            return lock
        try:
            if (repo_path / lock_fp).resolve() == target:
                return lock
        except Exception:
            pass
        try:
            if Path(lock_fp).resolve() == target:
                return lock
        except Exception:
            pass
    return None


def get_blender_files() -> List[Path]:
    """
    Get list of all files Blender works with (current .blend and external textures).

    Returns:
        List of paths to .blend file and texture files.
    """
    files = []
    
    # 1. Current .blend file
    if bpy.data.filepath:
        blend_path = Path(bpy.data.filepath)
        if blend_path.exists():
            files.append(blend_path)
    
    # 2. All textures from bpy.data.images
    for image in bpy.data.images:
        # Skip packed textures (they are inside the .blend)
        if image.packed_file:
            continue
            
        if image.filepath:
            try:
                # Get absolute path
                abs_path = Path(bpy.path.abspath(image.filepath))
                if abs_path.exists() and abs_path.is_file():
                    files.append(abs_path)
            except Exception as e:
                logger.debug(f"Failed to resolve texture path {image.filepath}: {e}")
    
    return files


def check_locked_files(repo_path: Path) -> Dict[Path, Dict[str, Any]]:
    """
    Check which Blender files are locked.
    """
    try:
        from .forester_api import get_api

        blender_files = get_blender_files()
        if not blender_files:
            return {}

        api = get_api()
        success, locks, error = api.list_locks(repo_path)
        if not success or not locks:
            return {}

        locked_paths: Dict[Path, Dict[str, Any]] = {}
        for lock in locks:
            try:
                lock_file_path = lock.get('file_path', '')
                if not lock_file_path:
                    continue

                try:
                    lock_path = (repo_path / lock_file_path).resolve()
                except Exception:
                    lock_path = Path(lock_file_path).resolve()

                locked_paths[lock_path] = lock
            except Exception as e:
                logger.debug(f"Failed to resolve lock path {lock.get('file_path')}: {e}")

        result: Dict[Path, Dict[str, Any]] = {}
        for file_path in blender_files:
            try:
                resolved = file_path.resolve()
                if resolved in locked_paths:
                    result[file_path] = locked_paths[resolved]
            except Exception as e:
                logger.debug(f"Failed to resolve file path {file_path}: {e}")

        return result
    except Exception as e:
        logger.error(f"Error checking locked files: {e}", exc_info=True)
        return {}


