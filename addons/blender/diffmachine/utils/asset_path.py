"""
Utilities for fixing asset paths when retrieving objects from commits.
Handles path transformations for various asset types.
"""

import bpy
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


def _transform_path_from_history(path: str) -> str:
    """
    Transform path from history format (with //../../ prefix) to relative path.
    
    Args:
        path: Path string that may contain //../../ prefix
        
    Returns:
        Transformed path without //../../ prefix
    """
    if not path:
        return path
    
    # Remove //../../ prefix if present
    if path.startswith("//../../"):
        return path[8:]  # Remove "//../../"
    elif path.startswith("//../"):
        return path[5:]  # Remove "//../"
    elif path.startswith("//"):
        return path[2:]  # Remove "//"
    
    return path


def fix_retrieved_assets(assets: List[Dict[str, Any]], repo_path: Path) -> None:
    """
    Fix asset paths for retrieved objects from commit history.
    
    Handles various asset types:
    - Images
    - Libraries
    - Sounds
    - Fonts
    - Volumes
    - Texts
    - VSE sequences
    
    Args:
        assets: List of asset dictionaries with 'type' and 'path' keys
        repo_path: Repository root path for resolving relative paths
    """
    if not assets:
        return
    
    for asset_info in assets:
        asset_type = asset_info.get('type')
        asset_path = asset_info.get('path')
        
        if not asset_path:
            continue
        
        try:
            # Transform path
            transformed_path = _transform_path_from_history(asset_path)
            
            # Resolve absolute path relative to repo
            if not Path(transformed_path).is_absolute():
                absolute_path = (repo_path / transformed_path).resolve()
            else:
                absolute_path = Path(transformed_path).resolve()
            
            # Update asset based on type
            if asset_type == 'IMAGE':
                _fix_image_path(absolute_path, asset_info)
            elif asset_type == 'LIBRARY':
                _fix_library_path(absolute_path, asset_info)
            elif asset_type == 'SOUND':
                _fix_sound_path(absolute_path, asset_info)
            elif asset_type == 'FONT':
                _fix_font_path(absolute_path, asset_info)
            elif asset_type == 'VOLUME':
                _fix_volume_path(absolute_path, asset_info)
            elif asset_type == 'TEXT':
                _fix_text_path(absolute_path, asset_info)
            elif asset_type == 'VSE':
                _fix_vse_path(absolute_path, asset_info)
            
            logger.debug(f"Fixed {asset_type} path: {asset_path} -> {absolute_path}")
            
        except Exception as e:
            logger.warning(f"Failed to fix asset path {asset_path}: {e}")


def _fix_image_path(absolute_path: Path, asset_info: Dict[str, Any]) -> None:
    """Fix image data block path."""
    image_name = asset_info.get('name')
    if not image_name:
        return
    
    image = bpy.data.images.get(image_name)
    if image and absolute_path.exists():
        try:
            image.filepath = str(absolute_path)
            image.reload()
            logger.debug(f"Reloaded image: {image_name}")
        except Exception as e:
            logger.warning(f"Failed to reload image {image_name}: {e}")


def _fix_library_path(absolute_path: Path, asset_info: Dict[str, Any]) -> None:
    """Fix library data block path."""
    library_name = asset_info.get('name')
    if not library_name:
        return
    
    library = bpy.data.libraries.get(library_name)
    if library and absolute_path.exists():
        try:
            library.filepath = str(absolute_path)
            library.reload()
            logger.debug(f"Reloaded library: {library_name}")
        except Exception as e:
            logger.warning(f"Failed to reload library {library_name}: {e}")


def _fix_sound_path(absolute_path: Path, asset_info: Dict[str, Any]) -> None:
    """Fix sound data block path."""
    sound_name = asset_info.get('name')
    if not sound_name:
        return
    
    sound = bpy.data.sounds.get(sound_name)
    if sound and absolute_path.exists():
        try:
            sound.filepath = str(absolute_path)
            sound.reload()
            logger.debug(f"Reloaded sound: {sound_name}")
        except Exception as e:
            logger.warning(f"Failed to reload sound {sound_name}: {e}")


def _fix_font_path(absolute_path: Path, asset_info: Dict[str, Any]) -> None:
    """Fix font data block path."""
    font_name = asset_info.get('name')
    if not font_name:
        return
    
    font = bpy.data.fonts.get(font_name)
    if font and absolute_path.exists():
        try:
            font.filepath = str(absolute_path)
            logger.debug(f"Updated font path: {font_name}")
        except Exception as e:
            logger.warning(f"Failed to update font {font_name}: {e}")


def _fix_volume_path(absolute_path: Path, asset_info: Dict[str, Any]) -> None:
    """Fix volume data block path."""
    volume_name = asset_info.get('name')
    if not volume_name:
        return
    
    volume = bpy.data.volumes.get(volume_name)
    if volume and absolute_path.exists():
        try:
            volume.filepath = str(absolute_path)
            logger.debug(f"Updated volume path: {volume_name}")
        except Exception as e:
            logger.warning(f"Failed to update volume {volume_name}: {e}")


def _fix_text_path(absolute_path: Path, asset_info: Dict[str, Any]) -> None:
    """Fix text data block path."""
    text_name = asset_info.get('name')
    if not text_name:
        return
    
    text = bpy.data.texts.get(text_name)
    if text and absolute_path.exists():
        try:
            text.filepath = str(absolute_path)
            logger.debug(f"Updated text path: {text_name}")
        except Exception as e:
            logger.warning(f"Failed to update text {text_name}: {e}")


def _fix_vse_path(absolute_path: Path, asset_info: Dict[str, Any]) -> None:
    """Fix VSE sequence path."""
    # VSE sequences are part of scenes, so we need to find and update them
    sequence_name = asset_info.get('name')
    if not sequence_name:
        return
    
    # Find sequence in all scenes
    for scene in bpy.data.scenes:
        if not scene.sequence_editor:
            continue
        
        for seq in scene.sequence_editor.sequences:
            if seq.name == sequence_name and hasattr(seq, 'filepath'):
                if absolute_path.exists():
                    try:
                        seq.filepath = str(absolute_path)
                        logger.debug(f"Updated VSE sequence path: {sequence_name}")
                    except Exception as e:
                        logger.warning(f"Failed to update VSE sequence {sequence_name}: {e}")
