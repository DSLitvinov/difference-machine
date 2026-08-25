"""
Auto-save version and scheduled GC timer logic for Difference Machine addon.
"""

import time
import datetime
from pathlib import Path
from typing import Optional

import bpy

from .logging_config import get_logger
from .helpers import find_repository_root, get_addon_preferences

logger = get_logger(__name__)

# Last auto save timestamp for interval tracking
_auto_save_last_run: float = 0.0


def run_auto_save_commit(repo_path: Path, prefs) -> None:
    """Run add + commit via Forester JSON API."""
    author = getattr(prefs, "default_author", "Unknown") or "Unknown"
    commit_message = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    try:
        from .forester_api import get_api
        api = get_api()
        success, add_error = api.add(repo_path, ["."])
        if not success:
            logger.warning("Auto save API add failed: %s", add_error)
            return
        success, _, commit_error = api.commit(repo_path, commit_message, author=author)
        if success:
            logger.info("Auto save version: %s", commit_message)
        else:
            logger.warning("Auto save API commit failed: %s", commit_error)
    except Exception as e:
        logger.warning("Auto save API error: %s", e)


def check_auto_save_version() -> Optional[float]:
    """Timer callback for auto save version - save file and create commit at interval. Returns next interval in seconds."""
    global _auto_save_last_run
    if getattr(bpy.app, "background", False):
        return None
    try:
        if not bpy.context or not bpy.data.filepath:
            return 10.0

        prefs = get_addon_preferences(bpy.context)
        if not getattr(prefs, "auto_save_enabled", False):
            return 10.0

        blend_file = Path(bpy.data.filepath).resolve()
        repo_path = find_repository_root(blend_file.parent)
        if not repo_path or not repo_path.exists():
            return 10.0
        repo_path = repo_path.resolve()

        interval_minutes = getattr(prefs, "auto_save_interval", 5)
        interval_seconds = interval_minutes * 60
        current_time = time.time()
        if _auto_save_last_run > 0 and (current_time - _auto_save_last_run) < interval_seconds:
            return 10.0

        try:
            ctx = bpy.context
            if ctx.window_manager and ctx.window_manager.windows:
                with ctx.temp_override(window=ctx.window_manager.windows[0]):
                    bpy.ops.wm.save_mainfile()
            else:
                bpy.ops.wm.save_mainfile()
        except RuntimeError as e:
            logger.debug("Auto save: failed to save file: %s", e)
            return 10.0

        _auto_save_last_run = current_time
        run_auto_save_commit(repo_path, prefs)
    except (AttributeError, RuntimeError, ValueError) as e:
        logger.debug("Error in auto save check: %s", e)
    except Exception as e:
        logger.error("Unexpected error in auto save: %s", e, exc_info=True)
    return 10.0


def check_scheduled_gc() -> Optional[float]:
    """Timer callback to check and run scheduled garbage collection. Returns next interval in seconds."""
    if getattr(bpy.app, "background", False):
        return None
    try:
        if not bpy.context or not bpy.data.filepath:
            return 60.0

        blend_file = Path(bpy.data.filepath)
        repo_path = find_repository_root(blend_file.parent)
        if not repo_path:
            return 60.0

        prefs = get_addon_preferences(bpy.context)
        if not getattr(prefs, "gc_schedule_enabled", False):
            return 60.0

        from .forester_api import get_api

        current_time = time.time()
        last_run = getattr(prefs, "gc_last_run", 0.0)
        schedule_hour = getattr(prefs, "gc_schedule_hour", 2)
        schedule_minute = getattr(prefs, "gc_schedule_minute", 0)
        interval_days = getattr(prefs, "gc_schedule_interval_days", 7)

        now = datetime.datetime.now()
        scheduled_time = now.replace(hour=schedule_hour, minute=schedule_minute, second=0, microsecond=0)

        should_run = False
        if current_time >= scheduled_time.timestamp():
            if last_run <= 0:
                should_run = True
            else:
                last_run_date = datetime.datetime.fromtimestamp(last_run).date()
                days_since_run = (now.date() - last_run_date).days
                if days_since_run >= interval_days:
                    should_run = True

        if should_run:
            api = get_api()
            reflog_expire_days = getattr(prefs, "reflog_expire_days", 90)
            success, _, error = api.gc(repo_path, dry_run=False, reflog_expire_days=reflog_expire_days)
            if success:
                prefs.gc_last_run = current_time
            else:
                logger.warning("Scheduled GC failed: %s", error)

        return 60.0
    except (AttributeError, RuntimeError, ValueError) as e:
        logger.debug("Error in scheduled GC check: %s", e)
        return 60.0
    except Exception as e:
        logger.error("Unexpected error in scheduled GC check: %s", e, exc_info=True)
        return 60.0
