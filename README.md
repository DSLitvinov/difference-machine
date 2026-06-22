**Version:** 0.7.5 (Forester, Blender Addon).

## About

**Difference Machine** is a local, Git-like version control system for Blender projects. It tracks file history, supports branches and merges, and adds **object-level** versioning inside `.blend` files so you can resolve conflicts by choosing which objects to keep, delete, rename, or merge from either branch.

![Compare blend](/doc/resources/Compare%20blend.png)

*Comparison of `.blend` versions in the Difference Machine: two Blender windows (parent and commit).*

### Components

- **Forester** — Go-based CLI and core engine. Manages repositories under a `.DFM` directory: SQLite for metadata, content-addressed storage (blobs/trees/commits), branches, stash, and index (staging). Single binary, no external runtime.

- **Blender Addon** — Panel in the 3D View sidebar. Marks objects with workflow tags (MERGE, DELETE, RENAME), syncs them to the Forester DB, and integrates with init/commit/branch/history/merge. Uses only Blender’s built-in Python.

### Main features

- **Repository lifecycle**: `forester init`, `status`, `add`, `commit`, `branch`, `switch`, `merge`, `stash`, `log`, `diff`.
- **Object-level merge**: Tag Blender objects as MERGE/DELETE/RENAME, sync to DB, then merge via CLI or addon; a Blender background script applies those decisions in the merged `.blend`.
- **Conflict handling**: Review changes in Blender; optional automatic resolve when `merge_apply_background.py` is configured.
- **Config**: Global config in `~/.dfm/setup.cfg` (Forester binary, Blender path, merge script). Repo-level `.dfmignore` for exclude patterns.

## Dependencies

### System dependencies
- **SQLite3** >= 3.45.1 (e.g. `libsqlite3-dev` on Debian/Ubuntu)
- **Go** >= 1.21
- **GCC/C compiler** (for CGO)
- **Blender** >= 4.5.0 (for the addon)

### Go dependencies (forester)
- github.com/mattn/go-sqlite3 v1.14.17

### Build

See `builder/README.md` for building the distribution payload (Forester CLI, native API library, Blender addon).
