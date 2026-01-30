"""
Property items for commit and branch lists.
"""

import bpy
from bpy.props import StringProperty, IntProperty, BoolProperty


class DFCommitItem(bpy.types.PropertyGroup):
    """Property group for a single commit in the list."""
    
    hash: StringProperty(name="Hash")
    message: StringProperty(name="Message")
    author: StringProperty(name="Author")
    timestamp: IntProperty(name="Timestamp")
    commit_type: StringProperty(name="Type", default="project")
    selected_mesh_names: StringProperty(name="Mesh Names")  # JSON string
    screenshot_hash: StringProperty(name="Screenshot Hash")  # Deprecated, use screenshot_path
    screenshot_path: StringProperty(name="Screenshot Path")  # Path to screenshot file
    tag: StringProperty(name="Tag", default="")
    is_selected: BoolProperty(name="Selected", default=False)
    is_head: BoolProperty(name="Is HEAD", default=False)


class DFBranchItem(bpy.types.PropertyGroup):
    """Property group for a single branch in the list."""
    
    name: StringProperty(name="Name")
    commit_count: IntProperty(name="Commit Count", default=0)
    last_commit_hash: StringProperty(name="Last Commit Hash")
    last_commit_message: StringProperty(name="Last Commit Message")
    is_current: BoolProperty(name="Current", default=False)
    branch_index: IntProperty(name="Branch Index", default=-1)  # Index in database list (not displayed in UI)
    parent_branch: StringProperty(name="Parent Branch", default="")  # Name of parent branch (branch this was created from)


class DFStashItem(bpy.types.PropertyGroup):
    """Property group for a single stash in the list."""
    
    hash: StringProperty(name="Hash")
    message: StringProperty(name="Message")
    created_at: IntProperty(name="Created At", default=0)  # Unix timestamp


def register():
    """Register property groups."""
    from ..utils.registration import register_classes
    classes_to_register = [
        DFCommitItem,
        DFBranchItem,
        DFStashItem,
    ]
    register_classes(classes_to_register)


def unregister():
    """Unregister property groups."""
    from ..utils.registration import unregister_classes
    classes_to_unregister = [
        DFStashItem,
        DFBranchItem,
        DFCommitItem,
    ]
    unregister_classes(classes_to_unregister)

