"""
Utility functions for safe class registration and unregistration in Blender addons.
"""

import bpy
from typing import List, Type, Any
import logging

logger = logging.getLogger(__name__)


def safe_register_class(cls: Type[Any]) -> bool:
    """
    Safely register a Blender class, handling cases where it's already registered.
    
    Args:
        cls: Blender class to register (Operator, Panel, PropertyGroup, etc.)
        
    Returns:
        True if registration succeeded, False otherwise
    """
    try:
        bpy.utils.register_class(cls)
        return True
    except ValueError:
        # Class already registered, unregister first
        try:
            bpy.utils.unregister_class(cls)
        except (ValueError, RuntimeError, KeyError):
            pass
        try:
            bpy.utils.register_class(cls)
            return True
        except Exception as e:
            logger.error(f"Failed to register class {cls.__name__}: {e}")
            return False
    except Exception as e:
        logger.error(f"Failed to register class {cls.__name__}: {e}")
        return False


def safe_unregister_class(cls: Type[Any]) -> bool:
    """
    Safely unregister a Blender class, handling cases where it's not registered.
    
    Args:
        cls: Blender class to unregister
        
    Returns:
        True if unregistration succeeded or class wasn't registered, False on error
    """
    try:
        bpy.utils.unregister_class(cls)
        return True
    except (ValueError, RuntimeError, KeyError):
        # Class not registered, which is fine
        return True
    except Exception as e:
        logger.error(f"Failed to unregister class {cls.__name__}: {e}")
        return False


def register_classes(classes: List[Type[Any]]) -> None:
    """
    Register multiple Blender classes safely.
    
    Args:
        classes: List of Blender classes to register
    """
    for cls in classes:
        safe_register_class(cls)


def unregister_classes(classes: List[Type[Any]], reverse: bool = True) -> None:
    """
    Unregister multiple Blender classes safely.
    
    Args:
        classes: List of Blender classes to unregister
        reverse: If True, unregister in reverse order (default: True)
    """
    classes_to_unregister = reversed(classes) if reverse else classes
    for cls in classes_to_unregister:
        safe_unregister_class(cls)
