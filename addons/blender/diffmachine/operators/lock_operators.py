"""
Operators for file lock management using Forester API.
"""

import bpy
from bpy.types import Operator
from pathlib import Path
from ..utils.forester_api import get_api
from ..utils.helpers import get_repository_path, get_blender_files, check_locked_files, get_addon_preferences


class DF_OT_check_locks(Operator):
    """Check locks for current Blender files."""
    bl_idname = "df.check_locks"
    bl_label = "Check Locks"
    bl_description = "Check lock status for current Blender files"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        repo_path, error_msg = get_repository_path()
        if not repo_path:
            self.report({'ERROR'}, error_msg)
            return {'CANCELLED'}

        locked_files = check_locked_files(repo_path)
        if locked_files:
            self.report({'WARNING'}, f"{len(locked_files)} file(s) locked")
        else:
            self.report({'INFO'}, "No locked files")
        return {'FINISHED'}


class DF_OT_list_locks(Operator):
    """List all locks for current branch."""
    bl_idname = "df.list_locks"
    bl_label = "List Locks"
    bl_description = "List all locks for current branch"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        repo_path, error_msg = get_repository_path()
        if not repo_path:
            self.report({'ERROR'}, error_msg)
            return {'CANCELLED'}

        api = get_api()
        success, locks, error = api.list_locks(repo_path)
        if not success:
            self.report({'ERROR'}, f"Failed to list locks: {error}")
            return {'CANCELLED'}

        if not locks:
            self.report({'INFO'}, "No locks found")
            return {'FINISHED'}

        self.report({'INFO'}, f"Found {len(locks)} lock(s)")
        return {'FINISHED'}


class DF_OT_lock_current_blend(Operator):
    """Lock current Blender files."""
    bl_idname = "df.lock_current_blend"
    bl_label = "Lock Files"
    bl_description = "Lock current Blender files"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        repo_path, error_msg = get_repository_path()
        if not repo_path:
            self.report({'ERROR'}, error_msg)
            return {'CANCELLED'}

        api = get_api()
        prefs = get_addon_preferences(context)
        user = getattr(prefs, "default_author", None) or "Unknown"

        files = get_blender_files()
        if not files:
            self.report({'WARNING'}, "No files to lock")
            return {'CANCELLED'}

        errors = []
        for file_path in files:
            success, err = api.acquire_lock(repo_path, file_path, user, lock_type=0, expire_hours=0)
            if not success:
                errors.append(f"{file_path.name}: {err}")

        if errors:
            self.report({'WARNING'}, f"Some locks failed: {errors[0]}")
            return {'CANCELLED'}

        self.report({'INFO'}, f"Locked {len(files)} file(s)")
        return {'FINISHED'}


class DF_OT_unlock_current_blend(Operator):
    """Unlock current Blender files."""
    bl_idname = "df.unlock_current_blend"
    bl_label = "Unlock Files"
    bl_description = "Unlock current Blender files"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        repo_path, error_msg = get_repository_path()
        if not repo_path:
            self.report({'ERROR'}, error_msg)
            return {'CANCELLED'}

        api = get_api()
        prefs = get_addon_preferences(context)
        user = getattr(prefs, "default_author", None) or "Unknown"

        files = get_blender_files()
        if not files:
            self.report({'WARNING'}, "No files to unlock")
            return {'CANCELLED'}

        errors = []
        for file_path in files:
            success, err = api.release_lock(repo_path, file_path, user)
            if not success:
                errors.append(f"{file_path.name}: {err}")

        if errors:
            self.report({'WARNING'}, f"Some unlocks failed: {errors[0]}")
            return {'CANCELLED'}

        self.report({'INFO'}, f"Unlocked {len(files)} file(s)")
        return {'FINISHED'}


def register():
    from ..utils.registration import register_classes
    classes_to_register = [
        DF_OT_check_locks,
        DF_OT_list_locks,
        DF_OT_lock_current_blend,
        DF_OT_unlock_current_blend,
    ]
    register_classes(classes_to_register)


def unregister():
    from ..utils.registration import unregister_classes
    classes_to_unregister = [
        DF_OT_unlock_current_blend,
        DF_OT_lock_current_blend,
        DF_OT_list_locks,
        DF_OT_check_locks,
    ]
    unregister_classes(classes_to_unregister)
