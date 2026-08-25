"""
Operators for commit history operations.
"""

import bpy
import datetime
import time
from bpy.types import Operator
from pathlib import Path
from typing import Optional, Tuple
from ..utils.forester_api import get_api
from ..utils.helpers import get_repository_path, wait_for_path, get_addon_preferences
from ..utils.logging_config import get_logger
from ..properties.commit_item import copy_commit_item

logger = get_logger(__name__)


class DF_OT_refresh_history(Operator):
    """Refresh commit history."""
    bl_idname = "df.refresh_history"
    bl_label = "Refresh History"
    bl_description = "Refresh the commit history list"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        repo_path, error_msg = get_repository_path()
        if not repo_path:
            self.report({'ERROR'}, error_msg)
            return {'CANCELLED'}

        api = get_api()
        current_branch = None
        success_status, status_data, _ = api.status(repo_path)
        if success_status and status_data:
            current_branch = status_data.get("branch")
            if current_branch:
                current_branch = current_branch.strip() or None

        branch_to_query = current_branch if current_branch else None
        success, commits, error_msg = api.log(repo_path, branch=branch_to_query, limit=100)

        if not success:
            self.report({'ERROR'}, f"Failed to load history: {error_msg}")
            return {'CANCELLED'}

        current_head = None
        success_status, status_data, _ = api.status(repo_path)
        if success_status and status_data:
            current_head = status_data.get("head")
            if current_head:
                current_head = current_head.strip().lower()

        scene = context.scene
        scene.df_commits_all.clear()

        for commit_data in commits:
            commit_all = scene.df_commits_all.add()
            commit_hash_raw = commit_data.get("hash", "").strip()
            from ..utils.helpers import normalize_commit_hash
            commit_hash = normalize_commit_hash(commit_hash_raw)
            if not commit_hash:
                logger.warning("Invalid commit hash skipped: %s...", commit_hash_raw[:16])
                continue
            commit_all.hash = commit_hash
            commit_all.message = commit_data.get("message", "")
            commit_all.author = commit_data.get("author", "")
            commit_all.tag = commit_data.get("tag", "") or ""
            commit_all.timestamp = commit_data.get("timestamp", 0)
            # Support both screenshot_path (new) and screenshot_hash (old)
            screenshot_path = commit_data.get("screenshot_path", "")
            if screenshot_path:
                commit_all.screenshot_path = screenshot_path
            commit_all.screenshot_hash = commit_data.get("screenshot_hash", "") or screenshot_path  # Fallback for compatibility
            is_head = commit_data.get("is_head", False)
            if not is_head and current_head:
                commit_hash_normalized = commit_hash.lower() if commit_hash else ""
                is_head = (commit_hash_normalized == current_head)
            commit_all.is_head = is_head

        props = scene.df_commit_props
        tag_filter = props.tag_search_filter.strip().lower() if props.tag_search_filter else ""
        scene.df_commits.clear()

        if tag_filter:
            for commit_all in scene.df_commits_all:
                commit_tag = (commit_all.tag or "").strip().lower()
                if tag_filter in commit_tag:
                    commit = scene.df_commits.add()
                    copy_commit_item(commit_all, commit)
        else:
            for commit_all in scene.df_commits_all:
                commit = scene.df_commits.add()
                copy_commit_item(commit_all, commit)

        if scene.df_commit_list_index >= len(scene.df_commits):
            scene.df_commit_list_index = max(0, len(scene.df_commits) - 1)

        if current_branch:
            for branch in scene.df_branches:
                if branch.name == current_branch:
                    branch.commit_count = len(scene.df_commits_all)
                    break

        self.report(
            {'INFO'},
            f"Loaded {len(scene.df_commits_all)} commits"
            + (f" (filtered: {len(scene.df_commits)})" if tag_filter else ""),
        )
        return {'FINISHED'}

class DF_OT_compare_project(Operator):
    """Compare project."""
    bl_idname = "df.compare_project"
    bl_label = "Compare"
    bl_description = "Compare project"
    bl_options = {'REGISTER', 'UNDO'}

    commit_hash: bpy.props.StringProperty(
        name="Commit Hash",
        description="Hash of the commit to compare with",
        default="",
    )

    def execute(self, context):
        if not self.commit_hash:
            self.report({'ERROR'}, "Commit hash required")
            return {'CANCELLED'}

        repo_path, error_msg = get_repository_path()
        if not repo_path:
            self.report({'ERROR'}, error_msg)
            return {'CANCELLED'}

        from ..utils.helpers import normalize_commit_hash
        commit_hash = normalize_commit_hash(self.commit_hash)
        if not commit_hash:
            self.report({'ERROR'}, f"Invalid commit hash: {self.commit_hash[:16]}...")
            return {'CANCELLED'}

        is_active = (
            getattr(context.scene, 'df_project_comparison_active', False) and
            getattr(context.scene, 'df_project_comparison_commit_hash', '') == commit_hash
        )

        api = get_api()
        if is_active:
            success, _, error = api.compare_extract(repo_path, commit_hash, cleanup=True)
            if not success:
                self.report({'WARNING'}, f"Could not clean up: {error}")
            context.scene.df_project_comparison_active = False
            context.scene.df_project_comparison_commit_hash = ""
            return {'FINISHED'}

        blender_exe = bpy.app.binary_path
        if not blender_exe:
            self.report({'ERROR'}, "Could not find Blender executable")
            return {'CANCELLED'}

        success, _, error = api.compare_extract(
            repo_path,
            commit_hash,
            cleanup=False,
            editor_path=blender_exe,
        )
        if not success:
            self.report({'ERROR'}, f"Failed to compare commit: {error}")
            return {'CANCELLED'}

        context.scene.df_project_comparison_active = True
        context.scene.df_project_comparison_commit_hash = commit_hash
        self.report({'INFO'}, f"Opened commit {commit_hash[:16]}... for comparison")
        return {'FINISHED'}


class DF_OT_restore_version(Operator):
    """Restore working directory to selected commit (full overwrite) and reload file."""
    bl_idname = "df.restore_version"
    bl_label = "Restore This Version"
    bl_description = "Restore working folder to this commit (full overwrite), create commit, reload file"
    bl_options = {'REGISTER'}

    commit_hash: bpy.props.StringProperty(
        name="Commit Hash",
        description="Hash of the commit to restore",
        default="",
    )

    def execute(self, context):
        if not self.commit_hash:
            self.report({'ERROR'}, "Commit hash required")
            return {'CANCELLED'}

        repo_path, error_msg = get_repository_path()
        if not repo_path:
            self.report({'ERROR'}, error_msg)
            return {'CANCELLED'}

        if not bpy.data.filepath:
            self.report({'ERROR'}, "Save the Blender file first")
            return {'CANCELLED'}

        from ..utils.helpers import normalize_commit_hash
        commit_hash = normalize_commit_hash(self.commit_hash)
        if not commit_hash:
            self.report({'ERROR'}, f"Invalid commit hash: {self.commit_hash[:16]}...")
            return {'CANCELLED'}

        api = get_api()

        success, error = api.restore_version(repo_path, commit_hash)
        if not success:
            self.report({'ERROR'}, f"Restore failed: {error}")
            return {'CANCELLED'}

        success, add_error = api.add(repo_path, ["."])
        if not success:
            self.report({'ERROR'}, f"Add after restore failed: {add_error}")
            return {'CANCELLED'}

        prefs = get_addon_preferences(context)
        author = getattr(prefs, 'default_author', 'Unknown') or 'Unknown'
        msg_time = datetime.datetime.now().strftime("%d.%m.%Y %H:%M")
        commit_message = f"Restore version {msg_time} from commit {commit_hash[:8]}"
        success, _, commit_error = api.commit(repo_path, commit_message, author=author)
        if not success:
            self.report({'WARNING'}, f"Restore done but commit failed: {commit_error}")
        else:
            self.report({'INFO'}, f"Restored to commit {commit_hash[:8]}, created commit")

        # Reload current file from disk
        try:
            bpy.ops.wm.open_mainfile(filepath=bpy.data.filepath)
        except RuntimeError as e:
            self.report({'WARNING'}, f"Reload file failed: {e}")

        return {'FINISHED'}


_replace_state = {}
_compare_object_state = {}

_DFM_COMPARE_REF_KEY = "dfm_compare_ref"
_DFM_COMPARE_BASE_LOC_KEY = "dfm_compare_base_loc"
_DFM_COMPARE_SOURCE_KEY = "dfm_compare_source"
_DFM_COMPARE_NAME_PREFIX = "DFM_Compare_"
_BLENDER_ID_NAME_MAX_LEN = 63


def _is_compare_reference_object(obj) -> bool:
    """True for objects created by Compare Object (never the scene original)."""
    if obj is None:
        return False
    if obj.get(_DFM_COMPARE_REF_KEY):
        return True
    return obj.name.startswith(_DFM_COMPARE_NAME_PREFIX)


def _iter_compare_reference_objects():
    for obj in bpy.data.objects:
        if _is_compare_reference_object(obj):
            yield obj


def _make_compare_object_name(commit_hash: str, source_name: str) -> str:
    """Build a unique compare object name within Blender's 63-char ID limit."""
    hash_part = commit_hash[:8]
    prefix = f"{_DFM_COMPARE_NAME_PREFIX}{hash_part}_"
    max_tail = max(1, _BLENDER_ID_NAME_MAX_LEN - len(prefix))
    tail = source_name if len(source_name) <= max_tail else source_name[:max_tail]
    compare_name = f"{prefix}{tail}"
    if compare_name not in bpy.data.objects:
        return compare_name
    suffix = 1
    while suffix < 1000:
        suffix_text = f".{suffix:03d}"
        trimmed = source_name[: max(1, max_tail - len(suffix_text))]
        candidate = f"{prefix}{trimmed}{suffix_text}"
        if len(candidate) > _BLENDER_ID_NAME_MAX_LEN:
            candidate = candidate[:_BLENDER_ID_NAME_MAX_LEN]
        if candidate not in bpy.data.objects:
            return candidate
        suffix += 1
    return f"{prefix}{hash_part}"


def _mark_as_compare_reference(
    linked_obj,
    commit_hash: str,
    source_name: str,
    base_location: Tuple[float, float, float],
) -> str:
    """Tag a compare copy and rename it when Blender allows (appended/local copies only)."""
    linked_obj[_DFM_COMPARE_REF_KEY] = 1
    linked_obj[_DFM_COMPARE_BASE_LOC_KEY] = (
        f"{base_location[0]},{base_location[1]},{base_location[2]}"
    )
    linked_obj[_DFM_COMPARE_SOURCE_KEY] = source_name

    compare_name = _make_compare_object_name(commit_hash, source_name)
    if getattr(linked_obj, "library", None):
        # Linked library objects keep their library name; cleanup uses dfm_compare_ref.
        return linked_obj.name

    try:
        linked_obj.name = compare_name
    except (AttributeError, TypeError) as e:
        logger.debug("Compare object rename skipped for %s: %s", source_name, e)
        return linked_obj.name
    return linked_obj.name


def _get_compare_base_location(obj, scene) -> Tuple[float, float, float]:
    loc_str = obj.get(_DFM_COMPARE_BASE_LOC_KEY) if obj else None
    if loc_str:
        try:
            parts = [float(part) for part in str(loc_str).split(",")]
            if len(parts) == 3:
                return parts[0], parts[1], parts[2]
        except (TypeError, ValueError):
            pass
    return tuple(getattr(scene, "df_compare_object_original_location", (0.0, 0.0, 0.0)))

class DF_OT_compare_object(Operator):
    """Compare selected object(s) with object(s) from commit by appending a copy."""
    bl_idname = "df.compare_object"
    bl_label = "Compare Object"
    bl_description = "Append object copy from commit for comparison with offset"
    bl_options = {'REGISTER', 'UNDO'}

    commit_hash: bpy.props.StringProperty(
        name="Commit Hash",
        description="Hash of the commit",
        default="",
    )
    
    ghost_mode: bpy.props.BoolProperty(
        name="Ghost Mode",
        description="Display linked objects as wireframe and hide from selection",
        default=False,
    )

    def invoke(self, context, event):
        if not self.commit_hash:
            self.report({'ERROR'}, "Commit hash required")
            return {'CANCELLED'}

        from ..utils.helpers import normalize_commit_hash
        commit_hash = normalize_commit_hash(self.commit_hash)
        if not commit_hash:
            self.report({'ERROR'}, f"Invalid commit hash: {self.commit_hash[:16]}...")
            return {'CANCELLED'}

        repo_path, error_msg = get_repository_path()
        if not repo_path:
            self.report({'ERROR'}, error_msg)
            return {'CANCELLED'}

        if not bpy.data.filepath:
            self.report({'ERROR'}, "Please save the Blender file first")
            return {'CANCELLED'}

        scene = context.scene
        is_active = (
            getattr(scene, 'df_compare_object_active', False) and
            getattr(scene, 'df_compare_object_commit_hash', '') == commit_hash
        )

        # Toggle off: cleanup before selection checks (user may have deselected originals)
        if is_active:
            _cleanup_compare_object(context)
            self.report({'INFO'}, "Comparison stopped")
            return {'FINISHED'}

        selected_objects = context.selected_objects
        if not selected_objects:
            self.report({'ERROR'}, "Please select at least one object")
            return {'CANCELLED'}

        # Starting compare for a different commit — remove previous linked objects first
        if getattr(scene, 'df_compare_object_active', False):
            _cleanup_compare_object(context)

        self.report({'INFO'}, f"Extracting commit {commit_hash[:16]}... to tmp_review")
        success, tmp_review_path, error_msg = _extract_commit_to_tmp_review(repo_path, commit_hash)
        if not success:
            self.report({'ERROR'}, f"Failed to extract commit: {error_msg}")
            return {'CANCELLED'}

        current_blend = Path(bpy.data.filepath)
        
        # Create collection for compare objects if multiple objects
        compare_collection_name = f"Compare_Reference_{commit_hash[:16]}"
        compare_collection = None
        if len(selected_objects) > 1:
            compare_collection = bpy.data.collections.get(compare_collection_name)
            if not compare_collection:
                compare_collection = bpy.data.collections.new(compare_collection_name)
                context.scene.collection.children.link(compare_collection)
        
        # Process each selected object
        linked_objects = []
        existing_object_names = set(bpy.data.objects.keys())
        for obj in selected_objects:
            source_name = obj.name
            original_location = tuple(obj.location)
            base_name = _normalize_object_name(source_name)
            object_type = obj.type

            target_blend = _select_replace_blend(tmp_review_path, current_blend, obj)
            if not target_blend:
                self.report({'WARNING'}, f"No .blend file found for object '{source_name}'")
                continue

            target_obj_name = None
            try:
                from .mesh_io import _resolve_blend_object_name

                file_obj_name = _resolve_blend_object_name(target_blend, source_name)
                if not file_obj_name:
                    logger.warning(
                        "Object '%s' not found in %s",
                        source_name,
                        target_blend,
                    )
                    continue

                # Append a local copy: link=True reuses local objects with the same name.
                with bpy.data.libraries.load(str(target_blend), link=False) as (data_from, data_to):
                    data_to.objects = [file_obj_name]
                    target_obj_name = file_obj_name

                linked_obj = _find_newly_linked_object(
                    existing_object_names,
                    base_name,
                    object_type,
                    target_obj_name,
                    target_blend,
                )
                if linked_obj is None:
                    logger.warning(
                        "Linked object '%s' not found in scene after library load from %s",
                        base_name,
                        target_blend,
                    )
                    continue

                if compare_collection:
                    if linked_obj.name not in compare_collection.objects:
                        compare_collection.objects.link(linked_obj)
                elif linked_obj.name not in context.collection.objects:
                    context.collection.objects.link(linked_obj)

                props = scene.df_commit_props
                offset_axis = props.offset_axis
                offset_value = props.offset_value

                new_location = list(original_location)
                axis_index = {'X': 0, 'Y': 1, 'Z': 2}.get(offset_axis, 0)
                new_location[axis_index] = original_location[axis_index] + offset_value
                linked_obj.location = tuple(new_location)

                if self.ghost_mode:
                    linked_obj.display_type = 'WIRE'
                    linked_obj.hide_select = True
                    linked_obj.show_in_front = False

                compare_name = _mark_as_compare_reference(
                    linked_obj,
                    commit_hash,
                    source_name,
                    original_location,
                )
                marked_obj = bpy.data.objects.get(compare_name) or linked_obj
                if not _is_compare_reference_object(marked_obj):
                    logger.warning("Compare marker missing after setup for %s", source_name)
                    continue

                linked_objects.append(marked_obj)
                existing_object_names.add(marked_obj.name)

            except Exception as e:
                logger.warning("Failed to link object %s: %s", base_name, e, exc_info=True)
                continue
        
        if not linked_objects:
            linked_objects = list(_iter_compare_reference_objects())

        if not linked_objects:
            self.report({'ERROR'}, "Failed to link any objects from commit")
            return {'CANCELLED'}
        
        # Store state
        scene.df_compare_object_active = True
        scene.df_compare_object_commit_hash = commit_hash
        if len(linked_objects) == 1:
            scene.df_compare_object_linked_name = linked_objects[0].name
            scene.df_compare_object_original_location = tuple(linked_objects[0].location)
        else:
            # Multiple objects - store collection name
            scene.df_compare_object_linked_name = compare_collection_name if compare_collection else ""
        
        self.report({'INFO'}, f"Linked {len(linked_objects)} object(s) for comparison")
        return {'FINISHED'}


def _find_newly_linked_object(
    existing_object_names: set,
    base_name: str,
    object_type: str,
    target_obj_name: Optional[str],
    target_blend: Optional[Path] = None,
):
    """Find an object linked/appended since existing_object_names was captured."""
    new_names = set(bpy.data.objects.keys()) - existing_object_names

    if target_obj_name and target_obj_name in bpy.data.objects:
        if target_obj_name in new_names or target_obj_name not in existing_object_names:
            candidate = bpy.data.objects.get(target_obj_name)
            if candidate and candidate.type == object_type:
                return candidate

    for name in new_names:
        candidate = bpy.data.objects.get(name)
        if not candidate or candidate.type != object_type:
            continue
        if _normalize_object_name(name) == base_name:
            return candidate

    for name in new_names:
        candidate = bpy.data.objects.get(name)
        if candidate and candidate.type == object_type:
            return candidate

    if target_blend is not None:
        return _find_linked_object_from_blend(target_blend, base_name, object_type)

    return None


def _blend_paths_equal(path_a: str, path_b: str) -> bool:
    try:
        left = Path(path_a).resolve().as_posix().lower()
        right = Path(path_b).resolve().as_posix().lower()
        return left == right
    except Exception:
        return (path_a or "").replace("\\", "/").lower() == (path_b or "").replace("\\", "/").lower()


def _find_linked_object_from_blend(
    target_blend: Path,
    base_name: str,
    object_type: str,
):
    """Fallback when library link reuses an existing datablock (no new object name)."""
    try:
        blend_abs = str(Path(target_blend).resolve())
    except Exception:
        blend_abs = str(target_blend)

    for obj in bpy.data.objects:
        if obj.type != object_type:
            continue
        if _is_compare_reference_object(obj):
            continue
        lib = getattr(obj, "library", None)
        if not lib or not getattr(lib, "filepath", ""):
            continue
        try:
            lib_abs = bpy.path.abspath(lib.filepath)
        except Exception:
            lib_abs = lib.filepath
        if not _blend_paths_equal(lib_abs, blend_abs):
            continue
        if _normalize_object_name(obj.name) == base_name:
            return obj
    return None


def _remove_compare_linked_object(linked_obj) -> None:
    """Remove a linked compare reference object from the scene and data."""
    if linked_obj is None:
        return
    if not _is_compare_reference_object(linked_obj):
        logger.warning(
            "Refusing to remove object without compare marker: %s",
            getattr(linked_obj, "name", "?"),
        )
        return
    for coll in list(linked_obj.users_collection):
        coll.objects.unlink(linked_obj)
    try:
        bpy.data.objects.remove(linked_obj, do_unlink=True)
    except TypeError:
        bpy.data.objects.remove(linked_obj)


def _cleanup_compare_collection(compare_collection) -> None:
    """Remove compare reference objects in a collection, then the collection."""
    if compare_collection is None:
        return
    for linked_obj in list(compare_collection.objects):
        if _is_compare_reference_object(linked_obj):
            _remove_compare_linked_object(linked_obj)
    for coll in list(compare_collection.users_collection):
        coll.children.unlink(compare_collection)
    if compare_collection.name in bpy.data.collections:
        bpy.data.collections.remove(compare_collection)


def _compare_reference_collection_names(linked_name: str, commit_hash: str) -> list:
    """Build deduplicated Compare_Reference_* collection names to clean up."""
    names = []
    if linked_name and linked_name.startswith("Compare_Reference_"):
        names.append(linked_name)
    if commit_hash:
        names.append(f"Compare_Reference_{commit_hash[:16]}")
    return list(dict.fromkeys(names))


def _cleanup_compare_object(context):
    """Cleanup linked object(s) from comparison."""
    scene = context.scene
    linked_name = getattr(scene, 'df_compare_object_linked_name', '')
    commit_hash = getattr(scene, 'df_compare_object_commit_hash', '')

    for obj in list(_iter_compare_reference_objects()):
        _remove_compare_linked_object(obj)

    for coll_name in _compare_reference_collection_names(linked_name, commit_hash):
        _cleanup_compare_collection(bpy.data.collections.get(coll_name))

    # Cleanup tmp_review
    if commit_hash:
        repo_path, _ = get_repository_path()
        if repo_path:
            api = get_api()
            api.compare_extract(repo_path, commit_hash, cleanup=True)

    scene.df_compare_object_active = False
    scene.df_compare_object_commit_hash = ""
    scene.df_compare_object_linked_name = ""
    scene.df_compare_object_original_location = (0.0, 0.0, 0.0)


def _compare_object_link_monitor():
    """Monitor for linked object and apply offset."""
    if not _compare_object_state:
        return None

    elapsed = time.time() - _compare_object_state.get("started_at", 0)
    if elapsed > _compare_object_state.get("timeout", 120.0):
        _compare_object_state.clear()
        return None

    existing = set(_compare_object_state.get("existing_objects", []))
    current = set(bpy.data.objects.keys())
    new_names = list(current - existing)
    
    if not new_names:
        return 0.5

    base_name = _compare_object_state.get("base_name", "")
    object_type = _compare_object_state.get("object_type", "")
    
    # Find linked object
    linked_obj = None
    for name in new_names:
        obj = bpy.data.objects.get(name)
        if obj and hasattr(obj, 'library') and obj.library:
            if obj.type == object_type and _normalize_object_name(name) == base_name:
                linked_obj = obj
                break
    
    if linked_obj is None:
        # Try any linked object of matching type
        for name in new_names:
            obj = bpy.data.objects.get(name)
            if obj and hasattr(obj, 'library') and obj.library and obj.type == object_type:
                linked_obj = obj
                break
    
    if linked_obj is None:
        return 0.5

    # Store original location
    original_location = tuple(linked_obj.location)
    scene = bpy.context.scene
    scene.df_compare_object_linked_name = linked_obj.name
    scene.df_compare_object_original_location = original_location
    scene.df_compare_object_active = True
    scene.df_compare_object_commit_hash = _compare_object_state.get("commit_hash", "")

    # Apply offset
    _apply_offset_to_object(linked_obj, scene)

    _compare_object_state.clear()
    return None


def _apply_offset_to_object(obj, scene):
    """Apply offset to linked object based on settings."""
    if not obj or not _is_compare_reference_object(obj):
        return

    try:
        props = scene.df_commit_props
        original_location = list(_get_compare_base_location(obj, scene))
        offset_axis = props.offset_axis
        offset_value = props.offset_value

        axis_index = {'X': 0, 'Y': 1, 'Z': 2}.get(offset_axis, 0)
        original_location[axis_index] = original_location[axis_index] + offset_value
        obj.location = tuple(original_location)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error applying offset to object {obj.name if obj else 'None'}: {e}", exc_info=True)


def _update_compared_object_position(context):
    """Update position of compared object when offset settings change."""
    if not context:
        return

    scene = context.scene
    if not getattr(scene, 'df_compare_object_active', False):
        return

    updated = False
    for linked_obj in _iter_compare_reference_objects():
        _apply_offset_to_object(linked_obj, scene)
        updated = True

    if not updated:
        return

    # Update viewport to reflect changes
    try:
        for area in context.screen.areas:
            if area.type == 'VIEW_3D':
                area.tag_redraw()
    except Exception:
        pass


class DF_OT_replace_mesh(Operator):
    """Replace or retrieve selected objects with objects from commit."""
    bl_idname = "df.replace_mesh"
    bl_label = "Retrieve Objects"
    bl_description = "Replace or retrieve objects from commit"
    bl_options = {'REGISTER', 'UNDO'}

    commit_hash: bpy.props.StringProperty(
        name="Commit Hash",
        description="Hash of the commit",
        default="",
    )
    
    replace_mode: bpy.props.BoolProperty(
        name="Replace Mode",
        description="If True, replace selected objects. If False, add objects without removing existing ones",
        default=True,
    )

    def invoke(self, context, event):
        if not self.commit_hash:
            self.report({'ERROR'}, "Commit hash required")
            return {'CANCELLED'}

        from ..utils.helpers import normalize_commit_hash
        commit_hash = normalize_commit_hash(self.commit_hash)
        if not commit_hash:
            self.report({'ERROR'}, f"Invalid commit hash: {self.commit_hash[:16]}...")
            return {'CANCELLED'}

        repo_path, error_msg = get_repository_path()
        if not repo_path:
            self.report({'ERROR'}, error_msg)
            return {'CANCELLED'}

        if not bpy.data.filepath:
            self.report({'ERROR'}, "Please save the Blender file first")
            return {'CANCELLED'}

        selected_objects = context.selected_objects
        if not selected_objects:
            self.report({'ERROR'}, "Please select at least one object")
            return {'CANCELLED'}

        self.report({'INFO'}, f"Extracting commit {commit_hash[:16]}... to tmp_review")
        success, tmp_review_path, error_msg = _extract_commit_to_tmp_review(repo_path, commit_hash)
        if not success:
            self.report({'ERROR'}, f"Failed to extract commit: {error_msg}")
            return {'CANCELLED'}

        current_blend = Path(bpy.data.filepath)
        
        # Process each selected object
        objects_to_process = []
        for obj in selected_objects:
            base_name = _normalize_object_name(obj.name)
            object_type = obj.type
            
            target_blend = _select_replace_blend(tmp_review_path, current_blend, obj)
            if not target_blend:
                self.report({'WARNING'}, f"No .blend file found for object '{obj.name}'")
                continue
            
            original_obj = _resolve_original_object(obj, base_name, object_type)
            if not original_obj:
                self.report({'WARNING'}, f"Original object '{base_name}' not found")
                continue
            
            objects_to_process.append({
                'base_name': base_name,
                'source_name': obj.name,
                'object_type': object_type,
                'original_obj': original_obj,
                'target_blend': target_blend,
            })
        
        if not objects_to_process:
            self.report({'ERROR'}, "No valid objects to process")
            return {'CANCELLED'}

        try:
            from .mesh_io import _resolve_blend_object_name

            loaded_objects = []
            existing_object_names = set(bpy.data.objects.keys())

            for obj_info in objects_to_process:
                target_blend = obj_info['target_blend']
                base_name = obj_info['base_name']
                source_name = obj_info['source_name']
                object_type = obj_info['object_type']

                file_obj_name = _resolve_blend_object_name(target_blend, source_name)
                if not file_obj_name:
                    logger.warning(
                        "Object '%s' not found in %s",
                        source_name,
                        target_blend,
                    )
                    continue

                target_obj_name = None
                with bpy.data.libraries.load(str(target_blend), link=False) as (data_from, data_to):
                    data_to.objects = [file_obj_name]
                    target_obj_name = file_obj_name

                new_obj = _find_newly_linked_object(
                    existing_object_names,
                    base_name,
                    object_type,
                    target_obj_name,
                    target_blend,
                )
                if new_obj is None:
                    logger.warning(
                        "Retrieved object '%s' not found after library load from %s",
                        source_name,
                        target_blend,
                    )
                    continue

                loaded_objects.append({
                    'new_obj': new_obj,
                    'original_obj': obj_info['original_obj'],
                    'base_name': base_name,
                })
                existing_object_names.add(new_obj.name)
            
            if not loaded_objects:
                self.report({'ERROR'}, "Failed to load objects from commit")
                return {'CANCELLED'}
            
            # Process loaded objects
            for item in loaded_objects:
                new_obj = item['new_obj']
                original_obj = item['original_obj']
                base_name = item['base_name']
                
                # Link to collections
                collections = [c.name for c in original_obj.users_collection]
                for coll_name in collections:
                    coll = bpy.data.collections.get(coll_name)
                    if coll and new_obj.name not in coll.objects:
                        coll.objects.link(new_obj)
                if new_obj.name not in context.collection.objects:
                    context.collection.objects.link(new_obj)
                
                # Apply replace or retrieve mode
                if self.replace_mode:
                    # Replace: remove original, rename new
                    for coll in list(original_obj.users_collection):
                        coll.objects.unlink(original_obj)
                    bpy.data.objects.remove(original_obj)
                    new_obj.name = base_name
                else:
                    # Retrieve: keep original, add new with suffix
                    new_obj.name = f"{base_name}_retrieved"

            # Select loaded objects
            bpy.ops.object.select_all(action='DESELECT')
            for item in loaded_objects:
                item['new_obj'].select_set(True)
            context.view_layer.objects.active = loaded_objects[0]['new_obj']
            
            # Cleanup
            api = get_api()
            api.compare_extract(repo_path, commit_hash, cleanup=True)
            
            mode_str = "replaced" if self.replace_mode else "retrieved"
            self.report({'INFO'}, f"Successfully {mode_str} {len(loaded_objects)} object(s)")
            return {'FINISHED'}
            
        except Exception as e:
            logger.error(f"Error in replace/retrieve operation: {e}", exc_info=True)
            self.report({'ERROR'}, f"Failed to process objects: {e}")
            return {'CANCELLED'}

def _select_replace_blend(
    tmp_review_path: Path,
    current_blend: Path,
    active_obj: bpy.types.Object,
) -> Optional[Path]:
    if active_obj.library and active_obj.library.filepath:
        lib_name = Path(active_obj.library.filepath).name
        matches = list(tmp_review_path.rglob(lib_name))
        if matches:
            return matches[0]

    candidate = tmp_review_path / current_blend.name
    if candidate.exists():
        return candidate

    matches = [path for path in tmp_review_path.rglob(current_blend.name) if path.is_file()]
    if len(matches) == 1:
        return matches[0]

    return None


def _replace_append_monitor():
    if not _replace_state:
        return None

    elapsed = time.time() - _replace_state.get("started_at", 0)
    if elapsed > _replace_state.get("timeout", 120.0):
        _replace_state.clear()
        return None

    existing = set(_replace_state.get("existing_objects", []))
    current = set(bpy.data.objects.keys())
    new_names = list(current - existing)
    if not new_names:
        return 0.5

    base_name = _replace_state.get("base_name", "")
    object_type = _replace_state.get("object_type", "")
    commit_hash = _replace_state.get("commit_hash", "")
    repo_path = _replace_state.get("repo_path", "")

    appended_obj = None
    for name in new_names:
        obj = bpy.data.objects.get(name)
        if obj and obj.type == object_type and _normalize_object_name(name) == base_name:
            appended_obj = obj
            break
    if appended_obj is None:
        for name in new_names:
            obj = bpy.data.objects.get(name)
            if obj and obj.type == object_type:
                appended_obj = obj
                break
    if appended_obj is None and new_names:
        appended_obj = bpy.data.objects.get(new_names[0])
    if appended_obj is None:
        return 0.5

    original_name = _replace_state.get("original_name", "")
    original_data_name = _replace_state.get("original_data_name", "")
    original_obj = None
    if original_name and original_name in bpy.data.objects:
        original_obj = bpy.data.objects[original_name]
    if original_obj is None and base_name in bpy.data.objects:
        original_obj = bpy.data.objects[base_name]
    if original_obj is None and original_data_name:
        for candidate in bpy.data.objects:
            if candidate.type != object_type:
                continue
            if candidate.data and candidate.data.name == original_data_name:
                original_obj = candidate
                break
    if original_obj is None:
        _replace_state.clear()
        return None

    for coll_name in _replace_state.get("collections", []):
        coll = bpy.data.collections.get(coll_name)
        if coll and appended_obj.name not in coll.objects:
            coll.objects.link(appended_obj)
    if appended_obj.name not in bpy.context.collection.objects:
        bpy.context.collection.objects.link(appended_obj)

    for coll in list(original_obj.users_collection):
        coll.objects.unlink(original_obj)
    bpy.data.objects.remove(original_obj)

    appended_obj.name = base_name
    appended_obj.select_set(True)
    bpy.context.view_layer.objects.active = appended_obj

    if repo_path and commit_hash:
        api = get_api()
        api.compare_extract(Path(repo_path), commit_hash, cleanup=True)

    _replace_state.clear()
    return None

def _resolve_original_object(
    original_obj_ref: Optional[bpy.types.Object],
    base_name: str,
    object_type: str,
) -> Optional[bpy.types.Object]:
    try:
        if original_obj_ref and original_obj_ref.name in bpy.data.objects:
            return bpy.data.objects[original_obj_ref.name]
    except (ReferenceError, AttributeError):
        pass

    if base_name in bpy.data.objects:
        return bpy.data.objects[base_name]

    for candidate in bpy.data.objects:
        if candidate.type != object_type:
            continue
        if _normalize_object_name(candidate.name) == base_name:
            return candidate

    return None


def _normalize_object_name(name: str) -> str:
    prefix = "_temp_import_"
    if name.startswith(prefix):
        return name[len(prefix):]
    # Strip Blender duplicate suffixes like ".001"
    if len(name) > 4 and name[-4] == "." and name[-3:].isdigit():
        return name[:-4]
    return name


def _extract_commit_to_tmp_review(
    repo_path: Path,
    commit_hash: str,
    cleanup_old: bool = True,
) -> Tuple[bool, Optional[Path], Optional[str]]:
    api = get_api()
    if cleanup_old:
        api.compare_extract(repo_path, commit_hash, cleanup=True)

    success, path, error = api.compare_extract(repo_path, commit_hash, cleanup=False)
    if not success:
        return False, None, error

    tmp_review_path = Path(path) if path else (repo_path / ".DFM" / "tmp_review")
    if not wait_for_path(tmp_review_path, timeout=5.0, interval=0.1):
        return False, tmp_review_path, "tmp_review directory was not created"

    return True, tmp_review_path, None


def register():
    from ..utils.registration import register_classes
    classes_to_register = [
        DF_OT_refresh_history,
        DF_OT_compare_project,
        DF_OT_restore_version,
        DF_OT_replace_mesh,
        DF_OT_compare_object,
    ]
    register_classes(classes_to_register)


def unregister():
    from ..utils.registration import unregister_classes
    classes_to_unregister = [
        DF_OT_replace_mesh,
        DF_OT_restore_version,
        DF_OT_compare_project,
        DF_OT_refresh_history,
        DF_OT_compare_object,
    ]
    unregister_classes(classes_to_unregister)
