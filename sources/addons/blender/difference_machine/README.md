# Difference Machine — Blender Addon

Version **0.8.0** for Blender **4.5.0+**.

The addon embeds Forester version control in Blender: init, commits, compare, object tags for merge, file locks, object history, and asset saving.

**Sources:** `sources/addons/blender/difference_machine/`  
**UI:** 3D View → Sidebar (N) → Difference Machine  
**Transport:** native Forester library + JSON bindings (`ForesterOpen` / `ForesterCall`). There is no CLI fallback.

## Install

From a built payload:

1. `./builder/build.sh`
2. Blender → Preferences → Add-ons → Install
3. Select `builder/dist/payload/addons/blender/difference_machine`
4. Enable the addon

Development copy: this folder. The native library and Python bindings must be present under `api/` — see [API_SETUP.md](./API_SETUP.md).

## Panels

| Panel | Role |
|-------|------|
| Save Version | Create Forester commits from the current `.blend` |
| Save as Asset | Save selected objects as linked assets |
| Compare | History, compare commits, restore versions |
| Object History | Changes for the active object |
| File Locks | Acquire / release collaborative locks |
| Mark To | Tag objects MERGE, DELETE, or RENAME |

If the project is not a Forester repository, Save as Asset, Compare, and File Locks show **Init Project**.

## Configuration

The addon reads `~/.dfm/setup.cfg`:

- `[api] path` — native library (or the copy bundled in `api/`)
- `[forester] path` — fallback sibling `lib/`
- `[user] name` — default commit author
- `[blender] path`, `merge_apply_script` — object-level merge

## Docs

| Topic | File |
|-------|------|
| Native library setup | [API_SETUP.md](./API_SETUP.md) |
| JSON API | `sources/backend/forester/api/README.md` |
| Agent architecture | `.cursor/addons/blender/architecture.md` |
| Usage | `doc/usage_guide.md` |
