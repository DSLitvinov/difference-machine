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
from pathlib import Path

from .utils.logging_config import setup_logging, get_logger

log_file = Path.home() / "blender_addon.log"
setup_logging(log_level=logging.DEBUG, log_file=log_file)
logger = get_logger(__name__)

from . import preferences
from . import properties
from . import operators
from . import ui
from .utils import auto_save

_modules = [
    preferences,
    properties,
    operators,
    ui,
]


def register():
    """Register all addon classes."""
    preferences.register()
    properties.register()
    operators.register()
    ui.register()

    try:
        from .utils.helpers import get_addon_preferences
        prefs = get_addon_preferences(bpy.context)
        if hasattr(prefs, "load_from_config"):
            prefs.load_from_config()
    except (AttributeError, KeyError, TypeError):
        pass

    bpy.app.timers.register(auto_save.check_scheduled_gc, first_interval=60.0)
    bpy.app.timers.register(auto_save.check_auto_save_version, first_interval=10.0, persistent=True)

    logger.info("Difference Machine addon registered")


def unregister():
    """Unregister all addon classes."""
    try:
        bpy.app.timers.unregister(auto_save.check_scheduled_gc)
    except (ValueError, KeyError):
        pass
    try:
        bpy.app.timers.unregister(auto_save.check_auto_save_version)
    except (ValueError, KeyError):
        pass

    ui.unregister()
    operators.unregister()
    properties.unregister()
    preferences.unregister()

    logger.info("Difference Machine addon unregistered")


if __name__ == "__main__":
    register()