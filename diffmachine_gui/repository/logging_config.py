"""
Logging configuration for diffmachine_gui.
Level can be set via DFM_LOG_LEVEL (e.g. DEBUG, INFO, WARNING).
"""

import logging
import os

LOG_NAME = "diffmachine_gui"


def setup_logging() -> None:
    """Configure app-wide logger. Call once at startup from main.py."""
    level_name = os.environ.get("DFM_LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)
    logging.basicConfig(
        level=level,
        format="%(levelname)s:%(name)s:%(message)s",
    )
    log = logging.getLogger(LOG_NAME)
    log.setLevel(level)


def get_logger():
    """Return the app logger for use in repository, file_viewer, etc."""
    return logging.getLogger(LOG_NAME)
