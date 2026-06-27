"""
Asset registry utilities for tracking and managing assets.
Provides functions to maintain a registry of saved assets.
"""

import json
import logging
import os
import tempfile
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


def get_registry_path(repo_path: Path) -> Path:
    """Get path to asset registry JSON file."""
    return repo_path / ".DFM" / "assets_registry.json"


def load_registry(repo_path: Path) -> Dict[str, Any]:
    """Load asset registry from JSON file."""
    registry_path = get_registry_path(repo_path)
    if not registry_path.exists():
        return {}
    
    try:
        with open(registry_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logger.warning(f"Failed to load asset registry: {e}")
        return {}


def save_registry(repo_path: Path, registry: Dict[str, Any]) -> bool:
    """Save asset registry to JSON file."""
    try:
        registry_path = get_registry_path(repo_path)
        registry_path.parent.mkdir(parents=True, exist_ok=True)

        fd, tmp_name = tempfile.mkstemp(
            prefix=f".{registry_path.name}.",
            suffix=".tmp",
            dir=str(registry_path.parent),
        )
        try:
            with os.fdopen(fd, 'w', encoding='utf-8') as f:
                json.dump(registry, f, indent=2, ensure_ascii=False)
                f.write("\n")
                f.flush()
                os.fsync(f.fileno())
            os.replace(tmp_name, registry_path)
        except Exception:
            try:
                os.unlink(tmp_name)
            except OSError:
                pass
            raise

        return True
    except Exception as e:
        logger.error(f"Failed to save asset registry: {e}")
        return False


def add_asset_to_registry(
    repo_path: Path,
    asset_path: Path,
    object_name: str,
    object_type: str,
    category: str
) -> bool:
    """Add or update asset in registry."""
    registry_path = get_registry_path(repo_path)
    if registry_path.exists():
        try:
            with open(registry_path, 'r', encoding='utf-8') as f:
                registry = json.load(f)
        except Exception as e:
            logger.error(f"Refusing to overwrite unreadable asset registry: {e}")
            return False
    else:
        registry = {}
    
    # Make path relative to repo
    try:
        asset_path_rel = asset_path.relative_to(repo_path)
        asset_path_str = str(asset_path_rel)
    except ValueError:
        asset_path_str = str(asset_path)
    
    asset_entry = {
        'object_name': object_name,
        'object_type': object_type,
        'category': category,
        'path': asset_path_str,
    }
    
    registry[object_name] = asset_entry
    
    return save_registry(repo_path, registry)


def find_asset_in_registry(repo_path: Path, object_name: str) -> Optional[Dict[str, Any]]:
    """Find asset in registry by object name."""
    registry = load_registry(repo_path)
    return registry.get(object_name)


def list_assets_by_category(repo_path: Path, category: str) -> List[Dict[str, Any]]:
    """List all assets in a category."""
    registry = load_registry(repo_path)
    return [
        asset for asset in registry.values()
        if asset.get('category') == category
    ]


def search_assets(repo_path: Path, query: str) -> List[Dict[str, Any]]:
    """Search assets by name or category."""
    registry = load_registry(repo_path)
    query_lower = query.lower()
    
    results = []
    for asset in registry.values():
        if (query_lower in asset.get('object_name', '').lower() or
            query_lower in asset.get('category', '').lower()):
            results.append(asset)
    
    return results
