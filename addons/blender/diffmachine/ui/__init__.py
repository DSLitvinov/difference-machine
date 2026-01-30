"""
UI module for Difference Machine addon.
"""

from . import ui_main
from . import ui_lists

__all__ = ['ui_main', 'ui_lists']


def register():
    """Register all UI classes."""
    ui_lists.register()
    ui_main.register()


def unregister():
    """Unregister all UI classes."""
    ui_main.unregister()
    ui_lists.unregister()
