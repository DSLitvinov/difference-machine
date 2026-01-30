"""
Operators for commit history operations.
"""

import bpy
import time
from bpy.types import Operator
from pathlib import Path
from typing import Optional, Tuple
from ..utils.forester_api import get_api
from ..utils.helpers import get_repository_path, wait_for_path
from ..utils.logging_config import get_logger

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
            if error_msg and ("reflog" in error_msg.lower() or "no such table" in error_msg.lower()):
                self.report(
                    {'WARNING'},
                    "Database schema is outdated. Please rebuild database in Forester.",
                )
                commits = []
            else:
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
            commit_all.timestamp = 0
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
                    commit.hash = commit_all.hash
                    commit.message = commit_all.message
                    commit.author = commit_all.author
                    commit.tag = commit_all.tag
                    commit.timestamp = commit_all.timestamp
                    commit.commit_type = commit_all.commit_type
                    commit.selected_mesh_names = commit_all.selected_mesh_names
                    commit.screenshot_hash = commit_all.screenshot_hash
                    commit.screenshot_path = commit_all.screenshot_path
                    commit.is_selected = commit_all.is_selected
                    commit.is_head = commit_all.is_head
        else:
            for commit_all in scene.df_commits_all:
                commit = scene.df_commits.add()
                commit.hash = commit_all.hash
                commit.message = commit_all.message
                commit.author = commit_all.author
                commit.tag = commit_all.tag
                commit.timestamp = commit_all.timestamp
                commit.commit_type = commit_all.commit_type
                commit.selected_mesh_names = commit_all.selected_mesh_names
                commit.screenshot_hash = commit_all.screenshot_hash
                commit.screenshot_path = commit_all.screenshot_path
                commit.is_selected = commit_all.is_selected
                commit.is_head = commit_all.is_head

        if scene.df_commit_list_index >= len(scene.df_commits):
            scene.df_commit_list_index = max(0, len(scene.df_commits) - 1)

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

_replace_state = {}
_compare_object_state = {}

class DF_OT_compare_object(Operator):
    """Compare selected object(s) with object(s) from commit by linking them."""
    bl_idname = "df.compare_object"
    bl_label = "Compare Object"
    bl_description = "Link object(s) from commit for comparison with offset"
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

        selected_objects = context.selected_objects
        if not selected_objects:
            self.report({'ERROR'}, "Please select at least one object")
            return {'CANCELLED'}

        # Check if already comparing
        scene = context.scene
        is_active = (
            getattr(scene, 'df_compare_object_active', False) and
            getattr(scene, 'df_compare_object_commit_hash', '') == commit_hash
        )

        if is_active:
            # Cleanup existing comparison
            _cleanup_compare_object(context)
            self.report({'INFO'}, "Comparison stopped")
            return {'FINISHED'}

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
        for obj in selected_objects:
            base_name = _normalize_object_name(obj.name)
            object_type = obj.type
            
            target_blend = _select_replace_blend(tmp_review_path, current_blend, obj)
            if not target_blend:
                self.report({'WARNING'}, f"No .blend file found for object '{obj.name}'")
                continue
            
            # Use bpy.data.libraries.load() for better control
            try:
                with bpy.data.libraries.load(str(target_blend), link=True) as (data_from, data_to):
                    # Find matching object
                    obj_found = False
                    for obj_name in data_from.objects:
                        if _normalize_object_name(obj_name) == base_name:
                            data_to.objects = [obj_name]
                            obj_found = True
                            break
                    
                    if not obj_found:
                        # Try to load any object of matching type
                        for obj_name in data_from.objects:
                            if obj_name in data_from.objects:
                                data_to.objects = [obj_name]
                                break
                
                # Find the linked object
                for linked_obj in data_to.objects:
                    if linked_obj and hasattr(linked_obj, 'library') and linked_obj.library:
                        # Add to collection
                        if compare_collection:
                            compare_collection.objects.link(linked_obj)
                        else:
                            # Single object - link to scene collection
                            context.collection.objects.link(linked_obj)
                        
                        # Apply offset
                        original_location = tuple(obj.location)
                        props = scene.df_commit_props
                        offset_axis = props.offset_axis
                        offset_value = props.offset_value
                        
                        new_location = list(original_location)
                        axis_index = {'X': 0, 'Y': 1, 'Z': 2}.get(offset_axis, 0)
                        new_location[axis_index] = original_location[axis_index] + offset_value
                        linked_obj.location = tuple(new_location)
                        
                        # Apply ghost mode if enabled
                        if self.ghost_mode:
                            linked_obj.display_type = 'WIRE'
                            linked_obj.hide_select = True
                            linked_obj.show_in_front = False
                        
                        linked_objects.append(linked_obj)
                        break
                        
            except Exception as e:
                logger.warning(f"Failed to link object {base_name}: {e}")
                continue
        
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
        
        # Cleanup
        api = get_api()
        api.compare_extract(repo_path, commit_hash, cleanup=True)
        
        self.report({'INFO'}, f"Linked {len(linked_objects)} object(s) for comparison")
        return {'FINISHED'}


def _cleanup_compare_object(context):
    """Cleanup linked object(s) from comparison."""
    scene = context.scene
    linked_name = getattr(scene, 'df_compare_object_linked_name', '')
    commit_hash = getattr(scene, 'df_compare_object_commit_hash', '')
    
    # Check if it's a collection name (multiple objects)
    if linked_name and linked_name.startswith("Compare_Reference_"):
        compare_collection = bpy.data.collections.get(linked_name)
        if compare_collection:
            # Remove all linked objects from collection
            linked_objs = [obj for obj in compare_collection.objects if hasattr(obj, 'library') and obj.library]
            for linked_obj in linked_objs:
                for coll in list(linked_obj.users_collection):
                    coll.objects.unlink(linked_obj)
                bpy.data.objects.remove(linked_obj)
            
            # Remove collection
            for coll in list(compare_collection.users_collection):
                coll.children.unlink(compare_collection)
            bpy.data.collections.remove(compare_collection)
    elif linked_name and linked_name in bpy.data.objects:
        # Single object
        linked_obj = bpy.data.objects[linked_name]
        if hasattr(linked_obj, 'library') and linked_obj.library:
            # Remove from collections
            for coll in list(linked_obj.users_collection):
                coll.objects.unlink(linked_obj)
            # Remove object
            bpy.data.objects.remove(linked_obj)
    
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
    if not obj:
        return
    
    try:
        props = scene.df_commit_props
        original_location = tuple(scene.df_compare_object_original_location)
        offset_axis = props.offset_axis
        offset_value = props.offset_value
        
        # Calculate new location based on axis and offset
        new_location = list(original_location)
        axis_index = {'X': 0, 'Y': 1, 'Z': 2}.get(offset_axis, 0)
        new_location[axis_index] = original_location[axis_index] + offset_value
        
        # Apply the new location
        obj.location = tuple(new_location)
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
    
    linked_name = getattr(scene, 'df_compare_object_linked_name', '')
    if not linked_name or linked_name not in bpy.data.objects:
        return
    
    linked_obj = bpy.data.objects[linked_name]
    if not hasattr(linked_obj, 'library') or not linked_obj.library:
        return
    
    _apply_offset_to_object(linked_obj, scene)
    
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
                'object_type': object_type,
                'original_obj': original_obj,
                'target_blend': target_blend,
            })
        
        if not objects_to_process:
            self.report({'ERROR'}, "No valid objects to process")
            return {'CANCELLED'}

        # Use bpy.data.libraries.load() for better control
        try:
            loaded_objects = []
            existing_object_names = set(bpy.data.objects.keys())
            
            for obj_info in objects_to_process:
                target_blend = obj_info['target_blend']
                base_name = obj_info['base_name']
                object_type = obj_info['object_type']
                
                # Load objects from library
                with bpy.data.libraries.load(str(target_blend), link=False) as (data_from, data_to):
                    # Find matching object
                    obj_found = False
                    target_obj_name = None
                    for obj_name in data_from.objects:
                        if _normalize_object_name(obj_name) == base_name:
                            data_to.objects = [obj_name]
                            target_obj_name = obj_name
                            obj_found = True
                            break
                    
                    if not obj_found:
                        # Try to load any object of matching type
                        for obj_name in data_from.objects:
                            # Check if object type matches (we'd need to check in the blend file, but for now just load first)
                            data_to.objects = [obj_name]
                            target_obj_name = obj_name
                            break
                
                # Find the loaded object (it will be in bpy.data.objects after the with block)
                if target_obj_name:
                    # Wait a bit for object to be loaded
                    import time
                    time.sleep(0.1)
                    
                    # Find newly loaded object
                    current_object_names = set(bpy.data.objects.keys())
                    new_object_names = current_object_names - existing_object_names
                    
                    new_obj = None
                    for obj_name in new_object_names:
                        obj = bpy.data.objects.get(obj_name)
                        if obj and obj.type == object_type:
                            # Check if it matches our target
                            if _normalize_object_name(obj_name) == base_name or obj_name == target_obj_name:
                                new_obj = obj
                                break
                    
                    # If still not found, use first new object of matching type
                    if not new_obj:
                        for obj_name in new_object_names:
                            obj = bpy.data.objects.get(obj_name)
                            if obj and obj.type == object_type:
                                new_obj = obj
                                break
                    
                    if new_obj:
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
            
            # Fix asset paths
            from ..utils.asset_path import fix_retrieved_assets
            assets = []
            for item in loaded_objects:
                new_obj = item['new_obj']
                # Collect asset information (simplified - would need more detailed collection)
                if hasattr(new_obj, 'data') and new_obj.data:
                    # Add logic to collect assets from object
                    pass
            # fix_retrieved_assets(assets, repo_path)
            
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

    for blend_file in tmp_review_path.rglob("*.blend"):
        if blend_file.is_file():
            return blend_file

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
        DF_OT_replace_mesh,
        DF_OT_compare_object,
    ]
    register_classes(classes_to_register)


def unregister():
    from ..utils.registration import unregister_classes
    classes_to_unregister = [
        DF_OT_replace_mesh,
        DF_OT_compare_project,
        DF_OT_refresh_history,
        DF_OT_compare_object,
    ]
    unregister_classes(classes_to_unregister)
