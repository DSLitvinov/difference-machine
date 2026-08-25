"""
Sync object merge marks between Blender scene state and Forester manifests.
"""

from __future__ import annotations

import logging
import time
from pathlib import Path
from typing import Optional, Tuple

import bpy
from bpy.types import Context

from .forester_api import get_api
from .object_data import extract_object_data

logger = logging.getLogger(__name__)

_HEAD_CACHE_TTL = 5.0
_head_cache: dict[str, tuple[float, str]] = {}


def invalidate_head_cache(repo_path: Optional[Path] = None) -> None:
    """Drop cached HEAD hash (call after branch/commit changes)."""
    if repo_path is None:
        _head_cache.clear()
        return
    _head_cache.pop(str(repo_path), None)


def _hash_from_commit_item(item) -> str:
    raw = (getattr(item, "hash", "") or "").strip()
    if not raw:
        return ""
    try:
        from .helpers import normalize_commit_hash

        return normalize_commit_hash(raw) or ""
    except Exception:
        return raw


def _head_from_scene_lists(scene) -> str:
    """Prefer the commit flagged is_head in Compare lists (no API)."""
    for collection_name in ("df_commits", "df_commits_all"):
        collection = getattr(scene, collection_name, None)
        if collection is None:
            continue
        try:
            items = list(collection)
        except Exception:
            continue
        for item in items:
            if getattr(item, "is_head", False):
                commit_hash = _hash_from_commit_item(item)
                if commit_hash:
                    return commit_hash
    return ""


def _fetch_head_hash(repo_path: Path) -> str:
    """Resolve HEAD via status, then log; never cache empty/failure."""
    cache_key = str(repo_path)
    now = time.monotonic()
    cached = _head_cache.get(cache_key)
    if cached is not None and (now - cached[0]) < _HEAD_CACHE_TTL and cached[1]:
        return cached[1]

    api = get_api()
    success, status_data, error = api.status(repo_path)
    head = ""
    if success and status_data:
        head = (status_data.get("head") or "").strip()
        try:
            from .helpers import normalize_commit_hash

            normalized = normalize_commit_hash(head) if head else None
            if normalized:
                head = normalized
            elif head:
                # Keep raw if already usable length; otherwise clear for log fallback
                if len("".join(head.split())) != 64:
                    logger.warning("status head_commit not a full hash (%s…); trying log", head[:12])
                    head = ""
        except Exception:
            pass

    if not head:
        ok_log, commits, log_error = api.log(repo_path, limit=1)
        if ok_log and commits:
            raw = (commits[0].get("hash") or "").strip()
            try:
                from .helpers import normalize_commit_hash

                head = normalize_commit_hash(raw) or ""
            except Exception:
                head = raw
        elif not success:
            logger.warning("Failed to resolve HEAD for marks: status=%s log=%s", error, log_error)

    if head:
        _head_cache[cache_key] = (now, head)
    else:
        _head_cache.pop(cache_key, None)
    return head


def get_target_commit_hash(context: Context, repo_path: Path) -> str:
    """Commit marks apply to: selected in Compare panel, or HEAD."""
    scene = getattr(context, "scene", None) if context else None
    if scene is not None:
        commits = getattr(scene, "df_commits", None)
        if commits is not None:
            idx = int(getattr(scene, "df_commit_list_index", 0) or 0)
            try:
                count = len(commits)
            except Exception:
                count = 0
            if count > 0 and 0 <= idx < count:
                commit_hash = _hash_from_commit_item(commits[idx])
                if commit_hash:
                    return commit_hash

        head_from_list = _head_from_scene_lists(scene)
        if head_from_list:
            return head_from_list

    return _fetch_head_hash(repo_path)


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


def clear_all_marks_for_scope(context: Context, repo_path: Path) -> Tuple[int, Optional[str]]:
    """Remove all object marks for the current .blend file and target commit."""
    scene = context.scene
    if not hasattr(scene, "df_objects"):
        return 0, "Objects collection not available"

    file_path = get_blend_file_path(repo_path)
    if not file_path:
        return 0, "Save the .blend file inside the repository before clearing marks"

    commit_hash = get_target_commit_hash(context, repo_path)
    if not commit_hash:
        return 0, "No commit selected. Select a commit in Compare panel or ensure HEAD exists."

    norm_file = _normalize_file_path(file_path)
    removed = sum(
        1
        for entry in scene.df_objects
        if entry.commit_hash == commit_hash and _normalize_file_path(entry.file_path or "") == norm_file
    )

    api = get_api()
    ok, error = api.delete_objects_by_file(repo_path, commit_hash, file_path)
    if not ok:
        return 0, error or "Failed to clear marks from Forester"

    _remove_scene_entries_for_scope(scene, commit_hash, file_path)
    invalidate_marks_cache(scene)
    return removed, None
