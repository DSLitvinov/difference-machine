"""
Custom properties for Difference Machine add-on.
"""

import bpy
from bpy.props import (
    EnumProperty,
    StringProperty,
    BoolProperty,
    IntProperty,
    FloatProperty,
    FloatVectorProperty,
)


def _update_tag_search_filter(prop_group, context):
    """
    Update callback for tag_search_filter.
    Filters the commit list based on the tag search filter.
    """
    scene = context.scene
    tag_filter = prop_group.tag_search_filter.strip().lower() if prop_group.tag_search_filter else ""
    
    # Get all commits from backup collection
    if not hasattr(scene, 'df_commits_all'):
        # If backup doesn't exist yet (e.g., before first refresh), do nothing
        # The filter will be applied when refresh_history populates df_commits_all
        return
    
    # Clear current filtered list
    scene.df_commits.clear()
    
    # If df_commits_all is empty, there's nothing to filter
    if len(scene.df_commits_all) == 0:
        return
    
    # Filter commits based on tag
    if tag_filter:
        # Filter commits where tag matches (case-insensitive partial match)
        for commit_all in scene.df_commits_all:
            commit_tag = (commit_all.tag or "").strip().lower()
            if tag_filter in commit_tag:
                # Copy commit to filtered list
                commit = scene.df_commits.add()
                commit.hash = commit_all.hash
                commit.message = commit_all.message
                commit.author = commit_all.author
                commit.tag = commit_all.tag
                commit.timestamp = commit_all.timestamp
                commit.commit_type = commit_all.commit_type
                commit.selected_mesh_names = commit_all.selected_mesh_names
                commit.screenshot_hash = commit_all.screenshot_hash
                commit.is_selected = commit_all.is_selected
                commit.is_head = commit_all.is_head
    else:
        # No filter - copy all commits
        for commit_all in scene.df_commits_all:
            commit = scene.df_commits.add()
            commit.hash = commit_all.hash
            commit.message = commit_all.message
            commit.author = commit_all.author
            commit.tag = commit_all.tag
            commit.timestamp = commit_all.timestamp
            commit.commit_type = commit_all.commit_type
            commit.selected_mesh_names = commit_all.selected_mesh_names
            commit.screenshot_hash = commit_all.screenshot_hash
            commit.is_selected = commit_all.is_selected
            commit.is_head = commit_all.is_head
    
    # Reset selection index if it's out of bounds
    if scene.df_commit_list_index >= len(scene.df_commits):
        scene.df_commit_list_index = max(0, len(scene.df_commits) - 1)


def _update_offset_settings(self, context):
    """Update callback for offset axis and value - updates linked object position."""
    if not context:
        return
    try:
        from ..operators.history_operators import _update_compared_object_position
        _update_compared_object_position(context)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error updating compared object position: {e}", exc_info=True)


class DFCommitProperties(bpy.types.PropertyGroup):
    """Properties for commit operations."""
    
    # Branch
    branch: StringProperty(
        name="Branch",
        description="Branch name",
        default="main",
    )
    
    # Commit message
    message: StringProperty(
        name="Message",
        description="Commit message",
        default="",
    )
    
    # Commit tag
    commit_tag: StringProperty(
        name="Tag",
        description="Optional tag for this commit",
        default="",
    )
    
    # Tag search filter
    tag_search_filter: StringProperty(
        name="Tag Search",
        description="Filter commits by tag name",
        default="",
        options={'TEXTEDIT_UPDATE'},
        update=_update_tag_search_filter,
    )
    
    # Compare tab selection
    load_commit_tab: EnumProperty(
        name="Compare Tab",
        description="Select tab in Compare panel",
        items=[
            ('PROJECT', "Project", "Project operations"),
            ('SELECTED', "Selected Object", "Selected object operations"),
        ],
        default='PROJECT',
    )
    
    # Offset settings for Compare Object
    offset_axis: EnumProperty(
        name="Offset Axis",
        description="Axis for object offset",
        items=[
            ('X', "X", "X axis"),
            ('Y', "Y", "Y axis"),
            ('Z', "Z", "Z axis"),
        ],
        default='X',
        update=_update_offset_settings,
    )
    
    offset_value: FloatProperty(
        name="Offset",
        description="Offset value for object position",
        default=2.0,
        update=_update_offset_settings,
    )
    
    # Replace mode for Retrieve Objects
    replace_mode: BoolProperty(
        name="Replace Mode",
        description="If True, replace selected objects. If False, add objects without removing existing ones",
        default=True,
    )
    
    # Ghost mode for Compare Object
    ghost_mode: BoolProperty(
        name="Ghost Mode",
        description="Display linked objects as wireframe and hide from selection",
        default=False,
    )
    
    # Selected tag for Mark To panel
    selected_tag: EnumProperty(
        name="Tag",
        description="Tag to add or remove",
        items=[
            ('DELETE', "Delete", "Tag object for deletion"),
            ('RENAME', "Rename", "Tag object for renaming"),
            ('MERGE', "Merge", "Tag object for merge"),
        ],
        default='DELETE',
    )


def register():
    """Register custom properties."""
    from . import commit_item
    from .commit_item import DFCommitItem, DFBranchItem, DFStashItem
    
    # Register item classes first
    commit_item.register()
    
    # Register main properties class
    from ..utils.registration import safe_register_class
    safe_register_class(DFCommitProperties)
    bpy.types.Scene.df_commit_props = bpy.props.PointerProperty(type=DFCommitProperties)
    
    # Register collections for commits, branches, and stashes
    bpy.types.Scene.df_commits = bpy.props.CollectionProperty(type=DFCommitItem)
    bpy.types.Scene.df_commits_all = bpy.props.CollectionProperty(type=DFCommitItem)  # Backup collection for all commits
    bpy.types.Scene.df_branches = bpy.props.CollectionProperty(type=DFBranchItem)
    bpy.types.Scene.df_stashes = bpy.props.CollectionProperty(type=DFStashItem)
    
    # Index properties for UIList
    bpy.types.Scene.df_branch_list_index = bpy.props.IntProperty(name="Branch List Index", default=0)
    bpy.types.Scene.df_commit_list_index = bpy.props.IntProperty(
        name="Commit List Index", 
        default=0,
    )
    bpy.types.Scene.df_stash_list_index = bpy.props.IntProperty(name="Stash List Index", default=0)
    
    # Project comparison properties
    bpy.types.Scene.df_project_comparison_active = bpy.props.BoolProperty(
        name="Project Comparison Active",
        description="Whether project comparison is currently active",
        default=False,
    )
    
    bpy.types.Scene.df_project_comparison_commit_hash = bpy.props.StringProperty(
        name="Project Comparison Commit Hash",
        description="Hash of commit being compared",
        default="",
    )
    
    # Compare object properties
    bpy.types.Scene.df_compare_object_active = bpy.props.BoolProperty(
        name="Compare Object Active",
        description="Whether object comparison is currently active",
        default=False,
    )
    
    bpy.types.Scene.df_compare_object_commit_hash = bpy.props.StringProperty(
        name="Compare Object Commit Hash",
        description="Hash of commit being compared",
        default="",
    )
    
    bpy.types.Scene.df_compare_object_linked_name = bpy.props.StringProperty(
        name="Compare Object Linked Name",
        description="Name of linked object for comparison",
        default="",
    )
    
    bpy.types.Scene.df_compare_object_original_location = bpy.props.FloatVectorProperty(
        name="Compare Object Original Location",
        description="Original location of linked object when first added",
        size=3,
        default=(0.0, 0.0, 0.0),
    )
    


def unregister():
    """Unregister custom properties."""
    from . import commit_item
    
    # Unregister collections and index properties
    import logging
    logger = logging.getLogger(__name__)
    
    if hasattr(bpy.types.Scene, 'df_commits'):
        try:
            del bpy.types.Scene.df_commits
        except (ValueError, KeyError, RuntimeError) as e:
            logger.debug(f"Error removing df_commits: {e}")
    
    if hasattr(bpy.types.Scene, 'df_commits_all'):
        try:
            del bpy.types.Scene.df_commits_all
        except (ValueError, KeyError, RuntimeError) as e:
            logger.debug(f"Error removing df_commits_all: {e}")
    
    if hasattr(bpy.types.Scene, 'df_branches'):
        try:
            del bpy.types.Scene.df_branches
        except (ValueError, KeyError, RuntimeError) as e:
            logger.debug(f"Error removing df_branches: {e}")
    
    if hasattr(bpy.types.Scene, 'df_branch_list_index'):
        try:
            del bpy.types.Scene.df_branch_list_index
        except (ValueError, KeyError, RuntimeError) as e:
            logger.debug(f"Error removing df_branch_list_index: {e}")
    
    if hasattr(bpy.types.Scene, 'df_commit_list_index'):
        try:
            del bpy.types.Scene.df_commit_list_index
        except (ValueError, KeyError, RuntimeError) as e:
            logger.debug(f"Error removing df_commit_list_index: {e}")
    
    if hasattr(bpy.types.Scene, 'df_stashes'):
        try:
            del bpy.types.Scene.df_stashes
        except (ValueError, KeyError, RuntimeError) as e:
            logger.debug(f"Error removing df_stashes: {e}")
    
    if hasattr(bpy.types.Scene, 'df_stash_list_index'):
        try:
            del bpy.types.Scene.df_stash_list_index
        except (ValueError, KeyError, RuntimeError) as e:
            logger.debug(f"Error removing df_stash_list_index: {e}")
    
    if hasattr(bpy.types.Scene, 'df_project_comparison_active'):
        try:
            del bpy.types.Scene.df_project_comparison_active
        except (ValueError, KeyError, RuntimeError) as e:
            logger.debug(f"Error removing df_project_comparison_active: {e}")
    
    if hasattr(bpy.types.Scene, 'df_project_comparison_commit_hash'):
        try:
            del bpy.types.Scene.df_project_comparison_commit_hash
        except (ValueError, KeyError, RuntimeError) as e:
            logger.debug(f"Error removing df_project_comparison_commit_hash: {e}")
    
    if hasattr(bpy.types.Scene, 'df_compare_object_active'):
        try:
            del bpy.types.Scene.df_compare_object_active
        except (ValueError, KeyError, RuntimeError) as e:
            logger.debug(f"Error removing df_compare_object_active: {e}")
    
    if hasattr(bpy.types.Scene, 'df_compare_object_commit_hash'):
        try:
            del bpy.types.Scene.df_compare_object_commit_hash
        except (ValueError, KeyError, RuntimeError) as e:
            logger.debug(f"Error removing df_compare_object_commit_hash: {e}")
    
    if hasattr(bpy.types.Scene, 'df_compare_object_linked_name'):
        try:
            del bpy.types.Scene.df_compare_object_linked_name
        except (ValueError, KeyError, RuntimeError) as e:
            logger.debug(f"Error removing df_compare_object_linked_name: {e}")
    
    if hasattr(bpy.types.Scene, 'df_compare_object_original_location'):
        try:
            del bpy.types.Scene.df_compare_object_original_location
        except (ValueError, KeyError, RuntimeError) as e:
            logger.debug(f"Error removing df_compare_object_original_location: {e}")
    
    if hasattr(bpy.types.Scene, 'df_commit_props'):
        try:
            del bpy.types.Scene.df_commit_props
        except (ValueError, KeyError, RuntimeError) as e:
            logger.debug(f"Error removing df_commit_props: {e}")
    
    # Unregister classes
    from ..utils.registration import safe_unregister_class
    safe_unregister_class(DFCommitProperties)
    
    # Unregister item classes
    commit_item.unregister()
