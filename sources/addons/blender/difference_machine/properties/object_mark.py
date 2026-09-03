"""
Property groups for object marking and tagging.
"""

import bpy
import json
import logging
from bpy.props import StringProperty

logger = logging.getLogger(__name__)


class DFObject(bpy.types.PropertyGroup):
    """Property group for marked objects."""
    
    object_name: StringProperty(name="Object Name")
    object_type: StringProperty(name="Object Type")
    file_path: StringProperty(name="File Path")
    commit_hash: StringProperty(name="Commit Hash")
    tags: StringProperty(name="Tags", default="[]")  # JSON array
    metadata: StringProperty(name="Metadata", default="{}")  # JSON object
    
    def get_tags(self) -> list:
        """Get tags as Python list."""
        try:
            return json.loads(self.tags) if self.tags else []
        except (json.JSONDecodeError, TypeError, ValueError):
            return []
    
    def set_tags(self, tags: list):
        """Set tags from Python list."""
        self.tags = json.dumps(tags)
    
    def get_metadata(self) -> dict:
        """Get metadata as Python dict."""
        try:
            return json.loads(self.metadata) if self.metadata else {}
        except (json.JSONDecodeError, TypeError, ValueError):
            return {}
    
    def set_metadata(self, metadata: dict):
        """Set metadata from Python dict."""
        self.metadata = json.dumps(metadata)


def register():
    """Register property groups."""
    from ..utils.registration import register_classes
    register_classes([DFObject])
    
    # Register collection property
    bpy.types.Scene.df_objects = bpy.props.CollectionProperty(type=DFObject)
    bpy.types.Scene.df_object_marks_loaded_key = bpy.props.StringProperty(
        name="Object Marks Cache Key",
        default="",
    )


def unregister():
    """Unregister property groups."""
    if hasattr(bpy.types.Scene, "df_object_marks_loaded_key"):
        del bpy.types.Scene.df_object_marks_loaded_key
    if hasattr(bpy.types.Scene, 'df_objects'):
        del bpy.types.Scene.df_objects
    
    from ..utils.registration import unregister_classes
    unregister_classes([DFObject])
