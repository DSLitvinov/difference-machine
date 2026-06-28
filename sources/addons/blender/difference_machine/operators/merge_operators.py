"""
Operators for applying object-level merge marks to the current .blend file.
"""

from __future__ import annotations

import json
import logging
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import bpy
from bpy.types import Operator

from ..utils.config_loader import get_blender_executable, get_merge_apply_script_path
from ..utils.forester_api import get_api
from ..utils.helpers import get_repository_path
from ..utils.object_mark_sync import get_blend_file_path, get_target_commit_hash

logger = logging.getLogger(__name__)


def _read_merge_state(repo_path: Path) -> Optional[Dict[str, Any]]:
    merge_state_path = repo_path / ".DFM" / "MERGE_HEAD"
    if not merge_state_path.is_file():
        return None
    try:
        with open(merge_state_path, "r", encoding="utf-8") as handle:
            data = json.load(handle)
        return data if isinstance(data, dict) else None
    except (OSError, json.JSONDecodeError) as error:
        logger.error("Failed to read merge state: %s", error)
        return None


def _tagged_objects_for_merge(
    repo_path: Path,
    commit_hash: str,
    file_path: str,
) -> Tuple[List[Dict[str, Any]], Optional[str]]:
    api = get_api()
    ok, objects, error = api.get_objects_by_file(repo_path, commit_hash, file_path)
    if not ok:
        return [], error or "Failed to load object marks from Forester"
    tagged = [
        obj
        for obj in (objects or [])
        if isinstance(obj, dict) and obj.get("tags")
    ]
    return tagged, None


class DF_OT_apply_merge_marks(Operator):
    """Apply tagged object merge decisions to the current .blend file."""

    bl_idname = "df.apply_merge_marks"
    bl_label = "Apply Merge Marks"
    bl_description = (
        "Apply DELETE, RENAME, and MERGE object marks to the current .blend using "
        "the merged branch version as the source for MERGE objects"
    )
    bl_options = {"REGISTER"}

    def execute(self, context):
        repo_path, error = get_repository_path()
        if not repo_path:
            self.report({"ERROR"}, error)
            return {"CANCELLED"}

        if not bpy.data.filepath:
            self.report({"ERROR"}, "Save the .blend file before applying merge marks")
            return {"CANCELLED"}

        blend_path = Path(bpy.data.filepath)
        file_path = get_blend_file_path(repo_path)
        if not file_path:
            self.report({"ERROR"}, "Current .blend file must be inside the repository")
            return {"CANCELLED"}

        merge_state = _read_merge_state(repo_path)
        if not merge_state:
            self.report({"ERROR"}, "No merge in progress")
            return {"CANCELLED"}

        commit_hash = (merge_state.get("current_head") or "").strip()
        if not commit_hash:
            commit_hash = get_target_commit_hash(context, repo_path)
        if not commit_hash:
            self.report({"ERROR"}, "Could not determine commit for object marks")
            return {"CANCELLED"}

        tagged_objects, load_error = _tagged_objects_for_merge(repo_path, commit_hash, file_path)
        if load_error:
            self.report({"ERROR"}, load_error)
            return {"CANCELLED"}
        if not tagged_objects:
            self.report({"WARNING"}, "No tagged objects found for this .blend file")
            return {"CANCELLED"}

        theirs_blend = repo_path / ".DFM" / "merge_theirs" / file_path
        has_merge_tag = any("MERGE" in (obj.get("tags") or []) for obj in tagged_objects)
        if not theirs_blend.is_file():
            if has_merge_tag:
                self.report(
                    {"ERROR"},
                    f"Merged branch .blend not found: .DFM/merge_theirs/{file_path}",
                )
                return {"CANCELLED"}
            theirs_blend = blend_path

        script_path = get_merge_apply_script_path()
        if not script_path:
            self.report({"ERROR"}, "merge_apply_background.py was not found in the addon")
            return {"CANCELLED"}

        blender_executable = get_blender_executable() or bpy.app.binary_path
        if not blender_executable:
            self.report({"ERROR"}, "Blender executable is not configured")
            return {"CANCELLED"}

        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            suffix=".json",
            delete=False,
            dir=str(repo_path / ".DFM"),
        ) as temp_file:
            json.dump(tagged_objects, temp_file, ensure_ascii=False, indent=2)
            objects_json = temp_file.name

        cmd = [
            blender_executable,
            "--background",
            str(blend_path),
            "--python",
            script_path,
            "--",
            "--objects_json",
            objects_json,
            "--theirs_blend",
            str(theirs_blend),
            "--repo_path",
            str(repo_path),
            "--output_file",
            str(blend_path),
        ]

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300,
                check=False,
            )
        except subprocess.TimeoutExpired:
            self.report({"ERROR"}, "Timed out while applying merge marks")
            return {"CANCELLED"}
        finally:
            try:
                Path(objects_json).unlink()
            except FileNotFoundError:
                pass
            except OSError:
                pass

        if result.returncode != 0:
            details = (result.stderr or result.stdout or "").strip()
            message = "Failed to apply merge marks"
            if details:
                message = f"{message}: {details.splitlines()[-1]}"
            self.report({"ERROR"}, message)
            return {"CANCELLED"}

        self.report({"INFO"}, f"Applied {len(tagged_objects)} object mark(s) to {file_path}")
        return {"FINISHED"}


def merge_in_progress(repo_path: Path) -> bool:
    return _read_merge_state(repo_path) is not None


def register():
    from ..utils.registration import register_classes

    register_classes([DF_OT_apply_merge_marks])


def unregister():
    from ..utils.registration import unregister_classes

    unregister_classes([DF_OT_apply_merge_marks])
