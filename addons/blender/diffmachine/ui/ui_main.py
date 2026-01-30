"""
Main UI module for Difference Machine add-on.
Contains panels and menus registration.
"""
import logging
from .ui_panels import (
    DF_PT_save_asset_panel,
    DF_PT_compare_panel,
    DF_PT_object_history_panel,
    DF_PT_mark_to_panel,
    DF_PT_lock_panel,
)
from .ui_lists import (
    DF_UL_commit_list,
    DF_UL_branch_list,
)
from ..utils.registration import register_classes, unregister_classes

logger = logging.getLogger(__name__)

# Classes list for registration
classes = [
    # UI Lists
    DF_UL_commit_list,
    DF_UL_branch_list,
    # Panels
    DF_PT_save_asset_panel,
    DF_PT_compare_panel,
    DF_PT_object_history_panel,
    DF_PT_mark_to_panel,
    DF_PT_lock_panel,
]


def register():
    """Register UI classes and properties"""
    try:
        register_classes(classes)
    except Exception as e:
        logger.error(f"Error registering UI classes: {e}", exc_info=True)
        raise


def unregister():
    """Unregister UI classes"""
    try:
        unregister_classes(classes)
    except Exception as e:
        logger.error(f"Error unregistering UI classes: {e}", exc_info=True)
        raise
