"""
Image helpers for repository: commit/working-dir image URLs, diff image, file size.
Cache for one temporary file from get_image_from_commit; clear via clear_image_cache() (e.g. on repo change).
"""

import os
import tempfile
from pathlib import Path
from typing import Any, Callable, Optional

from PyQt6.QtCore import QUrl


_last_image_path: Optional[str] = None


def clear_image_cache() -> None:
    """Remove the temporary file used for commit image preview, if any. Call on repo change."""
    global _last_image_path
    if _last_image_path:
        try:
            if os.path.exists(_last_image_path):
                os.unlink(_last_image_path)
        except OSError:
            pass
        _last_image_path = None


def get_image_from_commit(
    repo_path: Path,
    api_wrapper: Any,
    commit_hash: str,
    file_path: str,
    set_error: Callable[[str], None],
) -> str:
    """
    Write commit file content to a temp file and return its file:// URL.
    Keeps at most one temp file; creating a new one replaces the previous.
    Returns "" on error; set_error is called for user-visible errors.
    """
    global _last_image_path
    if not commit_hash or not file_path:
        return ""
    try:
        ok, content, error = api_wrapper.get_commit_file_content(
            repo_path, commit_hash, file_path
        )
        if not ok or content is None:
            if error:
                set_error(error)
            return ""
        clear_image_cache()
        file_ext = Path(file_path).suffix or ".png"
        if not file_ext.startswith("."):
            file_ext = "." + file_ext
        temp_dir = tempfile.gettempdir()
        with tempfile.NamedTemporaryFile(
            suffix=file_ext,
            prefix="diffmachine_image_",
            dir=temp_dir,
            delete=False,
        ) as f:
            f.write(content)
            _last_image_path = f.name
        return QUrl.fromLocalFile(_last_image_path).toString()
    except Exception as e:
        set_error(f"Error loading image from commit: {e}")
        return ""


def get_image_from_working_dir(
    repo_path: Path,
    file_path: str,
    set_error: Callable[[str], None],
) -> str:
    """Return file:// URL for a file in the working directory, or "" on error."""
    if not file_path:
        return ""
    try:
        full_path = (repo_path / file_path).resolve()
        if not full_path.exists():
            return ""
        return QUrl.fromLocalFile(str(full_path)).toString()
    except Exception as e:
        set_error(f"Error loading image from working directory: {e}")
        return ""


def generate_diff_image(
    image1_url: str,
    image2_url: str,
    set_error: Callable[[str], None],
) -> str:
    """Return file:// URL of a generated diff image, or "" on error."""
    try:
        from diff_viewer.image_diff_processor import generate_diff_image as _gen
        path1 = image1_url[7:] if image1_url.startswith("file://") else image1_url
        path2 = image2_url[7:] if image2_url.startswith("file://") else image2_url
        if not Path(path1).exists() or not Path(path2).exists():
            return ""
        diff_path = _gen(path1, path2)
        if not diff_path:
            return ""
        return QUrl.fromLocalFile(diff_path).toString()
    except Exception as e:
        set_error(f"Error generating diff image: {e}")
        return ""


def get_file_size(file_url: str) -> int:
    """Return file size in bytes for a file:// URL, or 0 on error."""
    try:
        path = file_url[7:] if file_url.startswith("file://") else file_url
        p = Path(path)
        if not p.exists():
            return 0
        return p.stat().st_size
    except Exception:
        return 0
