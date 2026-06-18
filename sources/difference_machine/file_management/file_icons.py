"""
File icon associations - mapping file extensions to icon files.
"""

from pathlib import Path
from .icon_associations import FILE_ICON_ASSOCIATIONS


def get_file_icon(file_path):
    """Get icon path for a file based on its extension.
    
    Args:
        file_path: Path object or string path to the file
        
    Returns:
        str: Icon filename (e.g., '3d_file.svg', 'file.svg', 'folder.svg')
    """
    if not file_path:
        return FILE_ICON_ASSOCIATIONS['default']['icon']
    
    # Convert to Path if string
    if isinstance(file_path, str):
        file_path = Path(file_path)
    elif not isinstance(file_path, Path):
        return FILE_ICON_ASSOCIATIONS['default']['icon']
    
    # Directories always use folder icon
    if file_path.is_dir():
        return 'folder.svg'
    
    # Get file extension
    ext = file_path.suffix.lower()
    
    # Check each category (skip default)
    for category, config in FILE_ICON_ASSOCIATIONS.items():
        if category == 'default':
            continue
        if ext in config['extensions']:
            return config['icon']
    
    # Return default icon
    return FILE_ICON_ASSOCIATIONS['default']['icon']


def add_file_association(category, extensions, icon):
    """Add or update file association for a category.
    
    Args:
        category: Category name (e.g., '3d', 'text', 'code')
        extensions: List of file extensions (e.g., ['.ext1', '.ext2'])
        icon: Icon filename (e.g., 'custom_icon.svg')
    """
    FILE_ICON_ASSOCIATIONS[category] = {
        'extensions': extensions,
        'icon': icon
    }


def get_associations():
    """Get all file icon associations.
    
    Returns:
        dict: Dictionary of file icon associations
    """
    return FILE_ICON_ASSOCIATIONS.copy()