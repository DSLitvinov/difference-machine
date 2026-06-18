"""
File icon associations configuration.

This module defines the mapping between file extensions and icon files.
"""

# File icon associations
FILE_ICON_ASSOCIATIONS = {
    # 3D files
    '3d': {
        'extensions': ['.blend', '.c4d', '.max', '.ma', '.mb', '.fbx', '.obj', '.dae', '.3ds', '.x3d', '.gltf', '.glb', '.xps'],
        'icon': '3d_file.svg'
    },
    # Text files
    'text': {
        'extensions': ['.txt', '.md', '.markdown', '.rst', '.log', '.readme'],
        'icon': 'file.svg'
    },
    # Code files
    'code': {
        'extensions': ['.py', '.js', '.ts', '.cpp', '.c', '.h', '.java', '.go', '.rs', '.sh', '.bat'],
        'icon': 'file.svg'
    },
    # Image files
    'image': {
        'extensions': ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.bmp', '.webp'],
        'icon': 'file.svg'
    },
    # Default
    'default': {
        'extensions': [],
        'icon': 'file.svg'
    }
}