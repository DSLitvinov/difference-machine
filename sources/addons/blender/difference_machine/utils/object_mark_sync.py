"""
Sync object merge marks between Blender scene state and Forester manifests.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional, Tuple

import bpy
from bpy.types import Context

from .forester_api import get_api
from .object_data import extract_object_data

logger = logging.getLogger(__name__)


def get_target_commit_hash(context: Context, repo_path: Path) -> str:
    """Commit marks apply to: selected in Compare panel, or HEAD."""
    scene = getattr(context, "scene", None) if context else None
    if scene is not None:
        commits = getattr(scene, "df_commits", [])
        idx = getattr(scene, "df_commit_list_index", 0)
        if commits and 0 <= idx < len(commits):
            commit_hash = getattr(commits[idx], "hash", "") or ""
            if commit_hash.strip():
                return commit_hash.strip()
    api = get_api()
    success, status_data, _ = api.status(repo_path)
    if success and status_data:
        return (status_data.get("head") or "").strip()
    return ""


def get_blend_file_path(repo_path: Path) -> str:
    """Return the current .blend path relative to the repository."""
    if not bpy.data.filepath:
        return ""
    blend_file = Path(bpy.data.filepath)
    try:
        return str(blend_file.relative_to(repo_path)).replace("\\", "/")
    except ValueError:
        return blend_file.name.replace("\\", "/")


def _normalize_file_path(file_path: str) -> str:
    return file_path.strip().replace("\\", "/")


def remove_object_from_forester(
    repo_path: Path,
    commit_hash: str,
    file_path: str,
    object_name: str,
) -> Tuple[bool, str]:
    """Remove one object entry from the Forester manifest."""
    api = get_api()
    ok, error = api.delete_object(repo_path, commit_hash, file_path, object_name)
    if ok:
        return True, ""
    return False, error or "Failed to remove object from Forester"


def sync_object_entry_to_forester(repo_path: Path, entry) -> Tuple[bool, str]:
    """
    Push one scene mark entry to Forester.
    Removes the manifest entry when the object has no tags.
    """
    file_path = _normalize_file_path(entry.file_path or "")
    commit_hash = (entry.commit_hash or "").strip()
    object_name = (entry.object_name or "").strip()
    if not file_path or not commit_hash or not object_name:
        return False, "Invalid object mark entry"

    tags = entry.get_tags()
    if not tags:
        ok, error = remove_object_from_forester(repo_path, commit_hash, file_path, object_name)
        return (True, "") if ok else (False, error)

    blender_obj = bpy.data.objects.get(object_name)
    if not blender_obj:
        return False, f"Object '{object_name}' not found in scene"

    depsgraph = bpy.context.evaluated_depsgraph_get() if bpy.context else None
    object_data = extract_object_data(blender_obj, depsgraph)
    object_data["type"] = blender_obj.type

    api = get_api()
    ok, error = api.add_object(
        repo_path,
        "blender",
        file_path,
        blender_obj.name,
        blender_obj.type,
        commit_hash,
        object_data=object_data,
        tags=tags,
        metadata=entry.get_metadata(),
    )
    if ok:
        return True, ""
    return False, error or "Failed to sync object mark to Forester"


def _remove_scene_entries_for_scope(scene, commit_hash: str, file_path: str) -> None:
    if not hasattr(scene, "df_objects"):
        return
    indices = [
        index
        for index, entry in enumerate(scene.df_objects)
        if entry.commit_hash == commit_hash and _normalize_file_path(entry.file_path or "") == file_path
    ]
    for index in reversed(indices):
        scene.df_objects.remove(index)


def _forester_object_to_entry(scene, obj_data: dict, file_path: str, commit_hash: str) -> None:
    object_name = (obj_data.get("object_name") or "").strip()
    if not object_name:
        return
    tags = obj_data.get("tags") or []
    if not tags:
        return

    entry = scene.df_objects.add()
    entry.object_name = object_name
    entry.object_type = obj_data.get("object_type") or "MESH"
    entry.file_path = file_path
    entry.commit_hash = commit_hash
    entry.set_tags(list(tags))
    metadata = obj_data.get("metadata") or {}
    if isinstance(metadata, dict):
        entry.set_metadata({str(key): str(value) for key, value in metadata.items()})


def ensure_marks_loaded(context: Context, repo_path: Path) -> None:
    """Load tagged objects for the current file/commit from Forester into the scene."""
    scene = context.scene
    if not hasattr(scene, "df_objects"):
        return

    file_path = get_blend_file_path(repo_path)
    if not file_path:
        return

    commit_hash = get_target_commit_hash(context, repo_path)
    if not commit_hash:
        return

    cache_key = f"{commit_hash}:{file_path}"
    if getattr(scene, "df_object_marks_loaded_key", "") == cache_key:
        return

    api = get_api()
    ok, objects, error = api.get_objects_by_file(repo_path, commit_hash, file_path)
    if not ok:
        logger.warning("Failed to load object marks from Forester: %s", error)
        scene.df_object_marks_loaded_key = cache_key
        return

    _remove_scene_entries_for_scope(scene, commit_hash, file_path)
    for obj_data in objects or []:
        if isinstance(obj_data, dict):
            _forester_object_to_entry(scene, obj_data, file_path, commit_hash)

    scene.df_object_marks_loaded_key = cache_key


def invalidate_marks_cache(scene) -> None:
    """Force a reload from Forester on the next panel draw."""
    if hasattr(scene, "df_object_marks_loaded_key"):
        scene.df_object_marks_loaded_key = ""


_pending_marks_load_keys: set[str] = set()


def _tag_view3d_redraw() -> None:
    wm = bpy.context.window_manager if bpy.context else None
    if not wm:
        return
    for window in wm.windows:
        for area in window.screen.areas:
            if area.type == "VIEW_3D":
                area.tag_redraw()


def schedule_ensure_marks_loaded(context: Context, repo_path: Path) -> None:
    """Load marks outside panel draw — RNA must not be mutated during draw()."""
    scene = context.scene
    if not hasattr(scene, "df_objects"):
        return

    file_path = get_blend_file_path(repo_path)
    if not file_path:
        return

    commit_hash = get_target_commit_hash(context, repo_path)
    if not commit_hash:
        return

    cache_key = f"{commit_hash}:{file_path}"
    if getattr(scene, "df_object_marks_loaded_key", "") == cache_key:
        return

    schedule_key = f"{repo_path}:{cache_key}"
    if schedule_key in _pending_marks_load_keys:
        return
    _pending_marks_load_keys.add(schedule_key)

    def _load() -> None:
        _pending_marks_load_keys.discard(schedule_key)
        try:
            ctx = bpy.context
            if ctx and ctx.scene:
                ensure_marks_loaded(ctx, repo_path)
                _tag_view3d_redraw()
        except Exception as exc:
            logger.warning("Failed to load object marks: %s", exc)
        return None

    bpy.app.timers.register(_load, first_interval=0.0)


def find_scene_object_entry(scene, object_name: str, commit_hash: str):
    for entry in scene.df_objects:
        if entry.object_name == object_name and entry.commit_hash == commit_hash:
            return entry
    return None


def remove_scene_object_entry(scene, object_name: str, commit_hash: str) -> None:
    for index, entry in enumerate(scene.df_objects):
        if entry.object_name == object_name and entry.commit_hash == commit_hash:
            scene.df_objects.remove(index)
            return
