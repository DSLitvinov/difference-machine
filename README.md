**Version:** 0.7.5 (Forester, difference_machine, Blender Addon).

## About

**Difference Machine** is a local, Git-like version control system for Blender projects. It tracks file history, supports branches and merges, and adds **object-level** versioning inside `.blend` files so you can resolve conflicts by choosing which objects to keep, delete, rename, or merge from either branch.

![Compare blend](/doc/resources/Compare%20blend.png)

*Comparison of `.blend` versions in the Difference Machine: two Blender windows (parent and commit) and a diff in the GUI.*

### Components

- **Forester** — Go-based CLI and core engine. Manages repositories under a `.DFM` directory: SQLite for metadata, content-addressed storage (blobs/trees/commits), branches, stash, and index (staging). Single binary, no external runtime.

- **Blender Addon** — Panel in the 3D View sidebar. Marks objects with workflow tags (MERGE, DELETE, RENAME), syncs them to the Forester DB, and integrates with init/commit/branch/history. Uses only Blender’s built-in Python.

- **difference_machine** — Desktop app (PyQt6) to open repos, inspect changed files, view text/image diffs, switch branches, and run merges. For `.blend` files with synced object tags, it drives object-level merge via a background Blender script (delete/rename/merge chosen objects).

### Main features

- **Repository lifecycle**: `forester init`, `status`, `add`, `commit`, `branch`, `switch`, `merge`, `stash`, `log`, `diff`.
- **Object-level merge**: Tag Blender objects as MERGE/DELETE/RENAME, sync to DB, then merge in the GUI; a Blender script applies those decisions in the merged `.blend`.
- **Conflict handling**: Review changes in the GUI or open Blender to resolve; optional automatic resolve when the merge script is configured.
- **Config**: Global config in `~/.dfm/setup.cfg` (Forester binary, Blender path, merge script). Repo-level `.dfmignore` for exclude patterns.

After installation via the unified installer, you can start the GUI:

- from the OS shortcut (applications menu on Linux, `.command` launcher on macOS, Start Menu/Desktop on Windows), or
- from the command line as `dfm-gui` / `dfm-gui.cmd` if the installer `bin` directory is in your PATH.

## Dependencies

### System dependencies
- **SQLite3** >= 3.45.1 (e.g. `libsqlite3-dev` on Debian/Ubuntu)
- **Go** >= 1.21
- **GCC/C compiler** (for CGO)
- **genisoimage** >= 1.1.11 (or mkisofs/xorriso) — only for building installer ISO images
- **Blender** >= 4.5.0 (for the addon)
- **Python** >= 3.10 (for difference_machine; Blender ships its own Python)

### Python dependencies (difference_machine)
- PyQt6 >= 6.6.0
- PyQt6-Qt6 >= 6.6.0
- PyQt6-sip >= 13.6.0
- PyQt6-WebEngine
- Pygments >= 2.15.0
- diff-match-patch >= 20230430

### Build dependencies (installer / PyInstaller)
To build a standalone GUI bundle (no system Python required on the target machine), use the installer build environment:

```bash
pip install -r installer/requirements-build.txt
```

This installs:
- **PyInstaller** >= 6.0.0
- All of `difference_machine/requirements.txt` (needed for PyInstaller to analyze and bundle the app)

Then run, on the target OS:
- **Linux/macOS:** `installer/scripts/build_gui_pyinstaller.sh`
- **Windows:** `installer/scripts/build_gui_pyinstaller.bat`

See `installer/README.md` for the full installer build and packaging flow.

### Go dependencies (forester)
- github.com/mattn/go-sqlite3 v1.14.17
