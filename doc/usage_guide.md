# Difference Machine Usage Guide

This guide covers the three user-facing entry points: the Forester CLI, the Difference Machine GUI, and the Blender addon.

## 1. Setup And Configuration

### Requirements

- Forester binary in `PATH` or configured in `~/.dfm/setup.cfg`.
- Bundled `ffmpeg` next to the CLI (`bin/ffmpeg`) for image and video thumbnails. macOS builds copy ffmpeg from Homebrew or `DFM_FFMPEG_PATH`.
- Blender 4.5.0+ for `.blend` object workflows.
- Difference Machine GUI for desktop repository browsing and configuration.
- Blender addon for object tags, compare, asset, lock, and merge workflows.

### Global Config

Two files under `~/.dfm/`:

| File | Purpose |
|------|---------|
| `setup.cfg` | Author, Forester/API/addon/Blender paths, UI theme and language |
| `repos.cfg` | Current repository and the known-repo list |

`setup.cfg` common sections:

```ini
[user]
name=Name
email=user@example.com

[ui]
theme=light
language=en

[forester]
path=/path/to/forester
ffmpeg_path=/path/to/ffmpeg

[api]
path=/path/to/libforester.so

[addons]
diffmachine_path=/path/to/difference_machine/addon

[blender]
path=/path/to/blender
merge_apply_script=/path/to/merge_apply_background.py
```

`repos.cfg`:

```ini
[current repo]
path=/path/to/current/project

[repo]
path_1=/path/to/current/project
```

The builder can write a development `setup.cfg`:

```bash
./builder/build.sh --gui --write-local-config
```

See `builder/setup.cfg.example` for the full set of sections, including `[gc]`, `[python_bindings]`, and `[plugins]`.

## 2. Forester CLI

Create a repository:

```bash
forester init /path/to/project
```

Create a commit:

```bash
cd /path/to/project
forester status
forester add .
forester commit "Initial commit" --author "Name"
```

Work with branches:

```bash
forester branch
forester branch feature/ui
forester switch feature/ui
forester switch -a main
```

Stash, merge, and recover:

```bash
forester stash save "WIP"
forester stash list
forester stash pop
forester merge feature/ui
forester merge --abort
forester merge --continue
forester reflog
```

Other common commands:

```bash
forester log
forester diff
forester show <commit>
forester restore <file>
forester restore-version <commit>
forester reset --mixed <commit>
forester compare <full_hash>
forester api status.get --args '{}'
```

References:

- `doc/forester_command_short.md`
- `doc/forester_comand.md`

## 3. Difference Machine GUI

The GUI is a Wails desktop application in `sources/frontend/dfm-gui`. Architecture: `.cursor/gui/architecture.md`. JSON API contract: `.cursor/gui/gui_backend/jsonapi.md`.

Typical use:

1. Launch the built app from `builder/dist/payload/apps/` or a release package.
2. First Start: **Create** a repository or **Open** an existing project folder.
3. Configure author, Light/Dark theme, Forester/API/addon/Blender paths, and known repositories in Settings.
4. Browse the workdir grid (default 48×48 previews). Thumbnails cover images, video frames, `.blend` files, and text snippets.
5. Use the sidebar for the current branch, uncommitted files, **History**, and **Stash**.
6. Create a commit from the Uncommitted composer (not a separate dialog).
7. Open a file for preview; inspect a commit for text/image/binary diffs.
8. **Compare with working tree** extracts the commit into `.DFM/tmp_review` and opens that folder in the OS file manager.
9. Merge, switch, reset, and restore from the window menus and dialogs.

The GUI stores paths and author in `~/.dfm/setup.cfg`, the open repo in `~/.dfm/repos.cfg`, and talks to Forester in-process through the JSON API.

## 4. Blender Addon

Install from a built payload:

1. Build the project: `./builder/build.sh`.
2. In Blender, open Preferences -> Add-ons -> Install.
3. Select `builder/dist/payload/addons/blender/difference_machine`.
4. Enable the addon.

For development, use `sources/addons/blender/difference_machine`. API library setup: `sources/addons/blender/difference_machine/API_SETUP.md`.

After enabling, panels appear in **3D View -> Sidebar -> Difference Machine**.

Main panels:

- **Save Version**: create Forester commits from Blender.
- **Save Asset**: save selected objects as linked assets and update `.DFM/assets_registry.json`.
- **Compare**: load history, compare commits, retrieve objects, or restore project versions.
- **Object History**: inspect changes for selected objects.
- **Mark To**: mark selected objects as MERGE, DELETE, or RENAME.
- **Lock**: acquire or release collaborative file locks.

## 5. Object Tags And Manifests

Object tags are stored in Blender scene properties and synchronized to Forester manifest files under `.DFM/manifests/`. There is no Forester database file.

Supported merge tags:

- `MERGE`: import the tagged object from the merged branch.
- `DELETE`: remove the tagged object.
- `RENAME`: rename the object; the new name is stored in metadata.

Workflow:

1. Select objects in Blender.
2. Apply tags in the **Mark To** panel.
3. Sync tagged objects to Forester manifests.
4. Commit the changes.

If records already exist for the same commit and file, the addon refreshes the manifest data for that scope.

## 6. Object-Level Merge

Requirements:

- `.blend` objects are tagged and synced to manifests before merge.
- `blender.path` and `addons.diffmachine_path` are configured in `~/.dfm/setup.cfg` (Settings).
- Merge script: `{diffmachine_path}/scripts/merge_apply_background.py`. Optional override: `blender.merge_apply_script`.

High-level flow:

1. `forester merge --no-commit <branch>`
2. Forester prepares merge state and conflict data under `.DFM/`.
3. `merge_apply_background.py` opens Blender in background mode and applies DELETE, RENAME, and MERGE decisions.
4. Forester stages the resulting file.
5. `forester merge --continue` creates the merge commit.

If automatic object-level merge cannot resolve a conflict, open ours/theirs in Blender and resolve manually.

## 7. Recommended Workflow

1. Initialize a repository with the CLI, GUI, or addon.
2. Commit a clean starting point.
3. Create a feature branch.
4. Edit files and Blender objects.
5. In Blender, mark objects for MERGE, DELETE, or RENAME when needed.
6. Sync tags to manifests and commit.
7. Merge through the CLI or GUI.
8. Resolve any `.blend` conflicts with Blender.

## 8. Notes

- `.DFM/` contains all Forester repository state: objects, refs, index, manifests, reviews, locks, stash, reflog, and merge state.
- `.dfmignore` in the project root controls ignored files.
- Object-level operations require Blender; ordinary file operations do not.
- `restore-version` fully overwrites the working tree to match a commit but does not touch `.DFM/`.
- Only `workdir.open` may open `.DFM/tmp_review`; other workdir endpoints still hide `.DFM/`.
