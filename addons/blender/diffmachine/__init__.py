"""
Difference Machine - Version control for Blender projects.
"""

bl_info = {
    "name": "Difference Machine",
    "author": "Dmitry Litvinov",
    "version": (0, 7, 5),
    "blender": (4, 5, 0),
    "location": "View3D > Sidebar > Difference Machine",
    "description": "Version control for Blender projects using Forester API",
    "category": "Object",
    "doc_url": "https://gitflic.ru/project/nopomuk/difference-machine",
}

import bpy
import logging
import time
import datetime
from pathlib import Path

# Setup logging to file for debugging
from .utils.logging_config import setup_logging, get_logger
log_file = Path.home() / "blender_addon.log"
setup_logging(log_level=logging.DEBUG, log_file=log_file)
logger = get_logger(__name__)

# Import modules
from . import preferences
from . import properties
from . import operators
from . import ui

# Module references for reload
_modules = [
    preferences,
    properties,
    operators,
    ui,
]


def register():
    """Register all addon classes."""
    # Register in order
    preferences.register()
    properties.register()
    operators.register()
    ui.register()
    
    # Load preferences from config on startup
    try:
        from .utils.helpers import get_addon_preferences
        prefs = get_addon_preferences(bpy.context)
        if hasattr(prefs, 'load_from_config'):
            prefs.load_from_config()
    except (AttributeError, KeyError, TypeError):
        # Preferences not available yet, will be loaded later
        pass
    
    bpy.app.timers.register(check_scheduled_gc, first_interval=60.0)
    
    logger.info("Difference Machine addon registered")


def unregister():
    """Unregister all addon classes."""
    try:
        bpy.app.timers.unregister(check_scheduled_gc)
    except (ValueError, KeyError):
        pass

    # Unregister in reverse order
    ui.unregister()
    operators.unregister()
    properties.unregister()
    preferences.unregister()
    
    logger.info("Difference Machine addon unregistered")


def check_scheduled_gc():
    """Timer callback to check and run scheduled garbage collection."""
    try:
        if not bpy.context or not bpy.data.filepath:
            return 5.0

        from .utils.helpers import find_repository_root, get_addon_preferences
        from .utils.forester_api import get_api

        blend_file = Path(bpy.data.filepath)
        repo_path = find_repository_root(blend_file.parent)
        if not repo_path:
            return 60.0

        prefs = get_addon_preferences(bpy.context)
        if not getattr(prefs, 'gc_schedule_enabled', False):
            return 60.0

        current_time = time.time()
        last_run = getattr(prefs, 'gc_last_run', 0.0)

        schedule_hour = getattr(prefs, 'gc_schedule_hour', 2)
        schedule_minute = getattr(prefs, 'gc_schedule_minute', 0)
        interval_days = getattr(prefs, 'gc_schedule_interval_days', 7)

        now = datetime.datetime.now()
        scheduled_time = now.replace(
            hour=schedule_hour,
            minute=schedule_minute,
            second=0,
            microsecond=0,
        )

        should_run = False
        if current_time >= scheduled_time.timestamp():
            if last_run <= 0:
                should_run = True
            else:
                last_run_date = datetime.datetime.fromtimestamp(last_run).date()
                days_since_run = (now.date() - last_run_date).days
                if days_since_run >= interval_days:
                    should_run = True

        if should_run:
            api = get_api()
            reflog_expire_days = getattr(prefs, 'reflog_expire_days', 90)
            success, _, error = api.gc(repo_path, dry_run=False, reflog_expire_days=reflog_expire_days)
            if success:
                prefs.gc_last_run = current_time
            else:
                logger.warning(f"Scheduled GC failed: {error}")

        return 60.0
    except (AttributeError, RuntimeError, ValueError) as e:
        logger.debug(f"Error in scheduled GC check: {e}")
        return 60.0
    except Exception as e:
        logger.error(f"Unexpected error in scheduled GC check: {e}", exc_info=True)
        return 60.0


if __name__ == "__main__":
    register()