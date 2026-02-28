"""
Legacy-friendly Python bindings for Forester C API.

This module now wraps the structured API from python_bindings_structured.
It keeps the original method names but returns structured payloads instead
of raw JSON strings.
"""

from typing import Optional, List, Dict, Any, Tuple

from python_bindings_structured import ForesterAPI as StructuredForesterAPI


def _parse_log_options(options: Optional[List[str]]) -> Tuple[int, Optional[str], List[str]]:
    """Parse a subset of log options for the structured API."""
    if not options:
        return 0, None, []

    max_count = 0
    branch = None
    ignored: List[str] = []

    i = 0
    while i < len(options):
        opt = options[i]
        if opt in ("-n", "--max-count"):
            if i + 1 < len(options):
                try:
                    max_count = int(options[i + 1])
                except ValueError:
                    ignored.append(opt)
                i += 2
                continue
            ignored.append(opt)
        elif opt.startswith("-n") and len(opt) > 2:
            try:
                max_count = int(opt[2:])
            except ValueError:
                ignored.append(opt)
        elif opt.startswith("--max-count="):
            try:
                max_count = int(opt.split("=", 1)[1])
            except ValueError:
                ignored.append(opt)
        elif opt.startswith("--branch="):
            branch = opt.split("=", 1)[1]
        else:
            ignored.append(opt)
        i += 1

    return max_count, branch, ignored


class ForesterAPI:
    """Compatibility wrapper for the structured Forester API."""

    def __init__(self, library_path: Optional[str] = None):
        self._api = StructuredForesterAPI(library_path)

    def init(self, repo_path: str) -> Dict[str, Any]:
        return self._api.init(repo_path)

    def add(self, repo_path: str, files: Optional[List[str]] = None) -> Dict[str, Any]:
        return self._api.add(repo_path, files)

    def commit(
        self,
        repo_path: str,
        message: str,
        author: Optional[str] = None,
        amend: bool = False
    ) -> Dict[str, Any]:
        return self._api.commit(repo_path, message, author, amend)

    def status(self, repo_path: str) -> Dict[str, Any]:
        status = self._api.get_status(repo_path)
        if not status:
            return {"success": False, "error": "Failed to get status"}
        return {"success": True, "status": status.to_dict()}

    def log(self, repo_path: str, options: Optional[List[str]] = None) -> Dict[str, Any]:
        max_count, branch, ignored = _parse_log_options(options)
        commits = self._api.get_log(repo_path, max_count=max_count, branch=branch)
        if commits is None:
            return {"success": False, "error": "Failed to get log"}

        result = {
            "success": True,
            "commits": [commit.to_dict() for commit in commits],
        }
        if ignored:
            result["warning"] = f"Ignored log options: {', '.join(ignored)}"
        return result

    def branch(self, repo_path: str, args: Optional[List[str]] = None) -> Dict[str, Any]:
        if not args:
            branches = self._api.get_branches(repo_path)
            if branches is None:
                return {"success": False, "error": "Failed to get branches"}
            return {"success": True, "branches": [branch.to_dict() for branch in branches]}

        if len(args) == 0:
            return {"success": False, "error": "branch name required"}

        command = args[0]
        if command in ("-d", "--delete"):
            if len(args) != 2:
                return {"success": False, "error": "usage: branch -d <name>"}
            result = self._api.delete_branch(repo_path, args[1])
            return result
        if command in ("-m", "--move", "--rename"):
            if len(args) != 3:
                return {"success": False, "error": "usage: branch -m <old-name> <new-name>"}
            result = self._api.rename_branch(repo_path, args[1], args[2])
            return result
        if command.startswith("-"):
            return {"success": False, "error": f"unknown flag: {command}"}
        if len(args) > 1:
            return {"success": False, "error": "unexpected arguments after branch name"}

        result = self._api.create_branch(repo_path, command)
        return result

    def switch(self, repo_path: str, target: str, auto_stash: bool = False) -> Dict[str, Any]:
        return self._api.switch(repo_path, target, auto_stash)

    def diff(self, repo_path: str, options: Optional[List[str]] = None) -> Dict[str, Any]:
        return {
            "success": False,
            "error": "Diff is not available in the structured API. Use the Forester CLI instead.",
        }

    def command(self, repo_path: str, cmd: str, args: Optional[List[str]] = None) -> Dict[str, Any]:
        return {
            "success": False,
            "error": "Generic command execution is not available in the structured API.",
        }


# Convenience functions for direct use
def init(repo_path: str, library_path: Optional[str] = None) -> Dict[str, Any]:
    return ForesterAPI(library_path).init(repo_path)


def add(repo_path: str, files: Optional[List[str]] = None, library_path: Optional[str] = None) -> Dict[str, Any]:
    return ForesterAPI(library_path).add(repo_path, files)


def commit(
    repo_path: str,
    message: str,
    author: Optional[str] = None,
    amend: bool = False,
    library_path: Optional[str] = None
) -> Dict[str, Any]:
    return ForesterAPI(library_path).commit(repo_path, message, author, amend)


def status(repo_path: str, library_path: Optional[str] = None) -> Dict[str, Any]:
    return ForesterAPI(library_path).status(repo_path)


def log(repo_path: str, options: Optional[List[str]] = None, library_path: Optional[str] = None) -> Dict[str, Any]:
    return ForesterAPI(library_path).log(repo_path, options)


def branch(repo_path: str, args: Optional[List[str]] = None, library_path: Optional[str] = None) -> Dict[str, Any]:
    return ForesterAPI(library_path).branch(repo_path, args)


def switch(repo_path: str, target: str, auto_stash: bool = False, library_path: Optional[str] = None) -> Dict[str, Any]:
    return ForesterAPI(library_path).switch(repo_path, target, auto_stash)


def diff(repo_path: str, options: Optional[List[str]] = None, library_path: Optional[str] = None) -> Dict[str, Any]:
    return ForesterAPI(library_path).diff(repo_path, options)


def command(repo_path: str, cmd: str, args: Optional[List[str]] = None, library_path: Optional[str] = None) -> Dict[str, Any]:
    return ForesterAPI(library_path).command(repo_path, cmd, args)
