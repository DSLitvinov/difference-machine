"""
Operators for branch management.
"""

import bpy
from bpy.types import Operator
from pathlib import Path
from ..utils.forester_api import get_api
from ..utils.helpers import get_repository_path


class DF_OT_refresh_branches(Operator):
    """Refresh branch list."""
    bl_idname = "df.refresh_branches"
    bl_label = "Refresh Branches"
    bl_description = "Refresh the list of branches"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        repo_path, error_msg = get_repository_path()
        if not repo_path:
            self.report({'ERROR'}, error_msg)
            return {'CANCELLED'}
        
        api = get_api()
        success, branches, error_msg = api.get_branches(repo_path)
        
        if not success:
            self.report({'ERROR'}, f"Failed to list branches: {error_msg}")
            return {'CANCELLED'}
        
        # Update branch list
        scene = context.scene
        scene.df_branches.clear()
        
        # Create branch items
        for branch_data in branches:
            branch = scene.df_branches.add()
            branch.name = branch_data["name"]
            branch.is_current = branch_data.get("is_current", False)
            
            # Get commit count for this branch
            # Limit history depth to avoid UI freezes on large repos
            try:
                success, commits, _ = api.log(repo_path, branch=branch_data["name"], limit=200)
                branch.commit_count = len(commits) if success and commits else 0
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Failed to get commit count for branch {branch_data['name']}: {e}")
                branch.commit_count = 0
            
            # Parent branch not needed for compare panel
            branch.parent_branch = ""
        
        self.report({'INFO'}, f"Refreshed {len(branches)} branches")
        return {'FINISHED'}


class DF_OT_load_branch_commits(Operator):
    """Load commits for selected branch."""
    bl_idname = "df.load_branch_commits"
    bl_label = "Load Branch Commits"
    bl_description = "Load commits for the selected branch"
    bl_options = {'REGISTER', 'UNDO'}
    
    branch_name: bpy.props.StringProperty(
        name="Branch Name",
        description="Name of the branch to load commits for",
        default="",
    )

    def execute(self, context):
        repo_path, error_msg = get_repository_path()
        if not repo_path:
            self.report({'ERROR'}, error_msg)
            return {'CANCELLED'}
        
        branch_name = self.branch_name
        if not branch_name:
            # Get selected branch from list
            scene = context.scene
            if hasattr(scene, 'df_branch_list_index') and scene.df_branch_list_index >= 0:
                if scene.df_branch_list_index < len(scene.df_branches):
                    branch_name = scene.df_branches[scene.df_branch_list_index].name
        
        if not branch_name:
            self.report({'ERROR'}, "No branch selected")
            return {'CANCELLED'}
        
        # Load commits for the selected branch
        api = get_api()
        try:
            success, commits, error_msg = api.log(repo_path, branch=branch_name, limit=100)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Exception in api.log: {e}", exc_info=True)
            self.report({'ERROR'}, f"Failed to load commits: {e}")
            return {'CANCELLED'}
        
        if not success:
            self.report({'ERROR'}, f"Failed to load commits: {error_msg}")
            return {'CANCELLED'}
        
        # Update commit count for the selected branch
        scene = context.scene
        branch_list_index = scene.df_branch_list_index
        if 0 <= branch_list_index < len(scene.df_branches):
            selected_branch = scene.df_branches[branch_list_index]
            if selected_branch.name == branch_name:
                selected_branch.commit_count = len(commits) if commits else 0
        
        # Get current HEAD as fallback (if log doesn't provide is_head)
        current_head = None
        success_status, status_data, _ = api.status(repo_path)
        if success_status and status_data:
            current_head = status_data.get("head")
            if current_head:
                current_head = current_head.strip().lower()
        
        # Update commit list - first save to backup collection (df_commits_all)
        scene = context.scene
        scene.df_commits_all.clear()
        
        for commit_data in commits:
            commit_all = scene.df_commits_all.add()
            commit_hash_raw = commit_data.get("hash", "").strip()
            # Normalize commit hash to standard format (64 chars)
            from ..utils.helpers import normalize_commit_hash
            commit_hash = normalize_commit_hash(commit_hash_raw)
            if not commit_hash:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Invalid commit hash skipped: {commit_hash_raw[:16]}...")
                continue
            commit_all.hash = commit_hash
            commit_all.message = commit_data.get("message", "")
            commit_all.author = commit_data.get("author", "")
            commit_all.tag = commit_data.get("tag", "") or ""
            commit_all.timestamp = 0
            # Mark HEAD commit
            is_head = commit_data.get("is_head", False)
            if not is_head and current_head:
                commit_hash_normalized = commit_hash.lower() if commit_hash else ""
                is_head = (commit_hash_normalized == current_head)
            commit_all.is_head = is_head
        
        # Apply tag filter to populate df_commits
        props = context.scene.df_commit_props
        tag_filter = props.tag_search_filter.strip().lower() if props.tag_search_filter else ""
        
        scene.df_commits.clear()
        
        if tag_filter:
            for commit_all in scene.df_commits_all:
                commit_tag = (commit_all.tag or "").strip().lower()
                if tag_filter in commit_tag:
                    commit = scene.df_commits.add()
                    commit.hash = commit_all.hash
                    commit.message = commit_all.message
                    commit.author = commit_all.author
                    commit.tag = commit_all.tag
                    commit.timestamp = commit_all.timestamp
                    commit.is_head = commit_all.is_head
        else:
            for commit_all in scene.df_commits_all:
                commit = scene.df_commits.add()
                commit.hash = commit_all.hash
                commit.message = commit_all.message
                commit.author = commit_all.author
                commit.tag = commit_all.tag
                commit.timestamp = commit_all.timestamp
                commit.is_head = commit_all.is_head
        
        # Reset selection index if it's out of bounds
        if scene.df_commit_list_index >= len(scene.df_commits):
            scene.df_commit_list_index = max(0, len(scene.df_commits) - 1)
        
        self.report({'INFO'}, f"Loaded {len(commits)} commits for branch '{branch_name}'")
        return {'FINISHED'}


def register():
    from ..utils.registration import register_classes
    classes_to_register = [
        DF_OT_refresh_branches,
        DF_OT_load_branch_commits,
    ]
    register_classes(classes_to_register)


def unregister():
    from ..utils.registration import unregister_classes
    classes_to_unregister = [
        DF_OT_load_branch_commits,
        DF_OT_refresh_branches,
    ]
    unregister_classes(classes_to_unregister)
