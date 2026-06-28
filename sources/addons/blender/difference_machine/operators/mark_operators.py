"""
Operators for marking objects with tags (DELETE, RENAME, MERGE, etc.).
Marks apply to the commit selected in the Compare panel, or HEAD if none selected.
Each mark is synced immediately to Forester manifests.
"""

import bpy
import logging
from bpy.types import Operator, Context
from pathlib import Path
from typing import List, Optional, Tuple

from ..utils.helpers import get_repository_path
from ..utils.object_mark_sync import (
    clear_all_marks_for_scope,
    find_scene_object_entry,
    get_blend_file_path,
    get_target_commit_hash,
    invalidate_marks_cache,
    remove_object_from_forester,
    remove_scene_object_entry,
    sync_object_entry_to_forester,
)

logger = logging.getLogger(__name__)


def _check_tag_conflict(tags: List[str], new_tag: str) -> bool:
    """Check if adding new_tag would conflict with existing tags."""
    if new_tag == "MERGE" and "DELETE" in tags:
        return True
    if new_tag == "DELETE" and "MERGE" in tags:
        return True
    return False


def _require_saved_blend_file(repo_path: Path) -> Tuple[str, Optional[str]]:
    file_path = get_blend_file_path(repo_path)
    if not file_path:
        return "", "Save the .blend file inside the repository before marking objects"
    return file_path, None


def _get_or_create_scene_entry(scene, object_name: str, object_type: str, file_path: str, commit_hash: str):
    entry = find_scene_object_entry(scene, object_name, commit_hash)
    if entry:
        if not entry.file_path:
            entry.file_path = file_path
        if not entry.object_type:
            entry.object_type = object_type
        return entry

    entry = scene.df_objects.add()
    entry.object_name = object_name
    entry.object_type = object_type
    entry.file_path = file_path
    entry.commit_hash = commit_hash
    return entry


def _sync_entry_or_report(operator: Operator, repo_path: Path, entry) -> bool:
    ok, error = sync_object_entry_to_forester(repo_path, entry)
    if ok:
        invalidate_marks_cache(bpy.context.scene)
        return True
    operator.report({"ERROR"}, error or "Failed to sync object mark to Forester")
    return False


def _add_tag_to_objects(
    operator: Operator,
    objects: List[bpy.types.Object],
    tag: str,
    repo_path: Path,
    commit_hash: str,
    file_path: str,
) -> tuple[bool, str]:
    scene = bpy.context.scene
    if not hasattr(scene, "df_objects"):
        return False, "Objects collection not available"

    conflicted_objects = []
    synced = 0

    for obj in objects:
        entry = _get_or_create_scene_entry(scene, obj.name, obj.type, file_path, commit_hash)
        tags = entry.get_tags()
        if _check_tag_conflict(tags, tag):
            conflicted_objects.append(obj.name)
            continue

        if tag not in tags:
            tags.append(tag)
            entry.set_tags(tags)

        if _sync_entry_or_report(operator, repo_path, entry):
            synced += 1

    if conflicted_objects:
        return False, (
            f"Tag conflict: {tag} cannot be added to {', '.join(conflicted_objects)} "
            "(conflicting tag exists)"
        )
    if synced == 0:
        return False, "No object marks were synced to Forester"
    return True, f"Tagged {synced} object(s) with {tag}"


def _remove_tag_from_objects(
    operator: Operator,
    objects: List[bpy.types.Object],
    tag: str,
    repo_path: Path,
    commit_hash: str,
    file_path: str,
) -> Tuple[int, Optional[str]]:
    scene = bpy.context.scene
    if not hasattr(scene, "df_objects"):
        return 0, "Objects collection not available"

    removed = 0
    for obj in objects:
        entry = find_scene_object_entry(scene, obj.name, commit_hash)
        if not entry:
            continue

        tags = entry.get_tags()
        if tag not in tags:
            continue

        tags.remove(tag)
        entry.set_tags(tags)

        if tags:
            if not _sync_entry_or_report(operator, repo_path, entry):
                return removed, "Failed to sync object mark removal to Forester"
        else:
            ok, error = remove_object_from_forester(repo_path, commit_hash, file_path, obj.name)
            if not ok:
                operator.report({"ERROR"}, error or "Failed to remove object mark from Forester")
                return removed, error
            remove_scene_object_entry(scene, obj.name, commit_hash)

        removed += 1

    if removed:
        invalidate_marks_cache(scene)
    return removed, None


class DF_OT_tag_mark(Operator):
    """Add tag to selected objects."""

    bl_idname = "df.tag_mark"
    bl_label = "Mark"
    bl_description = "Add selected tag to selected objects and sync to Forester"
    bl_options = {"REGISTER", "UNDO"}

    new_name: bpy.props.StringProperty(name="New Name", description="New name for the object(s)")

    def invoke(self, context, event):
        selected = context.selected_objects
        if not selected:
            self.report({"ERROR"}, "Please select at least one object")
            return {"CANCELLED"}

        props = context.scene.df_commit_props
        tag = props.selected_tag
        if not tag:
            self.report({"ERROR"}, "Please select a tag")
            return {"CANCELLED"}

        if tag == "RENAME":
            self.new_name = selected[0].name if len(selected) == 1 else ""
            return context.window_manager.invoke_props_dialog(self, width=400)

        return self.execute(context)

    def draw(self, context):
        self.layout.prop(self, "new_name")

    def execute(self, context):
        selected = context.selected_objects
        if not selected:
            self.report({"ERROR"}, "Please select at least one object")
            return {"CANCELLED"}

        props = context.scene.df_commit_props
        tag = props.selected_tag
        if not tag:
            self.report({"ERROR"}, "Please select a tag")
            return {"CANCELLED"}

        repo_path, error = get_repository_path()
        if not repo_path:
            self.report({"ERROR"}, error)
            return {"CANCELLED"}

        file_path, file_error = _require_saved_blend_file(repo_path)
        if file_error:
            self.report({"ERROR"}, file_error)
            return {"CANCELLED"}

        target_commit = get_target_commit_hash(context, repo_path)
        if not target_commit:
            self.report(
                {"ERROR"},
                "No commit selected. Select a commit in Compare panel or ensure HEAD exists.",
            )
            return {"CANCELLED"}

        scene = context.scene

        if tag == "RENAME":
            if not self.new_name or not self.new_name.strip():
                self.report({"ERROR"}, "New name is required")
                return {"CANCELLED"}

            synced = 0
            for obj in selected:
                entry = _get_or_create_scene_entry(scene, obj.name, obj.type, file_path, target_commit)
                tags = entry.get_tags()
                if _check_tag_conflict(tags, "RENAME"):
                    self.report(
                        {"ERROR"},
                        f"Tag conflict: RENAME cannot be added to {obj.name} (conflicting tag exists)",
                    )
                    return {"CANCELLED"}

                if "RENAME" not in tags:
                    tags.append("RENAME")
                    entry.set_tags(tags)

                metadata = entry.get_metadata()
                metadata["new_name"] = self.new_name.strip()
                entry.set_metadata(metadata)

                if _sync_entry_or_report(self, repo_path, entry):
                    synced += 1

            if synced == 0:
                self.report({"ERROR"}, "No object marks were synced to Forester")
                return {"CANCELLED"}

            self.report({"INFO"}, f"Tagged {synced} object(s) for renaming")
            return {"FINISHED"}

        success, message = _add_tag_to_objects(
            self, selected, tag, repo_path, target_commit, file_path
        )
        if success:
            self.report({"INFO"}, message)
            return {"FINISHED"}

        self.report({"ERROR"}, message)
        return {"CANCELLED"}


class DF_OT_tag_rename(Operator):
    """Tag selected objects for renaming."""

    bl_idname = "df.tag_rename"
    bl_label = "Tag: Rename"
    bl_description = "Add RENAME tag to selected objects and sync to Forester"
    bl_options = {"REGISTER", "UNDO"}

    new_name: bpy.props.StringProperty(name="New Name", description="New name for the object")

    def invoke(self, context, event):
        selected = context.selected_objects
        if not selected:
            self.report({"ERROR"}, "Please select at least one object")
            return {"CANCELLED"}

        self.new_name = selected[0].name if len(selected) == 1 else ""
        return context.window_manager.invoke_props_dialog(self)

    def execute(self, context):
        props = context.scene.df_commit_props
        props.selected_tag = "RENAME"
        mark_op = DF_OT_tag_mark()
        mark_op.new_name = self.new_name
        return mark_op.execute(context)


class DF_OT_tag_merge(Operator):
    """Tag selected objects for merge."""

    bl_idname = "df.tag_merge"
    bl_label = "Tag: Merge"
    bl_description = "Add MERGE tag to selected objects and sync to Forester"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        context.scene.df_commit_props.selected_tag = "MERGE"
        return bpy.ops.df.tag_mark()


class DF_OT_tag_delete_mark(Operator):
    """Remove tag from selected objects."""

    bl_idname = "df.tag_delete_mark"
    bl_label = "Delete Mark"
    bl_description = "Remove selected tag from selected objects and sync to Forester"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        selected = context.selected_objects
        if not selected:
            self.report({"ERROR"}, "Please select at least one object")
            return {"CANCELLED"}

        props = context.scene.df_commit_props
        tag = props.selected_tag
        if not tag:
            self.report({"ERROR"}, "Please select a tag")
            return {"CANCELLED"}

        repo_path, error = get_repository_path()
        if not repo_path:
            self.report({"ERROR"}, error)
            return {"CANCELLED"}

        file_path, file_error = _require_saved_blend_file(repo_path)
        if file_error:
            self.report({"ERROR"}, file_error)
            return {"CANCELLED"}

        target_commit = get_target_commit_hash(context, repo_path)
        if not target_commit:
            self.report({"ERROR"}, "No commit selected. Select a commit in Compare panel.")
            return {"CANCELLED"}

        removed, sync_error = _remove_tag_from_objects(
            self, selected, tag, repo_path, target_commit, file_path
        )
        if sync_error:
            return {"CANCELLED"}
        if removed == 0:
            self.report({"WARNING"}, f"No '{tag}' tag found on selected object(s)")
            return {"CANCELLED"}

        self.report({"INFO"}, f"Removed tag '{tag}' from {removed} object(s)")
        return {"FINISHED"}


class DF_OT_tag_clean_all_marks(Operator):
    """Remove all object marks for the current file and commit."""

    bl_idname = "df.tag_clean_all_marks"
    bl_label = "Clean All Marks"
    bl_description = (
        "Remove all object marks for the current .blend file and selected commit from Forester"
    )
    bl_options = {"REGISTER", "UNDO"}

    def invoke(self, context, event):
        return context.window_manager.invoke_confirm(self, event)

    def execute(self, context):
        repo_path, error = get_repository_path()
        if not repo_path:
            self.report({"ERROR"}, error)
            return {"CANCELLED"}

        removed, sync_error = clear_all_marks_for_scope(context, repo_path)
        if sync_error:
            self.report({"ERROR"}, sync_error)
            return {"CANCELLED"}

        if removed == 0:
            self.report({"INFO"}, "No marks to clean for this file and commit")
            return {"FINISHED"}

        self.report({"INFO"}, f"Cleared all marks ({removed} object(s))")
        return {"FINISHED"}


def register():
    from ..utils.registration import register_classes

    register_classes(
        [
            DF_OT_tag_mark,
            DF_OT_tag_delete_mark,
            DF_OT_tag_clean_all_marks,
            DF_OT_tag_rename,
            DF_OT_tag_merge,
        ]
    )


def unregister():
    from ..utils.registration import unregister_classes

    unregister_classes(
        [
            DF_OT_tag_merge,
            DF_OT_tag_rename,
            DF_OT_tag_clean_all_marks,
            DF_OT_tag_delete_mark,
            DF_OT_tag_mark,
        ]
    )
