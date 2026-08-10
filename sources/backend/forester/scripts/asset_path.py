"""
Fix asset paths when loading objects from another .blend during merge.
Shipped with Forester (used by merge_apply_background.py).
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

import bpy

logger = logging.getLogger(__name__)


def _transform_path_from_history(path: str) -> str:
    if not path:
        return path
    if path.startswith("//../../"):
        return path[8:]
    if path.startswith("//../"):
        return path[5:]
    if path.startswith("//"):
        return path[2:]
    return path


def _resolve_repo_asset_path(repo_path: Path, asset_path: str) -> Optional[Path]:
    transformed_path = _transform_path_from_history(asset_path)
    repo_root = repo_path.resolve()
    candidate = Path(transformed_path)
    absolute_path = candidate.resolve() if candidate.is_absolute() else (repo_root / candidate).resolve()
    try:
        absolute_path.relative_to(repo_root)
    except ValueError:
        logger.warning("Skipping asset path outside repository: %s", asset_path)
        return None
    return absolute_path


def fix_retrieved_assets(assets: List[Dict[str, Any]], repo_path: Path) -> None:
    if not assets:
        return

    for asset_info in assets:
        asset_type = asset_info.get("type")
        asset_path = asset_info.get("path")
        if not asset_path:
            continue

        try:
            absolute_path = _resolve_repo_asset_path(repo_path, asset_path)
            if absolute_path is None:
                continue

            if asset_type == "IMAGE":
                _fix_image_path(absolute_path, asset_info)
            elif asset_type == "LIBRARY":
                _fix_library_path(absolute_path, asset_info)
            elif asset_type == "SOUND":
                _fix_sound_path(absolute_path, asset_info)
            elif asset_type == "FONT":
                _fix_font_path(absolute_path, asset_info)
            elif asset_type == "VOLUME":
                _fix_volume_path(absolute_path, asset_info)
            elif asset_type == "TEXT":
                _fix_text_path(absolute_path, asset_info)
            elif asset_type == "VSE":
                _fix_vse_path(absolute_path, asset_info)
        except Exception as error:
            logger.warning("Failed to fix asset path %s: %s", asset_path, error)


def _fix_image_path(absolute_path: Path, asset_info: Dict[str, Any]) -> None:
    image_name = asset_info.get("name")
    if not image_name:
        return
    image = bpy.data.images.get(image_name)
    if image and absolute_path.exists():
        image.filepath = str(absolute_path)
        image.reload()


def _fix_library_path(absolute_path: Path, asset_info: Dict[str, Any]) -> None:
    library_name = asset_info.get("name")
    if not library_name:
        return
    library = bpy.data.libraries.get(library_name)
    if library and absolute_path.exists():
        library.filepath = str(absolute_path)
        library.reload()


def _fix_sound_path(absolute_path: Path, asset_info: Dict[str, Any]) -> None:
    sound_name = asset_info.get("name")
    if not sound_name:
        return
    sound = bpy.data.sounds.get(sound_name)
    if sound and absolute_path.exists():
        sound.filepath = str(absolute_path)
        sound.reload()


def _fix_font_path(absolute_path: Path, asset_info: Dict[str, Any]) -> None:
    font_name = asset_info.get("name")
    if not font_name:
        return
    font = bpy.data.fonts.get(font_name)
    if font and absolute_path.exists():
        font.filepath = str(absolute_path)


def _fix_volume_path(absolute_path: Path, asset_info: Dict[str, Any]) -> None:
    volume_name = asset_info.get("name")
    if not volume_name:
        return
    volume = bpy.data.volumes.get(volume_name)
    if volume and absolute_path.exists():
        volume.filepath = str(absolute_path)


def _fix_text_path(absolute_path: Path, asset_info: Dict[str, Any]) -> None:
    text_name = asset_info.get("name")
    if not text_name:
        return
    text = bpy.data.texts.get(text_name)
    if text and absolute_path.exists():
        text.filepath = str(absolute_path)


def _fix_vse_path(absolute_path: Path, asset_info: Dict[str, Any]) -> None:
    sequence_name = asset_info.get("name")
    if not sequence_name:
        return
    for scene in bpy.data.scenes:
        if not scene.sequence_editor:
            continue
        for seq in scene.sequence_editor.sequences:
            if seq.name == sequence_name and hasattr(seq, "filepath") and absolute_path.exists():
                seq.filepath = str(absolute_path)
