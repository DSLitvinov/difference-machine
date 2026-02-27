"""
Background script to apply merge operations (Delete, Rename, Merge) to a .blend file.
Runs in a separate Blender process. Used after forester merge conflict on .blend files.

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

# Add addon root for utils
_addon_root = Path(__file__).resolve().parent.parent
if str(_addon_root) not in sys.path:
    sys.path.insert(0, str(_addon_root))


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
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
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
        for c in list(obj.users_collection):
            c.objects.unlink(obj)
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


def _apply_merge(objects: list[dict], theirs_blend: Path, repo_path: Path) -> None:
    merge_objects = [o for o in objects if "MERGE" in (o.get("tags") or [])]
    if not merge_objects:
        return
    if not theirs_blend.exists():
        log.warning("Theirs blend not found: %s", theirs_blend)
        return

    existing = set(bpy.data.objects.keys())
    loaded_for_fix = []

    for ob in merge_objects:
        name = (ob.get("object_name") or "").strip()
        obj_type = (ob.get("object_type") or "MESH").strip()
        if not name:
            continue

        with bpy.data.libraries.load(str(theirs_blend), link=False) as (data_from, data_to):
            if name not in data_from.objects:
                log.warning("Object %s not in theirs blend", name)
                continue
            data_to.objects = [name]

        current = set(bpy.data.objects.keys())
        new_names = current - existing
        new_obj = None
        for n in new_names:
            o = bpy.data.objects.get(n)
            if o and o.type == obj_type:
                new_obj = o
                break
        if not new_obj:
            continue

        existing.add(new_obj.name)
        replace_mode = name in bpy.data.objects
        if replace_mode:
            old = bpy.data.objects[name]
            for c in list(old.users_collection):
                c.objects.unlink(old)
            bpy.data.objects.remove(old)
            new_obj.name = name
        else:
            new_obj.name = f"{name}_retrieved"

        try:
            sc = bpy.context.scene.collection
            if new_obj.name not in sc.objects:
                sc.objects.link(new_obj)
        except Exception as e:
            log.warning("Link to scene collection: %s", e)

        loaded_for_fix.append({"new_obj": new_obj, "obj_type": obj_type})

    if loaded_for_fix:
        try:
            from utils.asset_path import fix_retrieved_assets
            assets = []
            for item in loaded_for_fix:
                o = item["new_obj"]
                if getattr(o, "data", None) and o.data:
                    assets.append({"type": "LIBRARY", "path": str(theirs_blend), "name": getattr(o.data, "name", o.name)})
            if assets:
                fix_retrieved_assets(assets, Path(repo_path))
        except Exception as e:
            log.warning("fix_retrieved_assets: %s", e)


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
    except Exception as e:
        log.error("Failed to load objects JSON: %s", e)
        return 1

    _apply_delete(objects)
    _apply_rename(objects)
    _apply_merge(objects, theirs_blend, repo_path)

    try:
        bpy.ops.wm.save_as_mainfile(filepath=str(output))
    except Exception as e:
        log.error("Failed to save: %s", e)
        return 1

    log.info("Saved to %s", output)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        log.exception("%s", e)
        sys.exit(1)
