"""
Operators for commit operations.
"""

import bpy
import datetime
import logging
from bpy.types import Operator
from pathlib import Path
from ..utils.forester_api import get_api
from ..utils.helpers import get_repository_path, get_addon_preferences

logger = logging.getLogger(__name__)


class DF_OT_save_version(Operator):
    """Save Blender file and create a commit with date/time message."""
    bl_idname = "df.save_version"
    bl_label = "Save Version"
    bl_description = "Save file and create commit with date and time"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        if not bpy.data.filepath:
            self.report({'ERROR'}, "Please save the Blender file first")
            return {'CANCELLED'}

        repo_path, error_msg = get_repository_path()
        if not repo_path:
            self.report({'ERROR'}, error_msg)
            return {'CANCELLED'}

        # 1. Save the file
        try:
            bpy.ops.wm.save_mainfile()
        except RuntimeError as e:
            self.report({'ERROR'}, f"Failed to save file: {e}")
            return {'CANCELLED'}

        api = get_api()
        prefs = get_addon_preferences(context)
        author = getattr(prefs, 'default_author', 'Unknown') or 'Unknown'

        # 2. Add files to staging
        success, add_error = api.add(repo_path, ["."])
        if not success:
            self.report({'ERROR'}, f"Failed to add files: {add_error}")
            return {'CANCELLED'}

        # 3. Create commit with date/time message
        commit_message = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        success, _, commit_error = api.commit(repo_path, commit_message, author=author)
        if not success:
            self.report({'ERROR'}, f"Failed to commit: {commit_error}")
            return {'CANCELLED'}

        from ..utils.object_history import invalidate_object_history_cache
        invalidate_object_history_cache()
        self.report({'INFO'}, f"Saved and committed: {commit_message}")
        return {'FINISHED'}


def _sanitize_asset_name(asset_name: str) -> str:
    """Replace invalid filename characters for asset names."""
    invalid_chars = '<>:"/\\|?*'
    sanitized = asset_name
    for char in invalid_chars:
        sanitized = sanitized.replace(char, '_')
    return sanitized


def _resolve_assets_base(repo_path: Path, assets_dir_name: str, operator: Operator) -> Path:
    """Resolve assets base path, allowing relative to repo or absolute paths."""
    assets_dir_name = assets_dir_name.strip() if assets_dir_name.strip() else "assets"
    assets_dir_path = Path(assets_dir_name)
    if assets_dir_path.is_absolute():
        repo_path_resolved = repo_path.resolve()
        assets_dir_resolved = assets_dir_path.resolve()
        try:
            relative_path = assets_dir_resolved.relative_to(repo_path_resolved)
            return repo_path / relative_path
        except ValueError:
            operator.report({'WARNING'}, f"Using absolute path outside repository: {assets_dir_path}")
            return assets_dir_path
    return repo_path / assets_dir_name


class DF_OT_select_assets_directory(Operator):
    """Select assets directory using file browser."""
    bl_idname = "df.select_assets_directory"
    bl_label = "Select Assets Directory"
    bl_description = "Select assets directory using file browser"
    bl_options = {'REGISTER', 'UNDO'}
    
    # Filepath property for directory selection
    filepath: bpy.props.StringProperty(
        name="Directory",
        description="Full path to assets directory",
        subtype='DIR_PATH',
        default="",
    )
    
    def invoke(self, context, event):
        """Open file browser for directory selection."""
        # Get repository path as default directory
        repo_path, error_msg = get_repository_path()
        if repo_path:
            # Try to get current assets_dir from window_manager
            if 'df_current_assets_dir' in context.window_manager:
                current_dir = context.window_manager['df_current_assets_dir']
                if current_dir:
                    full_path = repo_path / current_dir
                    if full_path.exists():
                        self.filepath = str(full_path.resolve())
                        context.window_manager.fileselect_add(self)
                        return {'RUNNING_MODAL'}
            
            # Default to repo_path/assets if exists, else repo_path
            default_dir = repo_path / "assets"
            if default_dir.exists():
                self.filepath = str(default_dir.resolve())
            else:
                self.filepath = str(repo_path.resolve())
        else:
            # Fallback to home directory
            self.filepath = str(Path.home())
        
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}
    
    def execute(self, context):
        """Set selected directory to save_asset operator."""
        if not self.filepath:
            return {'CANCELLED'}
        
        # Get repository path to make path relative
        repo_path, error_msg = get_repository_path()
        if repo_path:
            try:
                dir_path = Path(self.filepath)
                repo_path_resolved = repo_path.resolve()
                dir_path_resolved = dir_path.resolve()
                
                # Try to make path relative to repo
                try:
                    relative_path = dir_path_resolved.relative_to(repo_path_resolved)
                    # Store relative path as string (use forward slashes)
                    assets_dir_name = relative_path.as_posix()
                except ValueError:
                    # Not relative to repo, use directory name only
                    assets_dir_name = dir_path.name
                
                # Store in window_manager for save_asset operator to pick up
                context.window_manager['df_selected_assets_dir'] = assets_dir_name
            except Exception as e:
                self.report({'WARNING'}, f"Could not process directory: {e}")
        
        return {'FINISHED'}


class DF_OT_save_asset(Operator):
    """Save selected object as separate .blend asset file."""
    bl_idname = "df.save_asset"
    bl_label = "Save as Asset"
    bl_description = "Save selected object as a separate .blend file in assets directory"
    bl_options = {'REGISTER', 'UNDO'}
    
    # Property for asset name
    asset_name: bpy.props.StringProperty(
        name="Asset Name",
        description="Name for the asset file (without .blend extension)",
        default="",
    )
    
    # Property for asset category (subdirectory)
    asset_category: bpy.props.StringProperty(
        name="Category",
        description="Asset category/subdirectory (e.g., 'props', 'characters', 'lights', 'cameras')",
        default="objects",
    )
    
    # Property for assets directory name (can be relative path from repo root)
    assets_dir: bpy.props.StringProperty(
        name="Assets Directory",
        description="Name of the assets directory (relative to repository root)",
        default="assets",
    )
    
    # Property for replacing with linked version
    replace_with_link: bpy.props.BoolProperty(
        name="Replace with Link",
        description="Replace original object with linked version after saving",
        default=True,
    )
    
    # Internal properties to store object info between invoke and execute
    _object_name: bpy.props.StringProperty(default="")
    _object_type: bpy.props.StringProperty(default="")

    def invoke(self, context, event):
        """Show dialog to set asset name and category."""
        # Get the object to save - prefer active if selected, otherwise first selected
        active_obj = context.active_object
        selected_objects = context.selected_objects
        
        # Determine which object to use
        obj_to_save = None
        if active_obj and active_obj in selected_objects:
            obj_to_save = active_obj
        elif selected_objects:
            obj_to_save = selected_objects[0]
        elif active_obj:
            obj_to_save = active_obj
        
        if not obj_to_save:
            self.report({'ERROR'}, "Please select an object")
            return {'CANCELLED'}
        
        # Store object name and type in operator properties for use in draw/execute
        self._object_name = obj_to_save.name
        self._object_type = obj_to_save.type
        
        # Store current assets_dir in window_manager for select operator
        context.window_manager['df_current_assets_dir'] = self.assets_dir
        
        # Check if directory was selected from file browser (before showing dialog)
        if 'df_selected_assets_dir' in context.window_manager:
            self.assets_dir = context.window_manager['df_selected_assets_dir']
            del context.window_manager['df_selected_assets_dir']
        
        # Set default asset name from object name
        if not self.asset_name:
            self.asset_name = obj_to_save.name
        
        # Set default category based on object type
        if not self.asset_category or self.asset_category == "objects":
            obj_type = obj_to_save.type.lower()
            # Map object types to common categories
            category_map = {
                'mesh': 'props',
                'light': 'lights',
                'camera': 'cameras',
                'armature': 'rigs',
                'curve': 'curves',
                'surface': 'surfaces',
                'meta': 'metaballs',
                'font': 'text',
                'lattice': 'lattices',
                'gpencil': 'grease_pencil',
                'volume': 'volumes',
            }
            self.asset_category = category_map.get(obj_type, 'objects')
        
        # Show dialog
        return context.window_manager.invoke_props_dialog(self, width=400)

    def draw(self, context):
        """Draw dialog UI."""
        layout = self.layout
        
        # Use stored object info from invoke
        if hasattr(self, '_object_type') and self._object_type:
            obj_type_label = self._object_type.lower().replace('_', ' ').title()
            layout.label(text=f"Object type: {obj_type_label}", icon='OBJECT_DATA')
        else:
            # Fallback to active object if stored info not available
            active_obj = context.active_object
            if active_obj:
                obj_type_label = active_obj.type.lower().replace('_', ' ').title()
                layout.label(text=f"Object type: {obj_type_label}", icon='OBJECT_DATA')
        layout.separator()
        
        # Assets Directory row with browse button
        row = layout.row(align=True)
        row.prop(self, "assets_dir", text="Assets Directory")
        row.operator("df.select_assets_directory", text="", icon='FILEBROWSER')
        
        # Check if directory was selected from file browser (during dialog redraw)
        if 'df_selected_assets_dir' in context.window_manager:
            self.assets_dir = context.window_manager['df_selected_assets_dir']
            del context.window_manager['df_selected_assets_dir']
        
        layout.prop(self, "asset_category")
        layout.prop(self, "asset_name")
        layout.separator()
        layout.prop(self, "replace_with_link")

    def execute(self, context):
        """Save selected object as asset."""
        # Get the object to save - use stored name if available, otherwise try to find it
        obj_to_save = None
        
        if hasattr(self, '_object_name') and self._object_name:
            # Try to get object by stored name
            obj_to_save = bpy.data.objects.get(self._object_name)
        
        # Fallback: try active object or first selected
        if not obj_to_save:
            active_obj = context.active_object
            selected_objects = context.selected_objects
            
            if active_obj and active_obj in selected_objects:
                obj_to_save = active_obj
            elif selected_objects:
                obj_to_save = selected_objects[0]
            elif active_obj:
                obj_to_save = active_obj
        
        if not obj_to_save:
            self.report({'ERROR'}, "Please select an object")
            return {'CANCELLED'}
        
        # Get repository path
        repo_path, error_msg = get_repository_path()
        if not repo_path:
            self.report({'ERROR'}, error_msg)
            return {'CANCELLED'}
        
        # Validate asset name
        if not self.asset_name or not self.asset_name.strip():
            self.report({'ERROR'}, "Asset name is required")
            return {'CANCELLED'}
        
        # Sanitize asset name (remove invalid characters)
        asset_name = _sanitize_asset_name(self.asset_name.strip())
        
        # Build asset directory path
        assets_base = _resolve_assets_base(repo_path, self.assets_dir, self)
        
        asset_category = self.asset_category.strip() if self.asset_category.strip() else "objects"
        asset_dir = assets_base / asset_category
        
        # Create directory if it doesn't exist
        try:
            asset_dir.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            self.report({'ERROR'}, f"Failed to create asset directory: {e}")
            return {'CANCELLED'}
        
        # Build output file path
        output_path = asset_dir / f"{asset_name}.blend"
        
        # Check if file already exists
        if output_path.exists():
            self.report({'WARNING'}, f"File {output_path.name} already exists. It will be overwritten.")
        
        # 1. Save original object info (BEFORE any operations)
        original_name = obj_to_save.name
        original_collections = [c.name for c in obj_to_save.users_collection]
        original_obj_type = obj_to_save.type
        
        # Use the object directly (we already have a reference)
        original_obj_ref = obj_to_save
        
        # 2. Save object to .blend file and remember the path
        try:
            from ..operators.mesh_io import _save_object_to_blend
            # Verify object still exists before saving
            if original_name not in bpy.data.objects:
                self.report({'ERROR'}, f"Object '{original_name}' was removed before saving")
                return {'CANCELLED'}
            
            _save_object_to_blend(original_obj_ref, output_path)
            
            # Verify object still exists after saving (before deletion)
            if original_name not in bpy.data.objects:
                self.report({'ERROR'}, f"Object '{original_name}' was removed during save")
                return {'CANCELLED'}
            
            # Remember the saved file path
            saved_file_path = output_path
            
            # Add to asset registry (use original_obj_type, not active_obj.type)
            from ..utils.asset_registry import add_asset_to_registry
            add_asset_to_registry(
                repo_path,
                output_path,
                asset_name,
                original_obj_type,
                asset_category
            )
            
            # Replace with linked version if requested
            if self.replace_with_link:
                try:
                    linked_obj = None
                    target_obj_name = None
                    
                    # Get list of objects before loading
                    existing_objects = set(bpy.data.objects.keys())
                    
                    with bpy.data.libraries.load(str(saved_file_path), link=True) as (data_from, data_to):
                        # Find the object we just saved
                        for obj_name in data_from.objects:
                            if obj_name == asset_name or _normalize_object_name(obj_name) == asset_name:
                                data_to.objects = [obj_name]
                                target_obj_name = obj_name
                                break
                        
                        if not target_obj_name and data_from.objects:
                            target_obj_name = data_from.objects[0]
                            data_to.objects = [target_obj_name]

                    # Find the linked object - check newly added objects
                    current_objects = set(bpy.data.objects.keys())
                    new_object_names = current_objects - existing_objects
                    
                    # First try to find by target name
                    if target_obj_name and target_obj_name in bpy.data.objects:
                        candidate = bpy.data.objects[target_obj_name]
                        if hasattr(candidate, 'library') and candidate.library:
                            linked_obj = candidate
                    
                    # If not found, check all new objects
                    if not linked_obj:
                        for obj_name in new_object_names:
                            obj = bpy.data.objects.get(obj_name)
                            if obj and hasattr(obj, 'library') and obj.library:
                                # Check if it's from our file
                                lib_path = Path(obj.library.filepath) if obj.library.filepath else None
                                if lib_path and lib_path.resolve() == saved_file_path.resolve():
                                    if obj.type == original_obj_type:
                                        linked_obj = obj
                                        break
                    
                    # If still not found, check all objects with library
                    if not linked_obj:
                        for obj in bpy.data.objects:
                            if hasattr(obj, 'library') and obj.library:
                                lib_path = Path(obj.library.filepath) if obj.library.filepath else None
                                if lib_path and lib_path.resolve() == saved_file_path.resolve():
                                    if target_obj_name and obj.name == target_obj_name:
                                        linked_obj = obj
                                        break
                                    elif obj.type == original_obj_type:
                                        linked_obj = obj
                                        break
                    
                    if linked_obj:
                        obj_to_remove = bpy.data.objects.get(original_name)
                        if obj_to_remove:
                            for coll in list(obj_to_remove.users_collection):
                                coll.objects.unlink(obj_to_remove)
                            bpy.data.objects.remove(obj_to_remove)

                        # Add to original collections (this also adds to view layer)
                        for coll_name in original_collections:
                            coll = bpy.data.collections.get(coll_name)
                            if coll and linked_obj.name not in coll.objects:
                                coll.objects.link(linked_obj)
                        
                        # Also add to scene collection if not already there
                        if linked_obj.name not in context.collection.objects:
                            context.collection.objects.link(linked_obj)
                        
                        # Ensure object is visible in viewport
                        linked_obj.hide_viewport = False
                        linked_obj.hide_render = False
                        
                        # 5. Select linked object (use direct access, not bpy.ops)
                        # Deselect all objects directly (safely)
                        try:
                            for obj in list(bpy.data.objects):
                                try:
                                    if obj.select_get():
                                        obj.select_set(False)
                                except (ReferenceError, RuntimeError):
                                    # Object was removed, skip
                                    continue
                        except Exception as e:
                            logger.debug(f"Error deselecting objects: {e}")
                        
                        # Select and activate linked object
                        try:
                            linked_obj.select_set(True)
                            context.view_layer.objects.active = linked_obj
                        except (ReferenceError, RuntimeError) as e:
                            logger.warning(f"Failed to select linked object: {e}")
                        
                        # Force viewport update
                        try:
                            for area in context.screen.areas:
                                if area.type == 'VIEW_3D':
                                    area.tag_redraw()
                        except Exception:
                            pass
                    else:
                        logger.warning(f"Could not find linked object after loading from {saved_file_path}")
                        logger.debug(f"Target obj name: {target_obj_name}, Original type: {original_obj_type}")
                        logger.debug(f"New objects: {new_object_names}")
                        self.report({'WARNING'}, "Asset saved but original object was kept because linked object was not found.")
                except Exception as e:
                    logger.error(f"Failed to replace with linked version: {e}", exc_info=True)
                    self.report({'WARNING'}, f"Asset saved but original object was kept because linking failed: {e}")
            
            # Report success (use original_obj_type, not active_obj.type - object may be deleted)
            try:
                relative_path = output_path.relative_to(repo_path)
            except ValueError:
                relative_path = output_path
            obj_type = original_obj_type.lower().replace('_', ' ').title()
            self.report({'INFO'}, f"{obj_type} asset saved: {relative_path}")
            return {'FINISHED'}
        except Exception as e:
            self.report({'ERROR'}, f"Failed to save asset: {e}")
            return {'CANCELLED'}


def _normalize_object_name(name: str) -> str:
    """Normalize object name (remove Blender suffixes)."""
    if len(name) > 4 and name[-4] == "." and name[-3:].isdigit():
        return name[:-4]
    return name


class DF_OT_clear_tag_filter(Operator):
    """Clear tag search filter in history panel."""
    bl_idname = "df.clear_tag_filter"
    bl_label = "Clear Tag Filter"
    bl_description = "Clear the tag search filter"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        props = getattr(context.scene, "df_commit_props", None)
        if props and hasattr(props, "tag_search_filter"):
            props.tag_search_filter = ""
            # The update callback will automatically restore all commits
            return {'FINISHED'}
        self.report({'WARNING'}, "Commit properties are not available")
        return {'CANCELLED'}


def register():
    from ..utils.registration import register_classes
    classes_to_register = [
        DF_OT_save_version,
        DF_OT_select_assets_directory,
        DF_OT_save_asset,
        DF_OT_clear_tag_filter,
    ]
    register_classes(classes_to_register)


def unregister():
    from ..utils.registration import unregister_classes
    classes_to_unregister = [
        DF_OT_clear_tag_filter,
        DF_OT_save_asset,
        DF_OT_select_assets_directory,
        DF_OT_save_version,
    ]
    unregister_classes(classes_to_unregister)
