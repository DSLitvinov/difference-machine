# Difference Machine

**Version:** 0.8.

Difference Machine is a local, Git-like version control system for Blender projects. It tracks ordinary files, branches, commits, and merges, and adds Blender-specific object workflows so `.blend` conflicts can be resolved by choosing which objects to keep, delete, rename, or merge.

## Components

- **Forester CLI and core** (`sources/backend/forester`) manages repositories under `.DFM/`, with content-addressed objects, file-based metadata, branches, stash, reflog, locks, manifests, and review data.
- **Difference Machine GUI** (`sources/frontend/dfm-gui`) is a Wails desktop app with a React frontend. It talks to Forester through the in-process JSON API.
- **Blender addon** (`sources/addons/blender/difference_machine`) adds Difference Machine panels in Blender for init, commit, history, compare, asset saving, object tags, locks, and object-level merge.
- **Builder** (`builder`) creates distribution payloads and optional release artifacts for macOS, Linux, and Windows.

## Main Features

- Git-like repository lifecycle: `init`, `status`, `add`, `commit`, `branch`, `switch`, `merge`, `stash`, `log`, `diff`, `reflog`, and recovery commands.
- File-based repository metadata in `.DFM/`; there is no SQLite database layer.
- Object-level Blender workflows with MERGE, DELETE, and RENAME tags stored in manifests.
- JSON API for the GUI, Blender addon, native library consumers, and `forester api`.
- Cross-platform build payload with Forester CLI, native API library, GUI, and Blender addon.

## Repository Layout

```text
difference-machine/
├── sources/
│   ├── backend/forester/              # Go CLI, core, JSON API, native bindings
│   ├── frontend/dfm-gui/              # Wails + React desktop app
│   └── addons/blender/difference_machine/
├── builder/                           # Build, staging, packaging scripts
├── doc/                               # User-facing guides and CLI reference
├── .cursor/                           # Agent-facing project and UI specs
├── License_ENG.md
└── License_RU.md
```

## Requirements

| Component | Requirement |
|-----------|-------------|
| Forester CLI | Go 1.22+ |
| Native API library | Go 1.22+ and a C compiler for cgo |
| GUI | Go 1.22+, Node.js 20+, npm, Wails v2 |
| Blender addon | Blender 4.5.0+ |

Forester uses Go modules. In addition to the standard library, `sources/backend/forester/go.mod` includes `github.com/klauspost/compress`.

## Quick Start

Build the default payload for the current platform:

```bash
./builder/build.sh
```

Build with the GUI:

```bash
./builder/build.sh --gui
```

Initialize a repository and create a first commit:

```bash
forester init /path/to/project
cd /path/to/project
forester add .
forester commit "Initial commit"
```

The global configuration file is `~/.dfm/setup.cfg`. Build scripts can write a development config with `--write-local-config`.

## Documentation

| Topic | File |
|-------|------|
| User workflow | `doc/usage_guide.md` |
| Short CLI reference | `doc/forester_command_short.md` |
| Full CLI reference | `doc/forester_comand.md` |
| Build and release payloads | `builder/README.md` |
| Build script internals | `builder/scripts/README.md` |
| GUI architecture | `.cursor/gui/architecture.md` |
| Forester API | `sources/backend/forester/api/README.md` |
| Blender addon API setup | `sources/addons/blender/difference_machine/API_SETUP.md` |

## Build

The canonical build pipeline lives in `builder/`. Platform entry points are:

```bash
./builder/macos/build.sh --gui --dmg
./builder/linux/build.sh --gui --tar
./builder/windows/build.sh --gui --installer
```

The default payload is `builder/dist/payload` and contains `bin/`, `lib/`, optional `apps/`, `addons/blender/difference_machine/`, `manifest.json`, `setup.cfg.template`, and `VERSION`.

## License

Difference Machine is distributed under the Arcadiy Source License v1.0. See `License_ENG.md` and `License_RU.md`.
