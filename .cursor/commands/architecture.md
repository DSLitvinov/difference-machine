# Difference Machine - Project Architecture

Agent-facing overview of the current monorepo. **Version:** Forester 0.8 · GUI 0.8.1 · Blender addon 0.8.0.

Public user documentation starts at `README.md`; build details live in `builder/README.md`; repository metadata details live in `.cursor/commands/database.md`.

## Product Components

| Component | Path | Purpose |
|-----------|------|---------|
| Forester CLI/Core | `sources/backend/forester` | Go VCS engine, CLI commands, `.DFM` storage, JSON API, native bindings |
| Difference Machine GUI | `sources/frontend/dfm-gui` | Wails desktop app with Go backend and React frontend |
| Blender addon | `sources/addons/blender/difference_machine` | Blender UI panels, object tags, compare/retrieve, asset and merge workflows |
| Builder | `builder` | Platform build scripts, staging, payload assembly, release packaging |
| User docs | `doc` | Usage guide and CLI references |
| Agent docs | `.cursor` | Architecture, GUI specs, implementation notes, rules |

## Technology Stack

| Layer | Stack |
|-------|-------|
| Forester | Go 1.22+, standard library plus `github.com/klauspost/compress` |
| Native API | Go c-shared library plus C header, optional C compiler for builds |
| GUI backend | Go, Wails v2, `github.com/difference-machine/forester/pkg/jsonapi` |
| GUI frontend | React 18, Vite, TypeScript, Tailwind, Radix UI, Zustand |
| Blender addon | Blender 4.5.0+ built-in Python, `bpy`, ctypes JSON bindings |
| Builder | Bash on Unix-like platforms, Git Bash/MSYS2 on Windows, NSIS for Windows installer |

## Repository Layout

```text
difference-machine/
├── sources/
│   ├── backend/forester/
│   │   ├── cmd/forester/              # CLI entrypoint
│   │   ├── internal/commands/         # CLI command implementations
│   │   ├── internal/core/             # Storage, refs, index, manifests, locks, gc
│   │   ├── internal/jsonapi/          # JSON API dispatch and handlers
│   │   ├── internal/models/           # Commit/tree/blob models
│   │   ├── internal/utils/            # Filesystem, config, diff, patterns
│   │   ├── pkg/jsonapi/               # Public in-process JSON API package for GUI
│   │   └── api/                       # Native C API and Python bindings
│   ├── frontend/dfm-gui/
│   │   ├── internal/                  # Wails backend packages
│   │   └── frontend/src/              # React app
│   └── addons/blender/difference_machine/
│       ├── operators/
│       ├── properties/
│       ├── scripts/
│       ├── ui/
│       └── utils/
├── builder/
│   ├── macos/
│   ├── linux/
│   ├── windows/
│   └── scripts/
├── doc/
└── .cursor/
```

## Runtime Data Model

Forester repositories are identified by a `.DFM/` directory in the project root. Metadata is plain files, not SQLite. The canonical storage map is `.cursor/commands/database.md`.

High-level categories:

- Content-addressed objects: `.DFM/objects/`
- Refs and current branch: `.DFM/refs/`, `.DFM/HEAD`
- Staging index: `.DFM/index`
- Blender object metadata: `.DFM/manifests/`
- Reviews and approvals: `.DFM/reviews/`
- Locks, stash, hooks, reflog, merge state: `.DFM/locks/`, `.DFM/stash/`, `.DFM/hooks/`, `.DFM/logs/`, `.DFM/MERGE_HEAD`

## Integration Flow

```text
GUI React UI
  -> Wails Go backend (sources/frontend/dfm-gui)
  -> sources/backend/forester/pkg/jsonapi
  -> sources/backend/forester/internal/jsonapi
  -> Forester core and .DFM

Blender addon
  -> api/python/python_bindings_json.py
  -> native Forester library
  -> Forester JSON API
  -> Forester core and .DFM

CLI
  -> sources/backend/forester/internal/commands
  -> Forester core and .DFM
```

## Build And Distribution

Canonical build entry points are platform scripts under `builder/`:

```bash
./builder/build.sh
./builder/macos/build.sh --gui --dmg
./builder/linux/build.sh --gui --tar
./builder/windows/build.sh --gui --installer
```

The default payload is `builder/dist/payload`:

```text
payload/
├── bin/                 # Forester CLI + bundled ffmpeg
├── lib/                 # Native API library
├── apps/                # GUI when built with --gui
├── share/icons/         # Forester hicolor icons (Linux)
├── addons/blender/difference_machine/
├── manifest.json
├── setup.cfg.template
└── VERSION
```

Build scripts do not install into system paths and do not write `~/.dfm/setup.cfg` unless `--write-local-config` is passed.

## Configuration

Global files live in `~/.dfm/`. They can be written by the GUI or by `./builder/build.sh --write-local-config` (`setup.cfg` only).

`setup.cfg`:

- `[forester] path`, `ffmpeg_path`
- `[api] path`
- `[addons] diffmachine_path`
- `[blender] path`, `merge_apply_script`
- `[user] name`, `email`
- `[ui] theme`, `language`

`repos.cfg`:

- `[current repo] path`
- `[repo] path_N`

Repository-local configuration is `.DFM/config` and is created by `forester init`.

## Important References

- `.cursor/commands/database.md`: canonical `.DFM` storage layout.
- `.cursor/commands/business-rules.md`: VCS semantics and invariants.
- `.cursor/commands/forester-arhitecture.md`: detailed Forester core and CLI notes.
- `.cursor/gui/architecture.md`: GUI architecture (Wails + Forester). Workdir folder grid: default **48×48** icons (`gridTrack` 106), not Size=Max.
- `.cursor/gui/panels/content-view.md`: Content View grid pixels, zoom, virtualizer columns.
- `.cursor/gui/gui_backend/jsonapi.md`: GUI/JSON API contract.
- `builder/README.md`: canonical build and release documentation.
