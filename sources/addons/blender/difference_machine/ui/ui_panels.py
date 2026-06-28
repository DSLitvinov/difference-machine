"""
UI panels for Difference Machine add-on.
"""

import logging
import bpy
from bpy.types import Panel, Context
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


def get_current_branch_name(context: Context) -> str:
    """Get current branch name from repository or return default."""
    try:
        blend_file = Path(bpy.data.filepath)
        if not blend_file:
            return "main"
        
        from ..utils.helpers import find_repository_root
        from ..utils.forester_api import get_api
        
        project_root = blend_file.parent
        repo_path = find_repository_root(project_root)
        if repo_path:
            api = get_api()
            success, status_data, _ = api.status(repo_path)
            if success and status_data:
                return status_data.get("branch", "main")
    except (AttributeError, RuntimeError, ValueError, KeyError) as e:
        logger.debug(f"Error getting current branch name: {e}")
    except Exception as e:
        logger.warning(f"Unexpected error getting current branch name: {e}")
    
    # Fallback to props or default
    try:
        props = context.scene.df_commit_props
        return props.branch if props and props.branch else "main"
    except (AttributeError, KeyError):
        return "main"


class DF_PT_save_version_panel(Panel):
    """Panel for Save Version - save file and create commit."""
    bl_label = "Save Version"
    bl_idname = "DF_PT_save_version_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = "Difference Machine"
    bl_order = 0

    @classmethod
    def poll(cls, context):
        """Show panel when repository is initialized."""
        from ..utils.helpers import is_repository_initialized
        return is_repository_initialized(context)

    def draw(self, context: Context) -> None:
        """Draw the panel UI."""
        layout = self.layout
        from ..utils.helpers import get_addon_preferences
        prefs = get_addon_preferences(context)
        if not prefs or not hasattr(prefs, 'auto_save_enabled'):
            return

        # Auto Save checkbox (above the button)
        layout.prop(prefs, "auto_save_enabled", text="Auto Save")

        # Save Version button - disabled when Auto Save is on
        row = layout.row()
        row.scale_y = 1.2
        row.operator("df.save_version", text="Save Version", icon='FILE_TICK')
        row.enabled = not prefs.auto_save_enabled


class DF_PT_save_asset_panel(Panel):
    """Panel for saving objects as assets."""
    bl_label = "Save as Asset"
    bl_idname = "DF_PT_save_asset_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = "Difference Machine"
    bl_order = 1

    @classmethod
    def poll(cls, context):
        """Show panel always."""
        return True

    def draw(self, context: Context) -> None:
        """Draw the panel UI."""
        layout = self.layout
        
        # Check if repository is initialized
        from ..utils.helpers import is_repository_initialized
        if not is_repository_initialized(context):
            box = layout.box()
            box.label(text="Repository not initialized", icon='ERROR')
            if not bpy.data.filepath:
                box.label(text="Please save the Blender file first", icon='INFO')
            else:
                row = box.row()
                row.scale_y = 1.2
                row.operator("df.init_project", text="Init Project", icon='FILE_NEW')
            return
        
        # Asset saving section (if any object is selected)
        active_obj = context.active_object
        if active_obj:
            box = layout.box()
            box.label(text="Save as Asset", icon='PACKAGE')
            row = box.row()
            row.scale_y = 1.2
            row.operator("df.save_asset", text="Save Selected Object", icon='EXPORT')
            obj_type_label = active_obj.type.lower().replace('_', ' ').title()
            box.label(text=f"Save {obj_type_label} as separate .blend file", icon='INFO')
        else:
            box = layout.box()
            box.label(text="No object selected", icon='INFO')
            box.label(text="Select an object to save as asset")


class DF_PT_compare_panel(Panel):
    """Panel for comparing commits."""
    bl_label = "Compare"
    bl_idname = "DF_PT_compare_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = "Difference Machine"
    bl_order = 2

    @classmethod
    def poll(cls, context: Context) -> bool:
        """Show panel always."""
        return True
    
    def draw(self, context: Context) -> None:
        """Draw the panel UI."""
        layout = self.layout
        
        # Check if repository is initialized
        from ..utils.helpers import is_repository_initialized
        if not is_repository_initialized(context):
            box = layout.box()
            box.label(text="Repository not initialized", icon='ERROR')
            if not bpy.data.filepath:
                box.label(text="Please save the Blender file first", icon='INFO')
            else:
                row = box.row()
                row.scale_y = 1.2
                row.operator("df.init_project", text="Init Project", icon='FILE_NEW')
            return
        
        # Normal panel content
        scene = context.scene
        
        # Section: Branch
        layout.separator()
        box = layout.box()
        #box.label(text="Branch", icon='OUTLINER_OB_GROUP_INSTANCE')
        
        current_branch = get_current_branch_name(context)
        row = box.row()
        row.label(text=f"Branch: {current_branch}", icon='OUTLINER_OB_GROUP_INSTANCE')
        row = box.row()
        row.scale_y = 1.2
        op = row.operator("df.load_branch_commits", text="Load Commits", icon='FILE_REFRESH')
        op.branch_name = current_branch
        
        # Section: Commits (shared list for both tabs)
        layout.separator()
        box = layout.box()
        box.label(text="Commits", icon='COMMUNITY')
        
        # Auto-refresh if list is empty and file is saved
        commits = context.scene.df_commits
        if len(commits) == 0 and bpy.data.filepath:
            # Try to auto-load
            try:
                bpy.ops.df.refresh_history()
            except (RuntimeError, AttributeError, KeyError) as e:
                logger.debug(f"Failed to auto-refresh history: {e}")
            except Exception as e:
                logger.warning(f"Unexpected error auto-refreshing history: {e}")
        
        # Commit list — one for both Project and Selected Object tabs
        if len(commits) == 0:
            box.label(text="No commits found", icon='INFO')
            row = box.row()
            row.operator("df.refresh_history", icon='FILE_REFRESH', text="Refresh Commits")
        else:
            row = box.row()
            row.template_list(
                "DF_UL_commit_list", "",
                context.scene, "df_commits",
                context.scene, "df_commit_list_index",
                rows=5
            )
        
        commit_list_index = context.scene.df_commit_list_index
        
        # Tab switcher (Project / Selected Object)
        props = context.scene.df_commit_props
        row = box.row()
        row.prop(props, "load_commit_tab", expand=True)
        
        # Show content based on selected tab
        if props.load_commit_tab == 'SELECTED':
            # Selected Object tab
            self._draw_selected_object_tab(context, box, props, commits, commit_list_index)
        else:
            # Project tab
            self._draw_project_tab(context, box, commits, commit_list_index)

    def _draw_project_tab(self, context: Context, layout: Any, commits: Any, commit_list_index: int) -> None:
        """Draw Project tab content (commit list is above tab switcher)."""
        # Selected commit details
        if commits and len(commits) > 0 and 0 <= commit_list_index < len(commits):
            commit = commits[commit_list_index]

            # Check that the commit is valid (has a hash)
            if commit and commit.hash:
                box = layout.box()

                # Commit details: Author, Hash, Message, Tag, HEAD (if exists)
                box.label(text=f"Author: {commit.author}")
                box.label(text=f"Hash: {commit.hash}")
                box.label(text=f"Message: {commit.message}")
                # Always show Tag (even if empty)
                tag_value = commit.tag if commit.tag else "(нет)"
                box.label(text=f"Tag: {tag_value}")
                is_head_commit = getattr(commit, 'is_head', False)
                if is_head_commit:
                    box.label(text="HEAD: true", icon='BOOKMARKS')

                # Action buttons - Compare button
                layout.separator()
                row = layout.row()
                row.scale_y = 1.2

                # Check if project comparison is active for this commit
                scene = context.scene
                is_project_comparison_active = (
                    getattr(scene, 'df_project_comparison_active', False) and
                    getattr(scene, 'df_project_comparison_commit_hash', '') == commit.hash
                )

                op = row.operator("df.compare_project", text="Compare", icon='SPLIT_HORIZONTAL', depress=is_project_comparison_active)
                op.commit_hash = commit.hash

                row = layout.row()
                row.scale_y = 1.2
                op = row.operator("df.restore_version", text="Restore This Version", icon='FILE_REFRESH')
                op.commit_hash = commit.hash

    def _draw_selected_object_tab(self, context: Context, layout: Any, props: Any, commits: Any, commit_list_index: int) -> None:
        """Draw Selected Object tab content (commit list is above tab switcher)."""
        active_obj = context.active_object
        
        # Show selected object name
        layout.separator()
        box = layout.box()
        if active_obj:
            # Get icon based on object type
            icon_map = {
                'MESH': 'MESH_DATA',
                'LIGHT': 'LIGHT',
                'CAMERA': 'CAMERA',
                'ARMATURE': 'ARMATURE_DATA',
                'CURVE': 'CURVE_DATA',
                'SURFACE': 'SURFACE_DATA',
                'META': 'META_DATA',
                'FONT': 'FONT_DATA',
                'LATTICE': 'LATTICE_DATA',
                'GPENCIL': 'GREASEPENCIL',
                'VOLUME': 'VOLUME_DATA',
            }
            icon = icon_map.get(active_obj.type, 'OBJECT_DATA')
            obj_type_label = active_obj.type.lower().replace('_', ' ').title()
            box.label(text=f"Selected {obj_type_label}: {active_obj.name}", icon=icon)
            has_selected_object = True
        else:
            box.label(text="No object selected", icon='ERROR')
            has_selected_object = False
        
        # Resolve selected commit (list is drawn above tab switcher)
        commit = None
        if commits and len(commits) > 0 and 0 <= commit_list_index < len(commits):
            commit = commits[commit_list_index]
        
        # Action buttons
        if has_selected_object and commit and commit.hash:
            layout.separator()
            
            # Show commit and object info
            info_box = layout.box()
            info_box.label(text=f"Commit: {commit.hash[:16]}...", icon='COMMUNITY')
            info_box.label(text=f"Object: {active_obj.name} ({active_obj.type})", icon='OBJECT_DATA')
            
            # Offset settings section
            layout.separator()
            offset_box = layout.box()
            offset_box.label(text="Offset", icon='ARROW_LEFTRIGHT')
            
            # Axis selection (tabs)
            row = offset_box.row()
            row.prop(props, "offset_axis", expand=True)
            
            # Offset value input
            row = offset_box.row()
            row.prop(props, "offset_value", text="Offset")
            
            layout.separator()
            
            # Check if compare object is active for this commit
            scene = context.scene
            is_compare_active = (
                getattr(scene, 'df_compare_object_active', False) and
                getattr(scene, 'df_compare_object_commit_hash', '') == commit.hash
            )
            
            # Compare Object section
            compare_box = layout.box()
            compare_box.label(text="Compare Object", icon='LINKED')
            
            # Ghost mode checkbox
            row = compare_box.row()
            row.prop(props, "ghost_mode", text="Ghost Mode")
            compare_box.label(text="Wireframe display, hidden from selection", icon='INFO')
            
            # Compare Object button
            row = layout.row()
            row.scale_y = 1.5
            op = row.operator("df.compare_object", text="Compare Object", icon='LINKED', depress=is_compare_active)
            op.commit_hash = commit.hash
            op.ghost_mode = props.ghost_mode if hasattr(props, 'ghost_mode') else False
            
            # Retrieve Objects section
            retrieve_box = layout.box()
            retrieve_box.label(text="Retrieve Objects", icon='FILE_REFRESH')
            
            # Replace mode checkbox
            row = retrieve_box.row()
            row.prop(props, "replace_mode", text="Replace Mode")
            retrieve_box.label(text="Replace: removes original objects", icon='INFO')
            retrieve_box.label(text="Retrieve: adds objects without removing", icon='INFO')
            
            # Retrieve Objects button
            row = layout.row()
            row.scale_y = 1.5
            op = row.operator("df.replace_mesh", text="Retrieve Objects", icon='FILE_REFRESH')
            op.commit_hash = commit.hash
            op.replace_mode = props.replace_mode if hasattr(props, 'replace_mode') else True
            
            # Show count of selected objects
            selected_count = len(context.selected_objects)
            if selected_count > 0:
                layout.label(text=f"{selected_count} object(s) selected", icon='OBJECT_DATA')
        elif not has_selected_object:
            layout.separator()
            box = layout.box()
            box.label(text="Select an object to use this feature", icon='INFO')
        elif not commit:
            layout.separator()
            box = layout.box()
            box.label(text="Select a commit from the list", icon='INFO')


class DF_PT_object_history_panel(Panel):
    """Panel for object history."""
    bl_label = "Object History"
    bl_idname = "DF_PT_object_history_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = "Difference Machine"
    bl_order = 3
    
    @classmethod
    def poll(cls, context: Context) -> bool:
        """Show panel only if object is selected and repository is initialized."""
        from ..utils.helpers import is_repository_initialized
        return is_repository_initialized(context) and context.active_object is not None
    
    def draw(self, context: Context) -> None:
        """Draw the panel UI."""
        layout = self.layout
        active_obj = context.active_object
        
        if not active_obj:
            box = layout.box()
            box.label(text="No object selected", icon='INFO')
            return
        
        # Get repository path
        from ..utils.helpers import get_repository_path, find_repository_root
        repo_path, error_msg = get_repository_path()
        if not repo_path:
            box = layout.box()
            box.label(text="Repository not found", icon='ERROR')
            return
        
        # Get file path relative to repo
        if not bpy.data.filepath:
            box = layout.box()
            box.label(text="Please save the Blender file first", icon='INFO')
            return
        
        blend_file = Path(bpy.data.filepath)
        file_path = blend_file.relative_to(repo_path) if repo_path in blend_file.parents else blend_file.name
        
        # Show object info
        box = layout.box()
        box.label(text=f"Object: {active_obj.name}", icon='OBJECT_DATA')
        box.label(text=f"Type: {active_obj.type}")
        box.label(text=f"File: {file_path}")
        
        layout.separator()
        
        # Load object history
        from ..utils.object_history import compare_object_history
        
        try:
            versions = compare_object_history(active_obj.name, file_path, repo_path)
            
            if not versions:
                box = layout.box()
                box.label(text="No history found", icon='INFO')
                box.label(text="Object history will appear after commits")
                return
            
            # Show history timeline
            history_box = layout.box()
            history_box.label(text="History Timeline", icon='TIME')
            
            # Icon mapping for change types
            change_icons = {
                'CREATED': 'ADD',
                'MAJOR': 'MODIFIER_ON',
                'MINOR': 'GREASEPENCIL',
                'MOVED': 'ARROW_LEFTRIGHT',
                'RECORD': 'FILE_BLEND',
            }
            
            # Show versions (most recent first)
            for i, version in enumerate(versions[:10]):  # Show last 10 versions
                change_type = version.get('change_type')
                commit_hash = version.get('commit_hash', '')
                details = version.get('details', {})
                message = version.get('message', '')
                author = version.get('author', '')
                timestamp = version.get('timestamp', 0)
                
                # Version row
                row = history_box.row()
                row.alignment = 'LEFT'
                
                # Change type icon
                icon = change_icons.get(change_type, 'DOT')
                row.label(text="", icon=icon)
                
                # Commit hash (short)
                commit_short = commit_hash[:16] + "..." if len(commit_hash) > 16 else commit_hash
                row.label(text=commit_short)
                
                # Change type label
                if change_type:
                    row.label(text=change_type)
                
                # Details
                if details:
                    v_count = details.get('v_count', 0)
                    if v_count > 0:
                        row.label(text=f"{v_count} verts")
                
                # Expandable box for details
                if i < 5:  # Show details for first 5
                    detail_row = history_box.row()
                    detail_row.scale_y = 0.8
                    if message:
                        detail_row.label(text=f"  {message[:50]}...", icon='TEXT')
                    if author:
                        detail_row.label(text=f"by {author}", icon='USER')
                    
                    # Button to go to commit
                    if commit_hash:
                        op_row = history_box.row()
                        op_row.scale_y = 0.8
                        op = op_row.operator("df.refresh_history", text="View Commit", icon='COMMUNITY')
                        # Note: This would need a custom operator to jump to specific commit
                        
        except Exception as e:
            logger.error(f"Failed to load object history: {e}", exc_info=True)
            box = layout.box()
            box.label(text="Error loading history", icon='ERROR')
            box.label(text=str(e))


class DF_PT_mark_to_panel(Panel):
    """Panel for marking objects with tags."""
    bl_label = "Mark To"
    bl_idname = "DF_PT_mark_to_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = "Difference Machine"
    bl_order = 5
    
    @classmethod
    def poll(cls, context: Context) -> bool:
        """Show panel when repository is initialized."""
        from ..utils.helpers import is_repository_initialized
        return is_repository_initialized(context)
    
    def draw(self, context: Context) -> None:
        """Draw the panel UI."""
        layout = self.layout
        selected = context.selected_objects

        from ..utils.helpers import get_repository_path
        from ..utils.object_mark_sync import get_target_commit_hash, schedule_ensure_marks_loaded

        repo_path, _ = get_repository_path()
        if repo_path:
            schedule_ensure_marks_loaded(context, repo_path)

        if not selected:
            box = layout.box()
            box.label(text="No objects selected", icon='INFO')
        
        # Show selected objects count
        box = layout.box()
        box.label(text=f"{len(selected)} object(s) selected", icon='OBJECT_DATA')
        
        layout.separator()
        
        # Tag selection and operations — always visible; operators validate selection
        tag_box = layout.box()
        tag_box.label(text="Tag Operations", icon='BOOKMARKS')
        
        props = context.scene.df_commit_props
        
        row = tag_box.row()
        row.prop(props, "selected_tag", text="Tag", expand=False)
        
        row = tag_box.row()
        row.scale_y = 1.2
        row.enabled = bool(selected)
        row.operator("df.tag_mark", text="Mark", icon='BOOKMARKS')
        row.operator("df.tag_delete_mark", text="Delete Mark", icon='TRASH')

        row = tag_box.row()
        row.scale_y = 1.2
        row.enabled = bool(repo_path)
        row.operator("df.tag_clean_all_marks", text="Clean all Mark", icon='BRUSH_DATA')
        
        layout.separator()

        scene = context.scene
        if hasattr(scene, 'df_objects') and len(scene.df_objects) > 0:
            objects_box = layout.box()
            objects_box.label(text="Tagged Objects", icon='BOOKMARKS')

            if repo_path:
                commit_hash = get_target_commit_hash(context, repo_path)
                
                has_tagged = False
                
                for entry in scene.df_objects:
                    if entry.commit_hash == commit_hash:
                        has_tagged = True
                        row = objects_box.row()
                        row.label(text=entry.object_name, icon='OBJECT_DATA')
                        tags = entry.get_tags()
                        if tags:
                            # Show tags with icons
                            tag_icons = {
                                'DELETE': 'TRASH',
                                'RENAME': 'SORTALPHA',
                                'MERGE': 'ARROW_LEFTRIGHT',
                            }
                            for tag in tags:
                                icon = tag_icons.get(tag, 'DOT')
                                row.label(text=tag, icon=icon)
                        
                        # Show new name if RENAME tag
                        if 'RENAME' in tags:
                            metadata = entry.get_metadata()
                            new_name = metadata.get('new_name', '')
                            if new_name:
                                row = objects_box.row()
                                row.scale_y = 0.8
                                row.label(text=f"  → {new_name}", icon='ARROW_LEFTRIGHT')
                
                if not has_tagged:
                    objects_box.label(text="No tags on selected objects", icon='INFO')


class DF_PT_lock_panel(Panel):
    """Panel for file lock management."""
    bl_label = "File Locks"
    bl_idname = "DF_PT_lock_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = "Difference Machine"
    bl_order = 4
    
    @classmethod
    def poll(cls, context: Context) -> bool:
        """Show panel always."""
        return True

    def draw(self, context: Context) -> None:
        """Draw the panel UI."""
        layout = self.layout
        
        from ..utils.helpers import is_repository_initialized, get_repository_path, check_locked_files
        repo_initialized = is_repository_initialized(context)
        
        if not repo_initialized:
            box = layout.box()
            box.label(text="Repository not initialized", icon='ERROR')
            return
        
        row = layout.row()
        row.scale_y = 1.2
        row.operator("df.check_locks", text="Check Current Files", icon='VIEWZOOM')
        
        layout.separator()
        col = layout.column(align=True)
        row = col.row()
        row.scale_y = 1.2
        row.enabled = bool(bpy.data.filepath)
        row.operator("df.lock_current_blend", text="Lock Files", icon='LOCKED')
        
        row = col.row()
        row.scale_y = 1.2
        row.enabled = bool(bpy.data.filepath)
        row.operator("df.unlock_current_blend", text="Unlock Files", icon='UNLOCKED')
        
        layout.separator()
        row = layout.row()
        row.operator("df.list_locks", text="List All Locks", icon='FILE_TEXT')
        
        layout.separator()
        repo_path, error = get_repository_path()
        if repo_path:
            locked_files = check_locked_files(repo_path)
            
            if locked_files:
                box = layout.box()
                box.label(text=f"⚠️ {len(locked_files)} file(s) locked:", icon='ERROR')
                
                for file_path, lock_info in list(locked_files.items())[:5]:
                    lock_type = lock_info.get('lock_type', 0)
                    lock_type_str = "shared" if lock_type == 1 else "exclusive"
                    user = lock_info.get('user', 'Unknown')
                    expires_at = lock_info.get('expires_at')
                    
                    row = box.row()
                    row.scale_y = 0.8
                    file_name = file_path.name
                    lock_msg = f"{file_name} ({lock_type_str}) by {user}"
                    if expires_at:
                        from datetime import datetime
                        try:
                            exp_dt = datetime.fromtimestamp(expires_at)
                            lock_msg += f" until {exp_dt.strftime('%Y-%m-%d %H:%M')}"
                        except (ValueError, OSError, OverflowError) as e:
                            logger.debug(f"Failed to format expiration date: {e}")
                        except Exception as e:
                            logger.warning(f"Unexpected error formatting expiration date: {e}")
                    row.label(text=lock_msg, icon='LOCKED')
                
                if len(locked_files) > 5:
                    box.label(text=f"... and {len(locked_files) - 5} more", icon='DOT')
            else:
                box = layout.box()
                box.label(text="No locked files", icon='CHECKMARK')


# Registration is handled by ui_main.py

