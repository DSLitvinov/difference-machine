"""
Utilities for extracting and managing object metadata.
Provides functions to extract, save, and load object data for history tracking.
"""

import json
import logging
import os
import tempfile
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from functools import lru_cache

import bpy
import mathutils

logger = logging.getLogger(__name__)

# Change type constants
CHANGE_TYPE_CREATED = "CREATED"
CHANGE_TYPE_MAJOR = "MAJOR"
CHANGE_TYPE_MINOR = "MINOR"
CHANGE_TYPE_MOVED = "MOVED"
CHANGE_TYPE_RECORD = "RECORD"


def _atomic_write_json(path: Path, data: Dict[str, Any]) -> None:
    """Write JSON through a same-directory temp file, then atomically replace."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=str(path.parent))
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write("\n")
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_name, path)
    except Exception:
        try:
            os.unlink(tmp_name)
        except OSError:
            pass
        raise


def extract_object_data(obj: bpy.types.Object, depsgraph: Optional[bpy.types.Depsgraph] = None) -> Dict[str, Any]:
    """
    Extract metadata from an object.
    
    Args:
        obj: Blender object
        depsgraph: Optional depsgraph for accurate evaluation
        
    Returns:
        Dictionary with object metadata:
        - matrix: 4x4 transformation matrix
        - bbox: bounding box (min/max points)
        - v_count: vertex count (for MESH objects)
    """
    data = {
        'matrix': [list(row) for row in obj.matrix_world],
        'bbox': None,
        'v_count': 0,
    }
    
    # Get evaluated object if depsgraph is provided
    eval_obj = obj
    if depsgraph:
        try:
            eval_obj = obj.evaluated_get(depsgraph)
        except Exception as e:
            logger.warning(f"Failed to get evaluated object: {e}")
            eval_obj = obj
    
    # Calculate bounding box
    try:
        if eval_obj.type == 'MESH' and eval_obj.data:
            # Get mesh data
            mesh = eval_obj.data
            if len(mesh.vertices) > 0:
                # Get world space bounding box
                bbox_min = mathutils.Vector((float('inf'), float('inf'), float('inf')))
                bbox_max = mathutils.Vector((float('-inf'), float('-inf'), float('-inf')))
                
                for vertex in mesh.vertices:
                    world_pos = eval_obj.matrix_world @ vertex.co
                    bbox_min.x = min(bbox_min.x, world_pos.x)
                    bbox_min.y = min(bbox_min.y, world_pos.y)
                    bbox_min.z = min(bbox_min.z, world_pos.z)
                    bbox_max.x = max(bbox_max.x, world_pos.x)
                    bbox_max.y = max(bbox_max.y, world_pos.y)
                    bbox_max.z = max(bbox_max.z, world_pos.z)
                
                data['bbox'] = {
                    'min': [bbox_min.x, bbox_min.y, bbox_min.z],
                    'max': [bbox_max.x, bbox_max.y, bbox_max.z],
                }
                
                # Vertex count
                data['v_count'] = len(mesh.vertices)
        elif eval_obj.type in ('CURVE', 'SURFACE', 'FONT'):
            # For curves, surfaces, fonts - use object bounds
            if hasattr(eval_obj, 'bound_box'):
                bbox_corners = [eval_obj.matrix_world @ mathutils.Vector(corner) for corner in eval_obj.bound_box]
                if bbox_corners:
                    bbox_min = mathutils.Vector((
                        min(c.x for c in bbox_corners),
                        min(c.y for c in bbox_corners),
                        min(c.z for c in bbox_corners),
                    ))
                    bbox_max = mathutils.Vector((
                        max(c.x for c in bbox_corners),
                        max(c.y for c in bbox_corners),
                        max(c.z for c in bbox_corners),
                    ))
                    data['bbox'] = {
                        'min': [bbox_min.x, bbox_min.y, bbox_min.z],
                        'max': [bbox_max.x, bbox_max.y, bbox_max.z],
                    }
    except Exception as e:
        logger.warning(f"Failed to calculate bounding box for {obj.name}: {e}")
    
    return data


def save_object_data(commit_hash: str, objects: List[bpy.types.Object], file_path: Path, repo_path: Path) -> bool:
    """
    Save object metadata to JSON file.
    
    Args:
        commit_hash: Commit hash
        objects: List of objects to save
        file_path: File path relative to repo
        repo_path: Repository root path
        
    Returns:
        True if successful, False otherwise
    """
    try:
        # Create objects directory
        objects_dir = repo_path / ".DFM" / "objects"
        objects_dir.mkdir(parents=True, exist_ok=True)
        
        # Get depsgraph for accurate evaluation
        depsgraph = bpy.context.evaluated_depsgraph_get() if bpy.context else None
        
        # Extract data for all objects
        file_path_str = str(file_path)
        objects_data = {}
        
        for obj in objects:
            obj_data = extract_object_data(obj, depsgraph)
            obj_data["type"] = obj.type
            objects_data[obj.name] = obj_data
        
        # Load existing data if file exists
        json_path = objects_dir / f"{commit_hash}_objects.json"
        all_data = {}
        if json_path.exists():
            try:
                with open(json_path, 'r', encoding='utf-8') as f:
                    all_data = json.load(f)
            except Exception as e:
                logger.error(f"Refusing to overwrite unreadable object data: {e}")
                return False
        
        # Update with new data
        if file_path_str not in all_data:
            all_data[file_path_str] = {}
        all_data[file_path_str].update(objects_data)
        
        # Save to JSON
        _atomic_write_json(json_path, all_data)
        load_object_data.cache_clear()
        
        logger.debug(f"Saved object data for {len(objects)} objects to {json_path}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to save object data: {e}", exc_info=True)
        return False


@lru_cache(maxsize=32)
def load_object_data(commit_hash: str, repo_path: Path) -> Optional[Dict[str, Any]]:
    """
    Load object metadata from JSON file.
    
    Uses LRU cache for optimization.
    
    Args:
        commit_hash: Commit hash
        repo_path: Repository root path
        
    Returns:
        Dictionary with object data or None if not found
    """
    try:
        json_path = repo_path / ".DFM" / "objects" / f"{commit_hash}_objects.json"
        if not json_path.exists():
            return None
        
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        return data
        
    except Exception as e:
        logger.warning(f"Failed to load object data: {e}")
        return None


def ensure_objects_for_commit(
    repo_path: Path, commit_hash: str
) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
    """
    Ensure object JSON and DB entries exist for the given commit. If no JSON exists,
    create it from the current Blender scene and sync to Forester DB. Works without
    saving the .blend file — uses in-memory scene. Use for marking (MERGE/DELETE/RENAME)
    and "Sync Objects to DB" on the selected commit.
    Returns:
        (success, data, error_message). On success, data is the object dict for that commit.
    """
    if not commit_hash or not commit_hash.strip():
        return (False, None, "No commit hash")
    from .forester_api import get_api
    api = get_api()
    ch = commit_hash.strip()
    data = load_object_data(ch, repo_path)
    if data and isinstance(data, dict):
        return (True, data, None)
    # No object JSON: create from current scene (no save required) and sync to DB
    if not bpy.data.filepath:
        return (
            False,
            None,
            "No object JSON for this commit. Save .blend in the repo or run Sync Objects to DB for the selected commit.",
        )
    blend_path = Path(bpy.data.filepath)
    try:
        file_path = blend_path.relative_to(repo_path)
    except ValueError:
        file_path = Path(blend_path.name)
    objects_list = list(bpy.data.objects)
    if not objects_list:
        return (
            False,
            None,
            "Scene has no objects. Add objects and run Sync Objects to DB for the selected commit.",
        )
    if not save_object_data(ch, objects_list, file_path, repo_path):
        return (False, None, "Failed to save object data for commit.")
    load_object_data.cache_clear()
    data = load_object_data(ch, repo_path)
    if not data or not isinstance(data, dict):
        return (False, None, "Failed to load object data after saving.")
    for fp, objs in data.items():
        if not isinstance(objs, dict):
            continue
        for obj_name, obj_data in objs.items():
            od = obj_data if isinstance(obj_data, dict) else {}
            api.add_object(
                repo_path,
                "blender",
                str(fp).replace("\\", "/"),
                obj_name,
                od.get("type") or "MESH",
                ch,
                object_data=od,
                tags=[],
                metadata=None,
            )
    logger.info("Created object JSON for commit from current scene and synced to DB.")
    return (True, data, None)


def ensure_objects_for_head(repo_path: Path) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
    """
    Ensure object JSON and DB entries exist for HEAD. Delegates to ensure_objects_for_commit.
    """
    from .forester_api import get_api
    api = get_api()
    ok, status, _ = api.status(repo_path)
    if not ok or not status:
        return (False, None, "Could not get repository status")
    head = (status.get("head") or "").strip()
    if not head:
        return (False, None, "No HEAD commit")
    return ensure_objects_for_commit(repo_path, head)
