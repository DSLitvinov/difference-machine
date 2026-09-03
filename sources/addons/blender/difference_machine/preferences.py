"""
Preferences for Difference Machine addon.
"""

import bpy
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
        name="Delete commits in the reflog (days)",
        description="Number of days to keep commits in reflog before they can be deleted",
        default=90,
        min=1,
        max=3650,
        update=lambda self, context: self._on_gc_changed(),
    )

    gc_enabled: BoolProperty(
        name="Delete commits in the reflog (days)",
        description="Expire old reflog commits during garbage collection",
        default=False,
        update=lambda self, context: self._on_gc_changed(),
    )

    gc_schedule_enabled: BoolProperty(
        name="Delete on a schedule",
        description="Run garbage collection automatically",
        default=False,
        update=lambda self, context: self._on_gc_changed(),
    )

    gc_interval_days: IntProperty(
        name="Every days",
        description="Run scheduled garbage collection every N days",
        default=7,
        min=1,
        max=365,
        update=lambda self, context: self._on_gc_changed(),
    )

    gc_schedule_time: StringProperty(
        name="Time (24 h)",
        description="Local time to run scheduled garbage collection",
        default="07:00",
        update=lambda self, context: self._on_gc_changed(),
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
        """Save GC settings to shared setup.cfg [gc]."""
        from .utils.config_loader import save_gc_config, parse_schedule_time
        hour, minute = parse_schedule_time(self.gc_schedule_time)
        save_gc_config(
            enabled=self.gc_enabled,
            reflog_expire_days=self.reflog_expire_days,
            schedule_enabled=self.gc_schedule_enabled,
            interval_days=self.gc_interval_days,
            schedule_hour=hour,
            schedule_minute=minute,
        )

    def load_from_config(self):
        """Load preferences from setup.cfg."""
        from .utils.config_loader import get_user_config, get_gc_config
        
        # Load user config
        user_config = get_user_config()
        if user_config.get("name"):
            self.default_author = user_config["name"]
        if user_config.get("email"):
            self.user_email = user_config["email"]
        
        gc_config = get_gc_config()
        self.gc_enabled = gc_config["enabled"]
        self.reflog_expire_days = gc_config["reflog_expire_days"]
        self.gc_schedule_enabled = gc_config["schedule_enabled"]
        self.gc_interval_days = gc_config["interval_days"]
        self.gc_schedule_time = f"{int(gc_config['schedule_hour']):02d}:{int(gc_config['schedule_minute']):02d}"

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
        
        # Garbage collection settings — same [gc] keys as GUI Settings
        box = layout.box()
        box.label(text="Garbage Collection", icon='BRUSH_DATA')
        box.prop(self, "gc_enabled", text="Delete commits in the reflog (days)")
        row = box.row()
        row.enabled = self.gc_enabled
        row.prop(self, "reflog_expire_days", text="")
        box.prop(self, "gc_schedule_enabled", text="Delete on a schedule")
        row = box.row()
        row.enabled = self.gc_schedule_enabled
        row.prop(self, "gc_interval_days", text="Every days")
        row = box.row()
        row.enabled = self.gc_schedule_enabled
        row.prop(self, "gc_schedule_time", text="Time (24 h)")

        from .utils.helpers import find_repository_root
        blend_file = Path(bpy.data.filepath) if bpy.data.filepath else None
        repo_exists = False
        if blend_file:
            repo_path = find_repository_root(blend_file.parent)
            repo_exists = repo_path is not None

        row = box.row()
        row.scale_y = 1.5
        row.enabled = repo_exists
        try:
            op = row.operator("df.garbage_collect", text="Remove now", icon='BRUSH_DATA')
            if op:
                op.dry_run = False
        except (AttributeError, KeyError, RuntimeError) as e:
            logger.debug("Garbage collect operator not available: %s", e)
            row.enabled = False
            row.label(text="Remove now (operator not available)", icon='ERROR')
        except Exception as e:
            logger.warning("Unexpected error accessing garbage collect operator: %s", e)
            row.enabled = False
            row.label(text="Remove now (operator not available)", icon='ERROR')
        if not repo_exists:
            box.label(text="Save Blender file to run garbage collection", icon='INFO')

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
