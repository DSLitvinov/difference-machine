"""
Merge helpers: MERGE_HEAD state, merge --continue, open Blender for resolve.
Used by RepositoryManager slots getMergeState, getMergeConflicts, mergeContinue, openBlendForResolve.
"""

import json
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Callable, Dict, List

from .config_loader import get_blender_path, get_forester_binary_path
from .logging_config import get_logger

log = get_logger()


def get_merge_state(repo_path: Path) -> Dict[str, Any]:
    """Return MERGE_HEAD state: branch, conflicts (paths), current_head, target_head, or {}."""
    if not repo_path:
        return {}
    p = repo_path / ".DFM" / "MERGE_HEAD"
    if not p.exists():
        return {}
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
        raw = data.get("conflicts") or []
        paths = [c.get("Path") or c.get("path") or "" for c in raw if c]
        return {
            "branch": (data.get("branch") or "").strip(),
            "conflicts": paths,
            "current_head": (data.get("current_head") or "").strip(),
            "target_head": (data.get("target_head") or "").strip(),
        }
    except Exception as e:
        log.warning("Error reading MERGE_HEAD: %s", e)
        return {}


def get_merge_conflicts(repo_path: Path) -> List[str]:
    """Return list of conflicted paths from MERGE_HEAD, or [] if no merge in progress."""
    state = get_merge_state(repo_path)
    return (state.get("conflicts") or []) if state else []


def merge_continue(repo_path: Path, set_error: Callable[[str], None]) -> bool:
    """Run 'forester merge --continue'. Returns True on success."""
    if not repo_path:
        set_error("Repository not set.")
        return False
    forester_bin = get_forester_binary_path()
    if not forester_bin:
        set_error("Forester binary not found.")
        return False
    try:
        proc = subprocess.run(
            [forester_bin, "merge", "--continue"],
            cwd=str(repo_path),
            capture_output=True,
            timeout=300,
            text=True,
        )
        if proc.returncode != 0:
            err = (proc.stderr or proc.stdout or "").strip() or f"exit {proc.returncode}"
            set_error(err)
            return False
        return True
    except subprocess.TimeoutExpired:
        set_error("Forester merge --continue timed out.")
        return False
    except Exception as e:
        set_error(f"Merge continue failed: {e}")
        return False


def open_blend_for_resolve(
    repo_path: Path,
    file_path: str,
    set_error: Callable[[str], None],
) -> bool:
    """Open .blend (ours) and optionally .theirs in Blender for conflict resolve."""
    if not repo_path or not file_path or not file_path.strip():
        return False
    path = file_path.strip()
    ours = repo_path / path
    if not ours.exists() or not str(ours).lower().endswith(".blend"):
        return False
    blender_path = get_blender_path()
    if not blender_path:
        return False
    theirs = repo_path / ".DFM" / "merge_theirs" / path
    try:
        if sys.platform == "darwin" and blender_path.lower().endswith(".app"):
            subprocess.Popen(["open", "-n", "-a", blender_path, "--args", str(ours)])
        else:
            subprocess.Popen([blender_path, str(ours)])
        if theirs.exists():
            time.sleep(1.0)
            if sys.platform == "darwin" and blender_path.lower().endswith(".app"):
                subprocess.Popen(["open", "-n", "-a", blender_path, "--args", str(theirs)])
            else:
                subprocess.Popen([blender_path, str(theirs)])
    except Exception as e:
        log.warning("Failed to open Blender: %s", e)
        return False
    return True
