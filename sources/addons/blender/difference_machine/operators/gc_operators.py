"""
Operators for garbage collection and repository maintenance using Forester API.
"""

import bpy
from bpy.types import Operator
from ..utils.forester_api import get_api
from ..utils.helpers import get_repository_path, get_addon_preferences
import time


class DF_OT_garbage_collect(Operator):
    """Run garbage collection."""
    bl_idname = "df.garbage_collect"
    bl_label = "Garbage Collect"
    bl_description = "Remove unused objects from repository"
    bl_options = {'REGISTER', 'UNDO'}

    dry_run: bpy.props.BoolProperty(
        name="Dry Run",
        description="Preview what would be deleted without actually deleting",
        default=False,
    )

    def execute(self, context):
        repo_path, error_msg = get_repository_path()
        if not repo_path:
            self.report({'ERROR'}, error_msg)
            return {'CANCELLED'}

        prefs = get_addon_preferences(context)
        reflog_expire_days = getattr(prefs, "reflog_expire_days", 90)

        api = get_api()
        success, stats, error = api.gc(repo_path, dry_run=self.dry_run, reflog_expire_days=reflog_expire_days)
        if not success:
            self.report({'ERROR'}, f"Garbage collection failed: {error}")
            return {'CANCELLED'}

        prefs.gc_last_run = time.time()

        msg = (
            f"Deleted: {stats.get('commits_deleted', 0)} commits, "
            f"{stats.get('trees_deleted', 0)} trees, "
            f"{stats.get('blobs_deleted', 0)} blobs"
        )
        if stats.get("dry_run"):
            msg = f"Dry run: {msg}"
        self.report({'INFO'}, msg)
        return {'FINISHED'}


class DF_OT_verify_repository(Operator):
    """Scan object store and report repository statistics."""
    bl_idname = "df.verify_repository"
    bl_label = "Verify Repository"
    bl_description = "Scan object store and report commit/tree/blob counts"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        repo_path, error_msg = get_repository_path()
        if not repo_path:
            self.report({'ERROR'}, error_msg)
            return {'CANCELLED'}

        api = get_api()
        success, stats, error = api.rebuild(repo_path)
        if not success:
            self.report({'ERROR'}, f"Failed to verify repository: {error}")
            return {'CANCELLED'}

        msg = (
            f"Scan complete: commits {stats.get('commits_found', 0)}, "
            f"trees {stats.get('trees_found', 0)}, "
            f"blobs {stats.get('blobs_found', 0)}"
        )
        self.report({'INFO'}, msg)
        return {'FINISHED'}


def register():
    from ..utils.registration import register_classes
    classes_to_register = [
        DF_OT_garbage_collect,
        DF_OT_verify_repository,
    ]
    register_classes(classes_to_register)


def unregister():
    from ..utils.registration import unregister_classes
    classes_to_unregister = [
        DF_OT_verify_repository,
        DF_OT_garbage_collect,
    ]
    unregister_classes(classes_to_unregister)
