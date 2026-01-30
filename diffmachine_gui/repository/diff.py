"""
Diff logic for repository: HTML diff generation, parent hash, line opcodes.
Used by RepositoryManager slots getDiffHtml, getDiffHtmlAdvanced, getCommitInfo, getCommitParentHash.
"""

from pathlib import Path
from typing import Any, Callable, List

from .logging_config import get_logger

log = get_logger()
_diff_processor = None
_FAILED = object()


def _get_diff_processor():
    """Lazy import of diff processor. Returns None if diff_viewer is unavailable."""
    global _diff_processor
    if _diff_processor is _FAILED:
        return None
    if _diff_processor is None:
        try:
            from diff_viewer import get_diff_processor as _get_dp
            _diff_processor = _get_dp()
        except Exception as e:
            log.warning("Diff processor unavailable: %s", e, exc_info=True)
            _diff_processor = _FAILED
            return None
    return _diff_processor


def get_commit_parent_hash(api_wrapper: Any, repo_path: Path, commit_hash: str) -> str:
    """Return parent hash of a commit from log, or empty string."""
    if not commit_hash:
        return ""
    try:
        ok, commits, error = api_wrapper.get_log(repo_path, limit=1000)
        if ok and commits:
            for commit in commits:
                if commit.get("hash") == commit_hash:
                    return commit.get("parent_hash", "") or ""
    except Exception:
        pass
    return ""


def _should_report_error(error: str) -> bool:
    if not error:
        return False
    el = error.lower()
    return not ("not found" in el or "not in commit" in el or "not a file" in el)


def get_diff_html(
    repo_path: Path,
    api_wrapper: Any,
    commit_hash: str,
    file_path: str,
    is_dark: bool,
    set_error: Callable[[str], None],
) -> str:
    """
    Get HTML diff for a file in a commit (commit vs parent, like git show).
    Returns empty string on error; set_error is called for user-visible errors.
    """
    if not commit_hash or not file_path:
        return ""

    def load_text(target_hash: str) -> str:
        ok, content, err = api_wrapper.get_commit_file_content(repo_path, target_hash, file_path)
        if ok and content is not None:
            try:
                return content.decode("utf-8")
            except Exception:
                return content.decode("utf-8", errors="replace")
        if err and _should_report_error(err):
            set_error(err)
        return ""

    try:
        parent_hash = get_commit_parent_hash(api_wrapper, repo_path, commit_hash)
        old_text = load_text(parent_hash) if parent_hash else ""
        new_text = load_text(commit_hash)
        proc = _get_diff_processor()
        if proc is None:
            set_error("Diff view unavailable.")
            return ""
        theme = "dark" if is_dark else "light"
        return proc.diff_to_html(old_text, new_text, line_numbers=True, theme=theme)
    except Exception as e:
        set_error(f"Diff error: {e}")
        return ""


def get_diff_html_advanced(
    repo_path: Path,
    api_wrapper: Any,
    source1_type: str,
    source1_value: str,
    source2_type: str,
    source2_value: str,
    file_path: str,
    is_dark: bool,
    set_error: Callable[[str], None],
) -> str:
    """
    Get HTML diff comparing two sources (working/commit/branch).
    Returns empty string on error; set_error is called for user-visible errors.
    """
    if not file_path:
        return ""

    def load_text_from_source(source_type: str, source_value: str) -> str:
        if source_type == "working":
            try:
                p = repo_path / file_path
                if not p.exists() or not p.is_file():
                    return ""
                raw = p.read_bytes()
                try:
                    return raw.decode("utf-8")
                except Exception:
                    return raw.decode("utf-8", errors="replace")
            except Exception:
                return ""
        if source_type == "commit":
            if not source_value:
                return ""
            ok, content, err = api_wrapper.get_commit_file_content(repo_path, source_value, file_path)
            if ok and content is not None:
                try:
                    return content.decode("utf-8")
                except Exception:
                    return content.decode("utf-8", errors="replace")
            if err and _should_report_error(err):
                set_error(err)
            return ""
        if source_type == "branch":
            if not source_value:
                return ""
            try:
                ok, branches, _ = api_wrapper.get_branches(repo_path)
                if ok and branches:
                    for b in branches:
                        if b.get("name") == source_value:
                            ch = b.get("commit_hash", "")
                            if ch:
                                ok, content, err = api_wrapper.get_commit_file_content(
                                    repo_path, ch, file_path
                                )
                                if ok and content is not None:
                                    try:
                                        return content.decode("utf-8")
                                    except Exception:
                                        return content.decode("utf-8", errors="replace")
                                if err and _should_report_error(err):
                                    set_error(err)
                            break
            except Exception:
                pass
            return ""
        return ""

    try:
        old_text = load_text_from_source(source1_type, source1_value)
        new_text = load_text_from_source(source2_type, source2_value)
        proc = _get_diff_processor()
        if proc is None:
            set_error("Diff view unavailable.")
            return ""
        theme = "dark" if is_dark else "light"
        return proc.diff_to_html(old_text, new_text, line_numbers=True, theme=theme)
    except Exception as e:
        set_error(f"Diff error: {e}")
        return ""


def compute_line_opcodes(lines1: List[str], lines2: List[str]) -> list:
    """
    Return line-level opcodes for two line lists. Used for commit stats.
    Returns [] if diff processor is unavailable.
    """
    proc = _get_diff_processor()
    if proc is None:
        return []
    try:
        return proc.compute_line_opcodes(lines1, lines2)
    except Exception:
        return []
