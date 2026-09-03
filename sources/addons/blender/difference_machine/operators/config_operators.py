"""
Operators for configuration management.
"""

import bpy
from bpy.types import Operator

from ..utils.config_loader import save_user_config, save_gc_config


class DF_OT_sync_preferences(Operator):
    """Sync preferences with setup.cfg."""

    bl_idname = "df.sync_preferences"
    bl_label = "Sync Preferences"
    bl_description = "Synchronize addon preferences with setup.cfg configuration file"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        from ..utils.helpers import get_addon_preferences

        prefs = get_addon_preferences(context)
        if not hasattr(prefs, "load_from_config"):
            self.report({"ERROR"}, "Preferences not available")
            return {"CANCELLED"}

        prefs.load_from_config()
        save_user_config(prefs.default_author, prefs.user_email)
        from ..utils.config_loader import parse_schedule_time
        hour, minute = parse_schedule_time(prefs.gc_schedule_time)
        save_gc_config(
            enabled=prefs.gc_enabled,
            reflog_expire_days=prefs.reflog_expire_days,
            schedule_enabled=prefs.gc_schedule_enabled,
            interval_days=prefs.gc_interval_days,
            schedule_hour=hour,
            schedule_minute=minute,
        )
        self.report({"INFO"}, "Preferences synchronized with setup.cfg")
        return {"FINISHED"}


def register():
    from ..utils.registration import register_classes

    register_classes([DF_OT_sync_preferences])


def unregister():
    from ..utils.registration import unregister_classes

    unregister_classes([DF_OT_sync_preferences])
