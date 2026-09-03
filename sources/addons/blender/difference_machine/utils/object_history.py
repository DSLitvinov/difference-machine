"""
Utilities for comparing object history across commits.
Provides functions to track and compare object changes over time.
"""

import logging
from pathlib import Path
from typing import List, Dict, Any, Optional

from .object_data import (
    load_object_data,
    CHANGE_TYPE_CREATED,
    CHANGE_TYPE_MAJOR,
    CHANGE_TYPE_MINOR,
    CHANGE_TYPE_MOVED,
    CHANGE_TYPE_RECORD,
)
from ..utils.forester_api import get_api

logger = logging.getLogger(__name__)

_HISTORY_CACHE_MAX = 16
_history_cache: Dict[str, List[Dict[str, Any]]] = {}
_history_pending: set[str] = set()


def invalidate_object_history_cache() -> None:
    """Drop cached object-history timelines (call after commit)."""
    _history_cache.clear()
    _history_pending.clear()


def _history_cache_key(obj_name: str, file_path: Path, repo_path: Path) -> str:
    return f"{repo_path}|{file_path}|{obj_name}"


def _store_history_cache(key: str, versions: List[Dict[str, Any]]) -> None:
    if key not in _history_cache and len(_history_cache) >= _HISTORY_CACHE_MAX:
        oldest = next(iter(_history_cache))
        del _history_cache[oldest]
    _history_cache[key] = versions


def schedule_object_history(
    obj_name: str,
    file_path: Path,
    repo_path: Path,
) -> Optional[List[Dict[str, Any]]]:
    """
    Return cached object history, or None if a load is in flight.

    Must not run compare_object_history during Panel.draw — that walks the
    commit log and reads JSON for every commit on every viewport redraw.
    """
    key = _history_cache_key(obj_name, file_path, repo_path)
    cached = _history_cache.get(key)
    if cached is not None:
        return cached
    if key in _history_pending:
        return None

    _history_pending.add(key)

    def _load() -> None:
        try:
            versions = compare_object_history(obj_name, file_path, repo_path)
            _store_history_cache(key, versions)
        except Exception as exc:
            logger.error("Failed to load object history: %s", exc, exc_info=True)
            _store_history_cache(key, [])
        finally:
            _history_pending.discard(key)
        try:
            from .helpers import tag_view3d_redraw
            tag_view3d_redraw()
        except Exception:
            pass
        return None

    try:
        import bpy
        bpy.app.timers.register(_load, first_interval=0.0)
    except Exception:
        _history_pending.discard(key)
        versions = compare_object_history(obj_name, file_path, repo_path)
        _store_history_cache(key, versions)
        return versions
    return None


def compare_object_history(
    obj_name: str,
    file_path: Path,
    repo_path: Path,
    include_change_not_detected: bool = False
) -> List[Dict[str, Any]]:
    """
    Compare object history across commits.
    
    Args:
        obj_name: Object name
        file_path: File path relative to repo
        repo_path: Repository root path
        include_change_not_detected: Include commits where change was not detected
        
    Returns:
        List of version dictionaries with:
        - commit_hash: Commit hash
        - change_type: Type of change (CREATED, MAJOR, MINOR, MOVED, RECORD)
        - details: Change details
        - timestamp: Commit timestamp
        - message: Commit message
        - author: Commit author
    """
    api = get_api()
    
    file_path_str = Path(file_path).as_posix()
    success, commits, error = api.log(repo_path, limit=100, path=file_path_str)
    if not success:
        logger.error(f"Failed to get commit log: {error}")
        return []
    
    file_path_str = str(file_path)
    versions = []
    previous_data = None
    
    for commit in commits:
        commit_hash = commit.get('hash', '')
        if not commit_hash:
            continue
        
        # Load object data for this commit
        commit_data = load_object_data(commit_hash, repo_path)
        if not commit_data:
            if include_change_not_detected:
                versions.append({
                    'commit_hash': commit_hash,
                    'change_type': None,
                    'details': {},
                    'timestamp': commit.get('timestamp', 0),
                    'message': commit.get('message', ''),
                    'author': commit.get('author', ''),
                })
            continue
        
        # Get object data for this file
        file_data = commit_data.get(file_path_str, {})
        obj_data = file_data.get(obj_name)
        
        if not obj_data:
            if include_change_not_detected:
                versions.append({
                    'commit_hash': commit_hash,
                    'change_type': None,
                    'details': {},
                    'timestamp': commit.get('timestamp', 0),
                    'message': commit.get('message', ''),
                    'author': commit.get('author', ''),
                })
            continue
        
        # Determine change type
        change_type = None
        details = {}
        
        if previous_data is None:
            # First occurrence - object was created
            change_type = CHANGE_TYPE_CREATED
            details = {
                'v_count': obj_data.get('v_count', 0),
                'bbox': obj_data.get('bbox'),
            }
        else:
            # Compare with previous version
            prev_v_count = previous_data.get('v_count', 0)
            curr_v_count = obj_data.get('v_count', 0)
            
            prev_matrix = previous_data.get('matrix')
            curr_matrix = obj_data.get('matrix')
            
            prev_bbox = previous_data.get('bbox')
            curr_bbox = obj_data.get('bbox')
            
            # Check for major changes (significant vertex count change)
            v_count_diff = abs(curr_v_count - prev_v_count)
            v_count_change_ratio = v_count_diff / max(prev_v_count, 1) if prev_v_count > 0 else 1.0
            
            if v_count_change_ratio > 0.1:  # More than 10% change
                change_type = CHANGE_TYPE_MAJOR
                details = {
                    'v_count': curr_v_count,
                    'v_count_change': v_count_diff,
                    'v_count_change_ratio': v_count_change_ratio,
                }
            elif v_count_change_ratio > 0.01:  # More than 1% change
                change_type = CHANGE_TYPE_MINOR
                details = {
                    'v_count': curr_v_count,
                    'v_count_change': v_count_diff,
                }
            elif _matrices_different(prev_matrix, curr_matrix):
                # Check if object moved significantly
                if _is_movement_significant(prev_matrix, curr_matrix):
                    change_type = CHANGE_TYPE_MOVED
                    details = {
                        'v_count': curr_v_count,
                        'position_change': True,
                    }
                else:
                    change_type = CHANGE_TYPE_RECORD
                    details = {
                        'v_count': curr_v_count,
                    }
            else:
                change_type = CHANGE_TYPE_RECORD
                details = {
                    'v_count': curr_v_count,
                }
        
        versions.append({
            'commit_hash': commit_hash,
            'change_type': change_type,
            'details': details,
            'timestamp': commit.get('timestamp', 0),
            'message': commit.get('message', ''),
            'author': commit.get('author', ''),
        })
        
        previous_data = obj_data
    
    # Sort from old to new (reverse chronological)
    versions.reverse()
    
    return versions


def _matrices_different(matrix1: Optional[List], matrix2: Optional[List], threshold: float = 0.001) -> bool:
    """Check if two matrices are significantly different."""
    if not matrix1 or not matrix2:
        return matrix1 != matrix2
    
    if len(matrix1) != len(matrix2) or len(matrix1[0]) != len(matrix2[0]):
        return True
    
    for i in range(len(matrix1)):
        for j in range(len(matrix1[i])):
            if abs(matrix1[i][j] - matrix2[i][j]) > threshold:
                return True
    
    return False


def _is_movement_significant(matrix1: Optional[List], matrix2: Optional[List], threshold: float = 0.1) -> bool:
    """Check if object moved significantly (translation changed)."""
    if not matrix1 or not matrix2:
        return False
    
    # Extract translation (last column, first 3 rows)
    trans1 = [matrix1[i][3] for i in range(3)]
    trans2 = [matrix2[i][3] for i in range(3)]
    
    # Calculate distance
    distance = sum((trans1[i] - trans2[i]) ** 2 for i in range(3)) ** 0.5
    
    return distance > threshold
