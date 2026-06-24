"""
Preferences for Difference Machine addon.
"""

import bpy
import time
from pathlib import Path
from bpy.types import AddonPreferences
from bpy.props import StringProperty, IntProperty, BoolProperty, EnumProperty

from .utils.logging_config import get_logger

logger = get_logger(__name__)


class DifferenceMachinePreferences(AddonPreferences):
    bl_idname = __package__

    default_author: StringProperty(
        name="Default Author",
        description="Default author name for commits",
        default="Unknown",
        update=lambda self, context: self._on_author_changed(),
    )
    
    user_email: StringProperty(
        name="User Email",
        description="User email for commits",
        default="",
        update=lambda self, context: self._on_user_changed(),
    )
    
    # Reflog settings
    reflog_expire_days: IntProperty(
        name="Reflog Expiration (Days)",
        description="Number of days to keep commits in reflog before they can be deleted (like git reflog expire)",
        default=90,
        min=1,
        max=3650,  # 10 years
        update=lambda self, context: self._on_gc_changed(),
    )
    
    # Garbage collection schedule settings
    gc_schedule_enabled: BoolProperty(
        name="Enable Scheduled GC",
        description="Enable automatic garbage collection at specified time",
        default=False,
    )
    
    gc_schedule_hour: IntProperty(
        name="Hour",
        description="Hour of day to run garbage collection (0-23)",
        default=2,
        min=0,
        max=23,
    )
    
    gc_schedule_minute: IntProperty(
        name="Minute",
        description="Minute of hour to run garbage collection (0-59)",
        default=0,
        min=0,
        max=59,
    )
    
    gc_schedule_interval_days: IntProperty(
        name="Interval (Days)",
        description="Run garbage collection every N days",
        default=7,
        min=1,
        max=365,
        update=lambda self, context: self._on_gc_changed(),
    )
    
    gc_last_run: bpy.props.FloatProperty(
        name="Last Run",
        description="Timestamp of last garbage collection run",
        default=0.0,
    )
    
    # Auto Save Version settings
    auto_save_enabled: BoolProperty(
        name="Auto Save",
        description="Automatically save and commit at regular intervals",
        default=False,
    )
    
    auto_save_interval: IntProperty(
        name="Auto Save Interval (minutes)",
        description="Interval in minutes between automatic save and commit",
        default=5,
        min=1,
        max=60,
    )
    
    def _on_author_changed(self):
        """Save author to config when changed."""
        from .utils.config_loader import save_user_config, get_user_config
        user_config = get_user_config()
        save_user_config(self.default_author, user_config.get("email", ""))
    
    def _on_user_changed(self):
        """Save user email to config when changed."""
        from .utils.config_loader import save_user_config
        save_user_config(self.default_author, self.user_email)
    
    def _on_gc_changed(self):
        """Save GC settings to config when changed."""
        from .utils.config_loader import save_gc_config
        save_gc_config(self.reflog_expire_days, self.gc_schedule_interval_days)
    
    def load_from_config(self):
        """Load preferences from setup.cfg."""
        from .utils.config_loader import get_user_config, get_gc_config
        
        # Load user config
        user_config = get_user_config()
        if user_config.get("name"):
            self.default_author = user_config["name"]
        if user_config.get("email"):
            self.user_email = user_config["email"]
        
        # Load GC config
        gc_config = get_gc_config()
        if "reflog_expire_days" in gc_config:
            self.reflog_expire_days = gc_config["reflog_expire_days"]
        if "interval_days" in gc_config:
            self.gc_schedule_interval_days = gc_config["interval_days"]

    def draw(self, context):
        layout = self.layout

        # Auto Save Version settings
        box = layout.box()
        box.label(text="Save Version", icon='FILE_TICK')
        box.prop(self, "auto_save_enabled", text="Auto Save")
        box.prop(self, "auto_save_interval", text="Interval (minutes)")
        box.label(text="When enabled, file is saved and committed automatically", icon='INFO')
        
        # Main settings
        box = layout.box()
        box.label(text="Commit Settings", icon='SETTINGS')
        box.prop(self, "default_author")
        box.prop(self, "user_email")

        status_box = layout.box()
        status_box.label(text="Status", icon='INFO')
        status_box.label(text="API-only mode: legacy features disabled", icon='INFO')
        
        # Sync button
        row = box.row()
        row.operator("df.sync_preferences", icon='FILE_REFRESH', text="Sync with Config")
        
        # Garbage collection settings
        box = layout.box()
        box.label(text="Garbage Collection", icon='BRUSH_DATA')

        # Check if repository exists using API
        from .utils.helpers import find_repository_root
        from .utils.forester_api import get_api
        blend_file = Path(bpy.data.filepath) if bpy.data.filepath else None
        repo_exists = False
        if blend_file:
            repo_path = find_repository_root(blend_file.parent)
            if repo_path:
                api = get_api()
                success, _, _ = api.status(repo_path)
                repo_exists = success

        if repo_exists:
            row = box.row()
            row.scale_y = 1.5
            try:
                op = row.operator("df.garbage_collect", text="Garbage Collect Now", icon='BRUSH_DATA')
                if op:
                    op.dry_run = False
            except (AttributeError, KeyError, RuntimeError) as e:
                logger.debug("Garbage collect operator not available: %s", e)
                row.enabled = False
                row.label(text="Garbage Collect (operator not available)", icon='ERROR')
            except Exception as e:
                logger.warning("Unexpected error accessing garbage collect operator: %s", e)
                row.enabled = False
                row.label(text="Garbage Collect (operator not available)", icon='ERROR')

            box.separator()
            box.prop(self, "reflog_expire_days", text="Keep Commits in Reflog (days)")
            box.label(text="Commits older than this will be removed during GC", icon='INFO')

            box.separator()
            box.prop(self, "gc_schedule_enabled", text="Enable Scheduled GC")

            if self.gc_schedule_enabled:
                row = box.row()
                row.label(text="Run at:")
                row.prop(self, "gc_schedule_hour", text="Hour")
                row.prop(self, "gc_schedule_minute", text="Min")
                box.prop(self, "gc_schedule_interval_days", text="Every (days)")

                if self.gc_last_run > 0:
                    last_run_time = time.ctime(self.gc_last_run)
                    box.label(text=f"Last run: {last_run_time}", icon='TIME')
        else:
            box.label(text="Save Blender file to enable", icon='INFO')
            box.label(text="garbage collection tools", icon='INFO')

        # Repository maintenance
        box = layout.box()
        box.label(text="Repository Maintenance", icon='TOOL_SETTINGS')

        if repo_exists:
            row = box.row()
            row.scale_y = 1.5
            try:
                row.operator("df.verify_repository", text="Verify Repository", icon='FILE_REFRESH')
            except (AttributeError, KeyError, RuntimeError) as e:
                logger.debug("Verify repository operator not available: %s", e)
                row.enabled = False
                row.label(text="Verify Repository (operator not available)", icon='ERROR')
            except Exception as e:
                logger.warning("Unexpected error accessing verify repository operator: %s", e)
                row.enabled = False
                row.label(text="Verify Repository (operator not available)", icon='ERROR')
            box.label(text="Scan object store and report counts", icon='INFO')
        else:
            box.label(text="Save Blender file to enable", icon='INFO')
            box.label(text="repository maintenance tools", icon='INFO')


def register():
    from .utils.registration import safe_register_class
    safe_register_class(DifferenceMachinePreferences)


def unregister():
    from .utils.registration import safe_unregister_class
    safe_unregister_class(DifferenceMachinePreferences)
