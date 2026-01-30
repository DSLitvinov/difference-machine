"""
Operators for configuration management.
"""

import bpy
from pathlib import Path
from bpy.types import Operator

from ..utils.config_loader import (
    load_all_config,
    get_user_config,
    get_gc_config,
    save_user_config,
    save_gc_config,
)
from ..utils.helpers import get_repository_path
from ..utils.object_data import extract_object_data


def _get_target_commit_from_context(context, repo_path):
    """Commit to sync: selected in Compare panel, or HEAD."""
    scene = getattr(context, "scene", None) if context else None
    if scene is not None:
        commits = getattr(scene, "df_commits", [])
        idx = getattr(scene, "df_commit_list_index", 0)
        if commits and 0 <= idx < len(commits):
            h = getattr(commits[idx], "hash", "") or ""
            if h and str(h).strip():
                return str(h).strip()
    from ..utils.forester_api import get_api
    api = get_api()
    ok, status, _ = api.status(repo_path)
    if ok and status:
        return (status.get("head") or "").strip()
    return ""


class DF_OT_sync_objects_to_db(Operator):
    """Sync tagged object metadata to Forester DB for the selected commit."""
    bl_idname = "df.sync_objects_to_db"
    bl_label = "Sync Objects to DB"
    bl_description = "Sync only tagged objects for the selected commit (or HEAD) to Forester DB. No commit is created."
    bl_options = {'REGISTER'}

    def execute(self, context):
        repo_path, err = get_repository_path()
        if not repo_path:
            self.report({'ERROR'}, err or "Not a repository")
            return {'CANCELLED'}
        from ..utils.forester_api import get_api
        api = get_api()
        target_commit = _get_target_commit_from_context(context, repo_path)
        if not target_commit:
            self.report({'WARNING'}, "No commit selected. Select a commit in Compare panel or ensure HEAD exists.")
            return {'CANCELLED'}
        scene = context.scene
        if not hasattr(scene, 'df_objects'):
            self.report({'WARNING'}, "Objects collection not available")
            return {'CANCELLED'}

        tagged_entries = [
            entry for entry in scene.df_objects
            if entry.commit_hash == target_commit and entry.get_tags()
        ]
        if not tagged_entries:
            self.report({'WARNING'}, "No tagged objects to sync for this commit")
            return {'CANCELLED'}

        # Build JSON for tagged objects only
        objects_dir = repo_path / ".DFM" / "objects"
        objects_dir.mkdir(parents=True, exist_ok=True)
        json_path = objects_dir / f"{target_commit}_objects.json"
        all_data = {}

        depsgraph = bpy.context.evaluated_depsgraph_get() if bpy.context else None
        n = 0
        skipped = 0
        deleted = 0

        cleared_files = set()
        for entry in tagged_entries:
            obj_name = entry.object_name
            if not obj_name:
                skipped += 1
                continue
            obj = bpy.data.objects.get(obj_name)
            if not obj:
                skipped += 1
                continue

            file_path = (entry.file_path or "").strip()
            if not file_path:
                skipped += 1
                continue

            obj_data = extract_object_data(obj, depsgraph)
            obj_data["type"] = obj.type

            file_path_key = str(file_path).replace("\\", "/")
            if file_path_key not in all_data:
                all_data[file_path_key] = {}
            all_data[file_path_key][obj.name] = obj_data

            if file_path_key not in cleared_files:
                ok, err = api.delete_objects_by_file(repo_path, target_commit, file_path_key)
                if ok:
                    deleted += 1
                elif err and "No objects found" not in err:
                    self.report({'WARNING'}, f"Failed to clear objects for {file_path_key}: {err}")
                cleared_files.add(file_path_key)

            ok, _ = api.add_object(
                repo_path,
                "blender",
                file_path_key,
                obj.name,
                obj.type,
                target_commit,
                object_data=obj_data,
                tags=entry.get_tags(),
                metadata=entry.get_metadata(),
            )
            if ok:
                n += 1

        # Save tagged-only JSON
        try:
            import json
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(all_data, f, indent=2, ensure_ascii=False)
        except Exception:
            self.report({'WARNING'}, "Failed to save tagged objects JSON")

        if skipped or deleted:
            self.report({'INFO'}, f"Synced {n} tagged object(s) to DB; deleted {deleted}; skipped {skipped}")
        else:
            self.report({'INFO'}, f"Synced {n} tagged object(s) to DB for commit {target_commit[:16]}...")
        return {'FINISHED'}


class DF_OT_sync_preferences(Operator):
    """Sync preferences with setup.cfg."""
    bl_idname = "df.sync_preferences"
    bl_label = "Sync Preferences"
    bl_description = "Synchronize addon preferences with setup.cfg configuration file"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        """Load preferences from config and save current preferences to config."""
        # Get addon preferences using the helper function
        from ..utils.helpers import get_addon_preferences
        prefs = get_addon_preferences(context)
        
        # Check if preferences have load_from_config method (real preferences object)
        if not hasattr(prefs, 'load_from_config'):
            self.report({'ERROR'}, "Preferences not available")
            return {'CANCELLED'}
        
        # Load from config
        prefs.load_from_config()
        
        # Save current preferences to config
        from ..utils.config_loader import save_user_config, save_gc_config
        save_user_config(prefs.default_author, prefs.user_email)
        save_gc_config(prefs.reflog_expire_days, prefs.gc_schedule_interval_days)
        
        self.report({'INFO'}, "Preferences synchronized with setup.cfg")
        return {'FINISHED'}


def register():
    from ..utils.registration import register_classes
    classes_to_register = [
        DF_OT_sync_objects_to_db,
        DF_OT_sync_preferences,
    ]
    register_classes(classes_to_register)


def unregister():
    from ..utils.registration import unregister_classes
    classes_to_unregister = [
        DF_OT_sync_objects_to_db,
        DF_OT_sync_preferences,
    ]
    unregister_classes(classes_to_unregister)
