"""
Operators for repository initialization.
"""

import bpy
from bpy.types import Operator
from pathlib import Path
from ..utils.forester_api import get_api
from ..utils.helpers import find_repository_root, invalidate_repository_root_cache


class DF_OT_init_project(Operator):
    """Initialize a new Forester repository."""
    bl_idname = "df.init_project"
    bl_label = "Init Project"
    bl_description = "Initialize a new Forester repository in the current directory"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        if not bpy.data.filepath:
            self.report({'ERROR'}, "Please save the Blender file first")
            return {'CANCELLED'}
        
        blend_file = Path(bpy.data.filepath)
        project_root = blend_file.parent
        
        # Check if repository already exists
        repo_path = find_repository_root(project_root)
        if repo_path:
            self.report({'WARNING'}, f"Repository already exists at {repo_path}")
            return {'CANCELLED'}
        
        # Initialize repository
        api = get_api()
        success, error_msg = api.init(project_root)
        
        if success:
            invalidate_repository_root_cache()
            from ..ui.ui_panels import reset_panel_auto_load
            reset_panel_auto_load()
            self.report({'INFO'}, f"Repository initialized in {project_root}")
            return {'FINISHED'}
        else:
            self.report({'ERROR'}, f"Failed to initialize repository: {error_msg}")
            return {'CANCELLED'}


def register():
    from ..utils.registration import register_classes
    register_classes([DF_OT_init_project])


def unregister():
    from ..utils.registration import unregister_classes
    unregister_classes([DF_OT_init_project])
