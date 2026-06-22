#!/usr/bin/env python3
"""Tests for Forester JSON Python bindings (requires built libforester)."""

import os
import shutil
import sys
import tempfile
import unittest
from pathlib import Path
from typing import Optional

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from python_bindings_json import ForesterAPI  # noqa: E402


def find_library() -> Optional[str]:
    candidates = [
        SCRIPT_DIR.parent / "build" / "libforester.dylib",
        SCRIPT_DIR.parent / "build" / "libforester.so",
        SCRIPT_DIR.parent / "build" / "forester.dll",
    ]
    for path in candidates:
        if path.exists():
            return str(path)
    return None


LIB_PATH = find_library()


@unittest.skipUnless(LIB_PATH, "libforester not built (run make build-lib)")
class TestForesterJSONBindings(unittest.TestCase):
    repo_dir: str
    api: ForesterAPI

    def setUp(self) -> None:
        self.repo_dir = tempfile.mkdtemp(prefix="forester-json-test-")
        self.api = ForesterAPI(LIB_PATH)

    def tearDown(self) -> None:
        if getattr(self, "api", None) is not None:
            self.api.close()
            self.api = None  # type: ignore[assignment]
        if getattr(self, "repo_dir", None):
            shutil.rmtree(self.repo_dir, ignore_errors=True)

    def test_init_status_commit_log(self) -> None:
        self.api.init(self.repo_dir)

        status = self.api.get_status(self.repo_dir)
        self.assertIsNotNone(status)
        self.assertEqual(status.current_branch, "main")

        hello = os.path.join(self.repo_dir, "hello.txt")
        with open(hello, "w", encoding="utf-8") as f:
            f.write("hello json api")

        self.api.add(self.repo_dir, ["hello.txt"])
        self.api.commit(self.repo_dir, "python test commit", author="pytest")

        commits = self.api.get_log(self.repo_dir, max_count=5)
        self.assertIsNotNone(commits)
        self.assertEqual(len(commits), 1)
        self.assertEqual(commits[0].message, "python test commit")
        self.assertEqual(commits[0].author, "pytest")
        self.assertEqual(len(commits[0].hash), 64)

    def test_branches_and_objects(self) -> None:
        self.api.init(self.repo_dir)
        blend = os.path.join(self.repo_dir, "scene.blend")
        with open(blend, "w", encoding="utf-8") as f:
            f.write("blend")
        self.api.add(self.repo_dir, ["scene.blend"])
        self.api.commit(self.repo_dir, "scene")

        commits = self.api.get_log(self.repo_dir, max_count=1)
        commit_hash = commits[0].hash

        self.api.create_branch(self.repo_dir, "feature", commit_hash)
        branches = self.api.get_branches(self.repo_dir)
        names = {b.name for b in branches}
        self.assertIn("feature", names)
        self.assertIn("main", names)

        self.api.add_object(
            self.repo_dir,
            editor_type="blender",
            file_path="scene.blend",
            object_name="Cube",
            object_type="MESH",
            commit_hash=commit_hash,
            object_data={"v_count": 8},
            tags=["hero"],
            metadata={"layer": "1"},
        )
        obj = self.api.get_object(self.repo_dir, commit_hash, "scene.blend", "Cube")
        self.assertIsNotNone(obj)
        self.assertEqual(obj["object_name"], "Cube")

        objects = self.api.get_objects_by_commit(self.repo_dir, commit_hash)
        self.assertEqual(len(objects), 1)

    def test_locks_gc_rebuild(self) -> None:
        self.api.init(self.repo_dir)
        asset = os.path.join(self.repo_dir, "asset.txt")
        with open(asset, "w", encoding="utf-8") as f:
            f.write("data")

        locks = self.api.list_locks(self.repo_dir)
        self.assertTrue(locks["success"])
        self.assertEqual(locks["locks"], [])

        self.api.acquire_lock(self.repo_dir, "asset.txt", "alice")
        locks = self.api.list_locks(self.repo_dir)
        self.assertEqual(len(locks["locks"]), 1)

        self.api.release_lock(self.repo_dir, "asset.txt", "alice")
        locks = self.api.list_locks(self.repo_dir)
        self.assertEqual(locks["locks"], [])

        self.api.add(self.repo_dir, ["asset.txt"])
        self.api.commit(self.repo_dir, "for gc")

        gc = self.api.gc(self.repo_dir, dry_run=True)
        self.assertTrue(gc["success"])
        self.assertTrue(gc["dry_run"])

        rebuild = self.api.rebuild(self.repo_dir)
        self.assertTrue(rebuild["success"])
        self.assertGreaterEqual(rebuild["commits_found"], 1)

    def test_context_manager_closes_handles(self) -> None:
        with ForesterAPI(LIB_PATH) as api:
            api.init(self.repo_dir)
            status = api.get_status(self.repo_dir)
            self.assertEqual(status.current_branch, "main")

        with self.assertRaises(RuntimeError):
            api.get_status(self.repo_dir)


if __name__ == "__main__":
    unittest.main(verbosity=2)
