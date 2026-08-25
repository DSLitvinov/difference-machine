"""
Operators for branch management.
"""

import bpy
from bpy.types import Operator
from pathlib import Path
from ..utils.forester_api import get_api
from ..utils.helpers import get_repository_path


def _selected_branch_name(context) -> str:
    """Resolve branch name from operator property or Compare panel UIList selection."""
    scene = context.scene
    if hasattr(scene, "df_branch_list_index") and scene.df_branch_list_index >= 0:
        if scene.df_branch_list_index < len(scene.df_branches):
            return scene.df_branches[scene.df_branch_list_index].name
    return ""


def _is_dirty_worktree(status_data: dict) -> bool:
    """True when status lists contain any staged or unstaged changes."""
    keys = (
        "modified",
        "deleted",
        "untracked",
        "staged_new",
        "staged_modified",
        "staged_deleted",
    )
    for key in keys:
        items = status_data.get(key)
        if items:
            return True
    return False


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
            branch.commit_count = 0
            # Commit count is filled by load_branch_commits / refresh_history.
            # Do not call log.get per branch here — that freezes the UI on large repos.
            
            # Parent branch not needed for compare panel
            branch.parent_branch = ""
        
        # Select checked-out branch in the list
        current_index = 0
        for i, branch_data in enumerate(branches):
            if branch_data.get("is_current", False):
                current_index = i
                break
        scene.df_branch_list_index = current_index
        
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
            branch_name = _selected_branch_name(context)
        
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
            commit_all.timestamp = commit_data.get("timestamp", 0)
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


class DF_OT_switch_branch(Operator):
    """Switch repository to the selected branch."""
    bl_idname = "df.switch_branch"
    bl_label = "Switch Branch"
    bl_description = "Switch working tree to the selected branch"
    bl_options = {'REGISTER'}

    branch_name: bpy.props.StringProperty(
        name="Branch Name",
        description="Name of the branch to switch to",
        default="",
    )
    auto_stash: bpy.props.BoolProperty(
        name="Auto Stash",
        description="Stash uncommitted changes before switching",
        default=True,
    )

    def invoke(self, context, event):
        branch_name = self.branch_name or _selected_branch_name(context)
        if not branch_name:
            self.report({'ERROR'}, "No branch selected")
            return {'CANCELLED'}

        self.branch_name = branch_name

        repo_path, error_msg = get_repository_path()
        if not repo_path:
            self.report({'ERROR'}, error_msg)
            return {'CANCELLED'}

        api = get_api()
        success, status_data, _ = api.status(repo_path)
        if success and status_data:
            current_branch = (status_data.get("branch") or "").strip()
            if current_branch == branch_name:
                self.report({'INFO'}, f"Already on branch '{branch_name}'")
                return {'CANCELLED'}
            if _is_dirty_worktree(status_data):
                return context.window_manager.invoke_props_dialog(self, width=400)

        return self.execute(context)

    def draw(self, context):
        layout = self.layout
        layout.label(text=f"Switch to branch '{self.branch_name}'?", icon='QUESTION')
        layout.label(text="Uncommitted changes block branch switch.", icon='INFO')
        layout.prop(self, "auto_stash", text="Stash changes and switch")

    def execute(self, context):
        branch_name = self.branch_name or _selected_branch_name(context)
        if not branch_name:
            self.report({'ERROR'}, "No branch selected")
            return {'CANCELLED'}

        if not bpy.data.filepath:
            self.report({'ERROR'}, "Save the Blender file first")
            return {'CANCELLED'}

        repo_path, error_msg = get_repository_path()
        if not repo_path:
            self.report({'ERROR'}, error_msg)
            return {'CANCELLED'}

        api = get_api()
        success, status_data, _ = api.status(repo_path)
        was_dirty = bool(success and status_data and _is_dirty_worktree(status_data))

        success, error = api.switch(repo_path, branch_name, auto_stash=self.auto_stash)
        if not success:
            self.report({'ERROR'}, f"Switch failed: {error}")
            return {'CANCELLED'}

        props = context.scene.df_commit_props
        props.branch = branch_name

        try:
            bpy.ops.df.refresh_branches()
        except RuntimeError as e:
            self.report({'WARNING'}, f"Branch list refresh failed: {e}")

        try:
            bpy.ops.df.load_branch_commits(branch_name=branch_name)
        except RuntimeError as e:
            self.report({'WARNING'}, f"Commit list refresh failed: {e}")

        if was_dirty and self.auto_stash:
            message = f"Switched to branch '{branch_name}' (changes stashed)"
        else:
            message = f"Switched to branch '{branch_name}'"
        self.report({'INFO'}, message)

        try:
            bpy.ops.wm.open_mainfile(filepath=bpy.data.filepath)
        except RuntimeError as e:
            self.report({'WARNING'}, f"Reload file failed: {e}")

        return {'FINISHED'}


def register():
    from ..utils.registration import register_classes
    classes_to_register = [
        DF_OT_refresh_branches,
        DF_OT_load_branch_commits,
        DF_OT_switch_branch,
    ]
    register_classes(classes_to_register)


def unregister():
    from ..utils.registration import unregister_classes
    classes_to_unregister = [
        DF_OT_switch_branch,
        DF_OT_load_branch_commits,
        DF_OT_refresh_branches,
    ]
    unregister_classes(classes_to_unregister)
