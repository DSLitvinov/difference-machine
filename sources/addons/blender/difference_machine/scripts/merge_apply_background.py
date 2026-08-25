"""
Apply object-level merge marks (Delete, Rename, Merge) to a .blend file in background Blender.

Lives next to the installed Difference Machine addon
(scripts/merge_apply_background.py). Forester resolves this file from
addons.diffmachine_path in ~/.dfm/setup.cfg.

Invoked by Forester during branch merge when a .blend file conflicts.

Usage:
  blender --background <blend_file> --python merge_apply_background.py -- \\
    --objects_json <path> --theirs_blend <path> --repo_path <path> [--output_file <path>]

Order of operations: Delete -> Rename -> Merge.
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

import bpy

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

_SCRIPT_DIR = Path(__file__).resolve().parent
_ADDON_ROOT = _SCRIPT_DIR.parent
_UTILS_DIR = _ADDON_ROOT / "utils"
if str(_UTILS_DIR) not in sys.path:
    sys.path.insert(0, str(_UTILS_DIR))

from asset_path import fix_retrieved_assets


def _parse_args():
    parser = argparse.ArgumentParser(
        description="Apply merge operations (Delete, Rename, Merge) to .blend in background"
    )
    parser.add_argument("--objects_json", required=True, help="Path to JSON with objects and tags")
    parser.add_argument("--theirs_blend", required=True, help="Path to 'theirs' .blend for MERGE")
    parser.add_argument("--repo_path", required=True, help="Repository root path")
    parser.add_argument("--output_file", default=None, help="Output path; default overwrite open file")
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1:])


def _load_objects_json(path: Path) -> list[dict]:
    with open(path, "r", encoding="utf-8") as handle:
        data = json.load(handle)
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and "objects" in data:
        return data["objects"]
    return []


def _apply_delete(objects: list[dict]) -> None:
    for ob in objects:
        tags = ob.get("tags") or []
        if "DELETE" not in tags:
            continue
        name = (ob.get("object_name") or "").strip()
        if not name or name not in bpy.data.objects:
            continue
        obj = bpy.data.objects[name]
        for collection in list(obj.users_collection):
            collection.objects.unlink(obj)
        bpy.data.objects.remove(obj)
        log.info("Deleted object %s", name)


def _apply_rename(objects: list[dict]) -> None:
    for ob in objects:
        tags = ob.get("tags") or []
        if "RENAME" not in tags:
            continue
        name = (ob.get("object_name") or "").strip()
        meta = ob.get("metadata") or {}
        new_name = (meta.get("new_name") or "").strip()
        if not new_name or name not in bpy.data.objects:
            continue
        bpy.data.objects[name].name = new_name
        log.info("Renamed %s -> %s", name, new_name)


def _validate_merge_inputs(objects: list[dict], theirs_blend: Path) -> bool:
    merge_names = [
        (obj.get("object_name") or "").strip()
        for obj in objects
        if "MERGE" in (obj.get("tags") or [])
    ]
    merge_names = [name for name in merge_names if name]
    if not merge_names:
        return True
    if not theirs_blend.exists():
        log.error("Theirs blend not found: %s", theirs_blend)
        return False

    try:
        with bpy.data.libraries.load(str(theirs_blend), link=False) as (data_from, _data_to):
            available = set(data_from.objects)
    except Exception as error:
        log.error("Failed to inspect theirs blend: %s", error)
        return False

    missing = [name for name in merge_names if name not in available]
    if missing:
        log.error("Missing MERGE object(s) in theirs blend: %s", ", ".join(missing))
        return False
    return True


def _apply_merge(objects: list[dict], theirs_blend: Path, repo_path: Path) -> None:
    merge_objects = [obj for obj in objects if "MERGE" in (obj.get("tags") or [])]
    if not merge_objects:
        return
    if not theirs_blend.exists():
        raise FileNotFoundError(f"Theirs blend not found: {theirs_blend}")

    loaded_for_fix = []

    for ob in merge_objects:
        name = (ob.get("object_name") or "").strip()
        obj_type = (ob.get("object_type") or "MESH").strip()
        if not name:
            continue

        with bpy.data.libraries.load(str(theirs_blend), link=False) as (data_from, data_to):
            if name not in data_from.objects:
                raise RuntimeError(f"Object {name} not in theirs blend")
            data_to.objects = [name]

        loaded_objects = [obj for obj in data_to.objects if obj]
        new_obj = loaded_objects[0] if loaded_objects else None
        if not new_obj:
            raise RuntimeError(f"Failed to load MERGE object {name}")
        if new_obj.type != obj_type:
            bpy.data.objects.remove(new_obj)
            raise RuntimeError(f"MERGE object {name} type mismatch: expected {obj_type}, got {new_obj.type}")

        if name in bpy.data.objects:
            old = bpy.data.objects[name]
            for collection in list(old.users_collection):
                collection.objects.unlink(old)
            bpy.data.objects.remove(old)
            new_obj.name = name
        else:
            new_obj.name = f"{name}_retrieved"

        try:
            scene_collection = bpy.context.scene.collection
            if new_obj.name not in scene_collection.objects:
                scene_collection.objects.link(new_obj)
        except Exception as error:
            log.warning("Link to scene collection: %s", error)

        loaded_for_fix.append({"new_obj": new_obj, "obj_type": obj_type})

    if loaded_for_fix:
        assets = []
        for item in loaded_for_fix:
            obj = item["new_obj"]
            if getattr(obj, "data", None) and obj.data:
                assets.append(
                    {
                        "type": "LIBRARY",
                        "path": str(theirs_blend),
                        "name": getattr(obj.data, "name", obj.name),
                    }
                )
        if assets:
            fix_retrieved_assets(assets, Path(repo_path))


def main() -> int:
    args = _parse_args()
    objects_path = Path(args.objects_json)
    theirs_blend = Path(args.theirs_blend)
    repo_path = Path(args.repo_path)
    output = Path(args.output_file) if args.output_file else Path(bpy.data.filepath or "")

    if not output:
        log.error("No output path and no open file")
        return 1
    if not objects_path.exists():
        log.error("Objects JSON not found: %s", objects_path)
        return 1

    try:
        objects = _load_objects_json(objects_path)
    except Exception as error:
        log.error("Failed to load objects JSON: %s", error)
        return 1

    if not _validate_merge_inputs(objects, theirs_blend):
        return 1

    try:
        _apply_delete(objects)
        _apply_rename(objects)
        _apply_merge(objects, theirs_blend, repo_path)
    except Exception as error:
        log.error("Failed to apply merge operations: %s", error)
        return 1

    try:
        bpy.ops.wm.save_as_mainfile(filepath=str(output))
    except Exception as error:
        log.error("Failed to save: %s", error)
        return 1

    log.info("Saved to %s", output)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as error:
        log.exception("%s", error)
        sys.exit(1)
