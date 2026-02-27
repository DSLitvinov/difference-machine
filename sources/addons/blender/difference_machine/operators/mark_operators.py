"""
Operators for marking objects with tags (DELETE, RENAME, MERGE, etc.).
Marks apply to the commit selected in the Compare panel, or HEAD if none selected.
No commit is created from Blender — user creates commits via CLI or DiffMachine GUI.
"""

import bpy
import logging
from bpy.types import Operator, Context
from pathlib import Path
from typing import List

from ..utils.forester_api import get_api
from ..utils.helpers import get_repository_path

logger = logging.getLogger(__name__)


def _get_target_commit_hash(context: Context, repo_path: Path) -> str:
    """Commit to which marks apply: selected in Compare panel, or HEAD."""
    scene = getattr(context, "scene", None) if context else None
    if scene is not None:
        commits = getattr(scene, "df_commits", [])
        idx = getattr(scene, "df_commit_list_index", 0)
        if commits and 0 <= idx < len(commits):
            h = getattr(commits[idx], "hash", "") or ""
            if h and str(h).strip():
                return str(h).strip()
    api = get_api()
    success, status_data, _ = api.status(repo_path)
    if success and status_data:
        return (status_data.get("head") or "").strip()
    return ""


def _get_file_path(repo_path: Path) -> str:
    """Get current file path relative to repo."""
    if not bpy.data.filepath:
        return ""
    blend_file = Path(bpy.data.filepath)
    try:
        return str(blend_file.relative_to(repo_path))
    except ValueError:
        return str(blend_file.name)


def _check_tag_conflict(tags: List[str], new_tag: str) -> bool:
    """Check if adding new_tag would conflict with existing tags."""
    # MERGE and DELETE are mutually exclusive
    if new_tag == 'MERGE' and 'DELETE' in tags:
        return True
    if new_tag == 'DELETE' and 'MERGE' in tags:
        return True
    # RENAME doesn't conflict with others, but we check anyway for consistency
    return False


def _add_tag_to_objects(
    objects: List[bpy.types.Object], tag: str, repo_path: Path, commit_hash: str
) -> tuple:
    """
    Add tag to objects in scene for the given commit.
    Returns:
        (success: bool, message: str)
    """
    file_path = _get_file_path(repo_path)
    
    scene = bpy.context.scene
    if not hasattr(scene, 'df_objects'):
        return False, "Objects collection not available"
    
    conflicted_objects = []
    
    for obj in objects:
        # Find or create object entry
        obj_entry = None
        for entry in scene.df_objects:
            if entry.object_name == obj.name and entry.commit_hash == commit_hash:
                obj_entry = entry
                break
        
        if not obj_entry:
            obj_entry = scene.df_objects.add()
            obj_entry.object_name = obj.name
            obj_entry.object_type = obj.type
            obj_entry.file_path = file_path
            obj_entry.commit_hash = commit_hash
        
        # Check for conflicts
        tags = obj_entry.get_tags()
        if _check_tag_conflict(tags, tag):
            conflicted_objects.append(obj.name)
            continue
        
        # Add tag
        if tag not in tags:
            tags.append(tag)
            obj_entry.set_tags(tags)
        
    if conflicted_objects:
        return False, f"Tag conflict: {tag} cannot be added to {', '.join(conflicted_objects)} (conflicting tag exists)"
    
    return True, f"Tagged {len(objects)} object(s) with {tag}"


def _remove_tag_from_objects(
    objects: List[bpy.types.Object], tag: str, repo_path: Path, commit_hash: str
) -> None:
    """Remove tag from objects for the given commit."""
    file_path = _get_file_path(repo_path)
    scene = bpy.context.scene
    
    if not hasattr(scene, 'df_objects'):
        return
    
    for obj in objects:
        for entry in scene.df_objects:
            if entry.object_name == obj.name and entry.commit_hash == commit_hash:
                tags = entry.get_tags()
                if tag in tags:
                    tags.remove(tag)
                    entry.set_tags(tags)
                break


class DF_OT_tag_mark(Operator):
    """Add tag to selected objects."""
    bl_idname = "df.tag_mark"
    bl_label = "Mark"
    bl_description = "Add selected tag to selected objects"
    bl_options = {'REGISTER', 'UNDO'}
    
    new_name: bpy.props.StringProperty(name="New Name", description="New name for the object(s)")
    
    def invoke(self, context, event):
        """Show dialog for RENAME tag, otherwise execute directly."""
        selected = context.selected_objects
        if not selected:
            self.report({'ERROR'}, "Please select at least one object")
            return {'CANCELLED'}
        
        props = context.scene.df_commit_props
        tag = props.selected_tag
        
        if not tag:
            self.report({'ERROR'}, "Please select a tag")
            return {'CANCELLED'}
        
        # Special handling for RENAME tag - show dialog
        if tag == 'RENAME':
            # Set default name from first selected object
            if len(selected) == 1:
                self.new_name = selected[0].name
            else:
                self.new_name = ""
            return context.window_manager.invoke_props_dialog(self, width=400)
        
        # For other tags, execute directly
        return self.execute(context)
    
    def draw(self, context):
        """Draw dialog for RENAME tag."""
        layout = self.layout
        layout.prop(self, "new_name")
    
    def execute(self, context):
        """Execute marking with tag."""
        selected = context.selected_objects
        if not selected:
            self.report({'ERROR'}, "Please select at least one object")
            return {'CANCELLED'}
        
        props = context.scene.df_commit_props
        tag = props.selected_tag
        
        if not tag:
            self.report({'ERROR'}, "Please select a tag")
            return {'CANCELLED'}
        
        repo_path, error = get_repository_path()
        if not repo_path:
            self.report({'ERROR'}, error)
            return {'CANCELLED'}
        
        file_path = _get_file_path(repo_path)
        
        # Special handling for RENAME tag
        if tag == 'RENAME':
            if not self.new_name or not self.new_name.strip():
                self.report({'ERROR'}, "New name is required")
                return {'CANCELLED'}
            target_commit = _get_target_commit_hash(context, repo_path)
            if not target_commit:
                self.report({'ERROR'}, "No commit selected. Select a commit in Compare panel or ensure HEAD exists.")
                return {'CANCELLED'}
            scene = context.scene
            for obj in selected:
                # Find or create object entry
                obj_entry = None
                for entry in scene.df_objects:
                    if entry.object_name == obj.name and entry.commit_hash == target_commit:
                        obj_entry = entry
                        break
                
                if not obj_entry:
                    obj_entry = scene.df_objects.add()
                    obj_entry.object_name = obj.name
                    obj_entry.object_type = obj.type
                    obj_entry.file_path = file_path
                    obj_entry.commit_hash = target_commit
                
                # Check for conflicts
                tags = obj_entry.get_tags()
                if _check_tag_conflict(tags, 'RENAME'):
                    self.report({'ERROR'}, f"Tag conflict: RENAME cannot be added to {obj.name} (conflicting tag exists)")
                    return {'CANCELLED'}
                
                # Add RENAME tag
                if 'RENAME' not in tags:
                    tags.append('RENAME')
                    obj_entry.set_tags(tags)
                
                # Set new name in metadata
                metadata = obj_entry.get_metadata()
                metadata['new_name'] = self.new_name.strip()
                obj_entry.set_metadata(metadata)
            
            self.report({'INFO'}, f"Tagged {len(selected)} object(s) for renaming")
            return {'FINISHED'}
        
        # For other tags (DELETE, MERGE)
        target_commit = _get_target_commit_hash(context, repo_path)
        if not target_commit:
            self.report({'ERROR'}, "No commit selected. Select a commit in Compare panel or ensure HEAD exists.")
            return {'CANCELLED'}
        success, message = _add_tag_to_objects(selected, tag, repo_path, target_commit)
        if success:
            self.report({'INFO'}, message)
        else:
            self.report({'ERROR'}, message)
        return {'FINISHED'}


class DF_OT_tag_rename(Operator):
    """Tag selected objects for renaming."""
    bl_idname = "df.tag_rename"
    bl_label = "Tag: Rename"
    bl_description = "Add RENAME tag to selected objects"
    bl_options = {'REGISTER', 'UNDO'}
    
    new_name: bpy.props.StringProperty(name="New Name", description="New name for the object")
    
    def invoke(self, context, event):
        selected = context.selected_objects
        if not selected:
            self.report({'ERROR'}, "Please select at least one object")
            return {'CANCELLED'}
        
        if len(selected) == 1:
            self.new_name = selected[0].name
        else:
            self.new_name = ""
        
        return context.window_manager.invoke_props_dialog(self)
    
    def execute(self, context):
        selected = context.selected_objects
        if not self.new_name or not self.new_name.strip():
            self.report({'ERROR'}, "New name is required")
            return {'CANCELLED'}
        
        repo_path, error = get_repository_path()
        if not repo_path:
            self.report({'ERROR'}, error)
            return {'CANCELLED'}
        
        file_path = _get_file_path(repo_path)
        commit_hash = _get_target_commit_hash(context, repo_path)
        if not commit_hash:
            self.report({'ERROR'}, "No commit selected. Select a commit in Compare panel.")
            return {'CANCELLED'}
        
        scene = context.scene
        for obj in selected:
            # Find or create object entry
            obj_entry = None
            for entry in scene.df_objects:
                if entry.object_name == obj.name and entry.commit_hash == commit_hash:
                    obj_entry = entry
                    break
            
            if not obj_entry:
                obj_entry = scene.df_objects.add()
                obj_entry.object_name = obj.name
                obj_entry.object_type = obj.type
                obj_entry.file_path = file_path
                obj_entry.commit_hash = commit_hash
            
            # Add RENAME tag
            tags = obj_entry.get_tags()
            if 'RENAME' not in tags:
                tags.append('RENAME')
                obj_entry.set_tags(tags)
            
            # Set new name in metadata
            metadata = obj_entry.get_metadata()
            metadata['new_name'] = self.new_name.strip()
            obj_entry.set_metadata(metadata)
        
        self.report({'INFO'}, f"Tagged {len(selected)} object(s) for renaming")
        return {'FINISHED'}


class DF_OT_tag_merge(Operator):
    """Tag selected objects for merge."""
    bl_idname = "df.tag_merge"
    bl_label = "Tag: Merge"
    bl_description = "Add MERGE tag to selected objects"
    bl_options = {'REGISTER', 'UNDO'}
    
    def execute(self, context):
        selected = context.selected_objects
        if not selected:
            self.report({'ERROR'}, "Please select at least one object")
            return {'CANCELLED'}
        
        repo_path, error = get_repository_path()
        if not repo_path:
            self.report({'ERROR'}, error)
            return {'CANCELLED'}
        
        target_commit = _get_target_commit_hash(context, repo_path)
        if not target_commit:
            self.report({'ERROR'}, "No commit selected. Select a commit in Compare panel or ensure HEAD exists.")
            return {'CANCELLED'}
        success, message = _add_tag_to_objects(selected, 'MERGE', repo_path, target_commit)
        if success:
            self.report({'INFO'}, message)
        else:
            self.report({'ERROR'}, message)
        return {'FINISHED'}


class DF_OT_tag_delete_mark(Operator):
    """Remove tag from selected objects."""
    bl_idname = "df.tag_delete_mark"
    bl_label = "Delete Mark"
    bl_description = "Remove selected tag from selected objects"
    bl_options = {'REGISTER', 'UNDO'}
    
    def execute(self, context):
        selected = context.selected_objects
        if not selected:
            self.report({'ERROR'}, "Please select at least one object")
            return {'CANCELLED'}
        
        props = context.scene.df_commit_props
        tag = props.selected_tag
        
        if not tag:
            self.report({'ERROR'}, "Please select a tag")
            return {'CANCELLED'}
        
        repo_path, error = get_repository_path()
        if not repo_path:
            self.report({'ERROR'}, error)
            return {'CANCELLED'}
        
        target_commit = _get_target_commit_hash(context, repo_path)
        if not target_commit:
            self.report({'ERROR'}, "No commit selected. Select a commit in Compare panel.")
            return {'CANCELLED'}
        _remove_tag_from_objects(selected, tag, repo_path, target_commit)
        self.report({'INFO'}, f"Removed tag '{tag}' from {len(selected)} object(s)")
        return {'FINISHED'}


def register():
    """Register operators."""
    from ..utils.registration import register_classes
    classes = [
        DF_OT_tag_mark,
        DF_OT_tag_delete_mark,
        # Keep old operators for backward compatibility (but they won't be used in UI)
        DF_OT_tag_rename,
        DF_OT_tag_merge,
    ]
    register_classes(classes)


def unregister():
    """Unregister operators."""
    from ..utils.registration import unregister_classes
    classes = [
        DF_OT_tag_merge,
        DF_OT_tag_rename,
        DF_OT_tag_delete_mark,
        DF_OT_tag_mark,
    ]
    unregister_classes(classes)
