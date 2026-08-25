"""
Apply object-level merge marks (Delete, Rename, Merge) to a .blend file in background Blender.

Lives next to the installed Difference Machine addon
(scripts/merge_apply_background.py). Forester resolves this file from
addons.diffmachine_path in ~/.dfm/setup.cfg.

Invoked by Forester during branch merge when a .blend file has object tags.

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


def _script_argv() -> list[str]:
    if "--" in sys.argv:
        return sys.argv[sys.argv.index("--") + 1 :]
    return sys.argv[1:]


def _parse_args():
    parser = argparse.ArgumentParser(
        description="Apply merge operations (Delete, Rename, Merge) to .blend in background"
    )
    parser.add_argument("--objects_json", required=True, help="Path to JSON with objects and tags")
    parser.add_argument("--theirs_blend", required=True, help="Path to 'theirs' .blend for MERGE")
    parser.add_argument("--repo_path", required=True, help="Repository root path")
    parser.add_argument("--output_file", default=None, help="Output path; default overwrite open file")
    return parser.parse_args(_script_argv())


def _load_objects_json(path: Path) -> list[dict]:
    with open(path, "r", encoding="utf-8") as handle:
        data = json.load(handle)
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and "objects" in data:
        return data["objects"]
    return []


def _has_tag(tags, name: str) -> bool:
    target = name.strip().upper()
    for tag in tags or []:
        if str(tag).strip().upper() == target:
            return True
    return False


def _find_object(name: str):
    name = (name or "").strip()
    if not name:
        return None
    obj = bpy.data.objects.get(name)
    if obj is not None:
        return obj
    lowered = name.lower()
    matches = [candidate for candidate in bpy.data.objects if candidate.name.lower() == lowered]
    if len(matches) == 1:
        return matches[0]
    return None


def _remove_object(obj) -> None:
    for collection in list(obj.users_collection):
        try:
            collection.objects.unlink(obj)
        except Exception:
            pass
    try:
        bpy.data.objects.remove(obj, do_unlink=True)
    except TypeError:
        bpy.data.objects.remove(obj)


def _link_object(obj, collections) -> None:
    linked = False
    for collection in collections or []:
        if collection is None:
            continue
        try:
            if obj.name not in collection.objects:
                collection.objects.link(obj)
            linked = True
        except RuntimeError as error:
            log.warning("Link to collection %s: %s", getattr(collection, "name", "?"), error)
    if linked:
        return
    scene = getattr(bpy.context, "scene", None)
    if scene is None:
        return
    try:
        if obj.name not in scene.collection.objects:
            scene.collection.objects.link(obj)
    except RuntimeError as error:
        log.warning("Link to scene collection: %s", error)


def _metadata_new_name(meta) -> str:
    if not isinstance(meta, dict):
        return ""
    for key in ("new_name", "NewName", "newName"):
        value = meta.get(key)
        if value:
            return str(value).strip()
    return ""


def _apply_delete(objects: list[dict]) -> list[str]:
    errors = []
    for ob in objects:
        if not _has_tag(ob.get("tags"), "DELETE"):
            continue
        name = (ob.get("object_name") or "").strip()
        if not name:
            errors.append("DELETE: empty object_name")
            continue
        obj = _find_object(name)
        if obj is None:
            log.warning("DELETE: object already absent: %s", name)
            continue
        _remove_object(obj)
        log.info("Deleted object %s", name)
    return errors


def _apply_rename(objects: list[dict]) -> list[str]:
    errors = []
    for ob in objects:
        if not _has_tag(ob.get("tags"), "RENAME"):
            continue
        name = (ob.get("object_name") or "").strip()
        new_name = _metadata_new_name(ob.get("metadata") or {})
        if not name or not new_name:
            errors.append(f"RENAME: missing name or new_name for {name or '?'}")
            continue
        obj = _find_object(name)
        if obj is None:
            errors.append(f"RENAME: object not found: {name}")
            continue
        obj.name = new_name
        log.info("Renamed %s -> %s", name, obj.name)
    return errors


def _validate_merge_inputs(objects: list[dict], theirs_blend: Path) -> bool:
    merge_names = [
        (obj.get("object_name") or "").strip()
        for obj in objects
        if _has_tag(obj.get("tags"), "MERGE")
    ]
    merge_names = [name for name in merge_names if name]
    if not merge_names:
        return True
    if not theirs_blend.exists():
        log.error("Theirs blend not found: %s", theirs_blend)
        return False

    try:
        with bpy.data.libraries.load(str(theirs_blend), link=False) as (data_from, _data_to):
            available = {item for item in data_from.objects if item}
    except Exception as error:
        log.error("Failed to inspect theirs blend: %s", error)
        return False

    missing = [name for name in merge_names if name not in available]
    if missing:
        lowered = {item.lower(): item for item in available}
        still_missing = [name for name in missing if name.lower() not in lowered]
        if still_missing:
            log.error("Missing MERGE object(s) in theirs blend: %s", ", ".join(still_missing))
            return False
    return True


def _theirs_object_name(name: str, available: set[str]) -> str:
    if name in available:
        return name
    lowered = {item.lower(): item for item in available}
    return lowered.get(name.lower(), name)


def _apply_merge(objects: list[dict], theirs_blend: Path, repo_path: Path) -> list[str]:
    merge_objects = [obj for obj in objects if _has_tag(obj.get("tags"), "MERGE")]
    if not merge_objects:
        return []
    if not theirs_blend.exists():
        return [f"Theirs blend not found: {theirs_blend}"]

    errors = []
    loaded_for_fix = []

    with bpy.data.libraries.load(str(theirs_blend), link=False) as (data_from, _data_to):
        available = {item for item in data_from.objects if item}

    for ob in merge_objects:
        name = (ob.get("object_name") or "").strip()
        obj_type = (ob.get("object_type") or "").strip().upper()
        if not name:
            errors.append("MERGE: empty object_name")
            continue

        source_name = _theirs_object_name(name, available)
        if source_name not in available:
            errors.append(f"Object {name} not in theirs blend")
            continue

        old = _find_object(name)
        old_collections = list(old.users_collection) if old is not None else []
        if old is not None:
            _remove_object(old)

        with bpy.data.libraries.load(str(theirs_blend), link=False) as (data_from, data_to):
            data_to.objects = [source_name]

        loaded_objects = [obj for obj in data_to.objects if obj]
        new_obj = loaded_objects[0] if loaded_objects else None
        if not new_obj:
            errors.append(f"Failed to load MERGE object {name}")
            continue
        if obj_type and new_obj.type != obj_type:
            _remove_object(new_obj)
            errors.append(f"MERGE object {name} type mismatch: expected {obj_type}, got {new_obj.type}")
            continue

        if new_obj.name != name:
            new_obj.name = name
        _link_object(new_obj, old_collections)
        loaded_for_fix.append({"new_obj": new_obj, "obj_type": obj_type or new_obj.type})
        log.info("Merged object %s", name)

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

    return errors


def _save(output: Path) -> None:
    output = output.expanduser()
    current = Path(bpy.data.filepath).expanduser() if bpy.data.filepath else None
    try:
        if current is not None and output.resolve() == current.resolve():
            bpy.ops.wm.save_mainfile()
            return
    except Exception:
        pass
    bpy.ops.wm.save_as_mainfile(filepath=str(output))


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

    log.info("Applying %d tagged object(s) to %s", len(objects), bpy.data.filepath or output)

    if not _validate_merge_inputs(objects, theirs_blend):
        return 1

    try:
        errors = []
        errors.extend(_apply_delete(objects))
        errors.extend(_apply_rename(objects))
        errors.extend(_apply_merge(objects, theirs_blend, repo_path))
    except Exception as error:
        log.error("Failed to apply merge operations: %s", error)
        return 1

    if errors:
        for message in errors:
            log.error("%s", message)
        return 1

    try:
        _save(output)
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
