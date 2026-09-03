"""
UIList classes for Difference Machine addon.
"""

import bpy
from bpy.types import UIList


class DF_UL_branch_list(UIList):
    """UIList for displaying branches."""
    bl_idname = "DF_UL_branch_list"

    def draw_item(self, context, layout, data, item, icon, active_data, active_propname):
        if self.layout_type in {'DEFAULT', 'COMPACT'}:
            # Show branch name with current indicator
            row = layout.row()
            if item.is_current:
                row.label(text=f"* {item.name}", icon='CHECKMARK')
            else:
                row.label(text=item.name, icon='BLANK1')
            
            # Show parent branch if available
            if hasattr(item, 'parent_branch') and item.parent_branch:
                row.label(text=f"← {item.parent_branch}", icon='ARROW_LEFTRIGHT')
            
            # Show commit count
            commit_text = f"({item.commit_count} commits)" if item.commit_count > 0 else "(0 commits)"
            row.label(text=commit_text)
        elif self.layout_type in {'GRID'}:
            layout.alignment = 'CENTER'
            layout.label(text=item.name, icon='BLANK1')


class DF_UL_commit_list(UIList):
    """UIList for displaying commits."""
    bl_idname = "DF_UL_commit_list"

    def draw_item(self, context, layout, data, item, icon, active_data, active_propname):
        if self.layout_type in {'DEFAULT', 'COMPACT'}:
            # Show icon, HEAD (if exists), and message
            message = item.message if item.message else "(no message)"
            if len(message) > 50:
                message = message[:50] + "..."
            
            row = layout.row()
            # Show HEAD indicator if this is the HEAD commit
            is_head_commit = getattr(item, 'is_head', False)
            if is_head_commit:
                # Show HEAD with icon, then message with icon
                row.label(text="HEAD", icon='BOOKMARKS')
                row.label(text=message, icon='COMMUNITY')
            else:
                # Show message with icon
                row.label(text=message, icon='COMMUNITY')
        elif self.layout_type in {'GRID'}:
            layout.alignment = 'CENTER'
            # Show HEAD indicator if this is the HEAD commit
            is_head_commit = getattr(item, 'is_head', False)
            # Show message (truncated for grid)
            message = item.message if item.message else "(no message)"
            if len(message) > 20:
                message = message[:20] + "..."
            if is_head_commit:
                layout.label(text="HEAD", icon='BOOKMARKS')
            layout.label(text=message, icon='COMMUNITY')


class DF_UL_stash_list(UIList):
    """UIList for displaying stashes."""
    bl_idname = "DF_UL_stash_list"

    def draw_item(self, context, layout, data, item, icon, active_data, active_propname):
        if self.layout_type in {'DEFAULT', 'COMPACT'}:
            # Show stash hash and message
            message = item.message if item.message else "(no message)"
            if len(message) > 50:
                message = message[:50] + "..."
            
            row = layout.row()
            # Show hash (short) and message
            hash_short = item.hash[:16] + "..." if item.hash else "unknown"
            row.label(text=f"{hash_short}: {message}", icon='PACKAGE')
        elif self.layout_type in {'GRID'}:
            layout.alignment = 'CENTER'
            message = item.message if item.message else "(no message)"
            if len(message) > 20:
                message = message[:20] + "..."
            layout.label(text=message, icon='PACKAGE')


def register():
    from ..utils.registration import register_classes
    classes_to_register = [
        DF_UL_commit_list,
        DF_UL_branch_list,
    ]
    register_classes(classes_to_register)


def unregister():
    from ..utils.registration import unregister_classes
    classes_to_unregister = [
        DF_UL_branch_list,
        DF_UL_commit_list,
    ]
    unregister_classes(classes_to_unregister)
