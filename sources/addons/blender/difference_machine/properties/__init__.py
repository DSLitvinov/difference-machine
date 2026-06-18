"""
Properties module for Difference Machine addon.
"""

from . import commit_item
from . import properties
from . import object_mark

__all__ = ['commit_item', 'properties', 'object_mark']


def register():
    """Register all property classes."""
    commit_item.register()
    properties.register()
    object_mark.register()


def unregister():
    """Unregister all property classes."""
    object_mark.unregister()
    properties.unregister()
    commit_item.unregister()
