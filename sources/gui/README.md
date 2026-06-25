# Difference Machine GUI

Wails v2 desktop application for Difference Machine. The backend is Go, the frontend is React/Vite, and repository operations go through Forester's in-process JSON API.

## Requirements

- Go 1.22+
- Node.js 20+
- npm
- Wails v2 CLI on `PATH` for direct `wails dev` / `wails build`

The builder can check or install the Wails CLI through `builder/scripts/lib/wails_toolchain.sh`.

## Development

```bash
export PATH="$PATH:$(go env GOPATH)/bin"
cd sources/gui
wails dev
```

## Build

From the project root:

```bash
./builder/build.sh --gui
# Output: builder/dist/payload/apps/
```

Platform release examples:

```bash
./builder/macos/build.sh --dmg
# builder/dist/DifferenceMachine-<version>-macos.dmg

./builder/windows/build.sh --installer
# builder/dist/DifferenceMachine-<version>-windows-setup.exe
```

Direct build from this folder:

```bash
export PATH="$PATH:$(go env GOPATH)/bin"
wails build
# Output: build/bin/*.app (macOS), build/bin/difference-machine (Linux), build/bin/difference-machine.exe (Windows)
```

## Layout

```
sources/gui/
  main.go, app.go, menu.go     # Wails entry, bindings, native menu
  internal/
    config/                    # ~/.dfm/setup.cfg
    forester/                  # jsonapi session client
    install/                   # bootstrap and addon zip helpers
    paths/                     # CanonicalAbsPath, SamePath
    workdirwatch/              # fsnotify watcher and skip rules
  frontend/src/
    components/shell/          # AppShell, SidebarRail, toasts
    components/sidebar/        # repository selector, branches, history
    components/preview/        # project/history preview and diffs
    components/info/           # file and project metadata
    components/merge/          # merge dialogs
    components/settings/       # settings dialog
    components/ui/             # shared UI primitives
    hooks/                     # workdir preview, panel layout
    lib/                       # helpers and domain utilities
    stores/                    # Zustand state
    wails/                     # typed Wails call wrappers
```

## Architecture

- Backend bridge: `App.ForesterCall(method, argsJSON)` in `app.go`.
- Forester client: `internal/forester` opens a JSON API session through `github.com/difference-machine/forester/pkg/jsonapi`.
- Frontend wrapper: `frontend/src/wails/forester.ts`.
- Global settings: `internal/config` reads and writes `~/.dfm/setup.cfg`.
- Workdir refresh: `internal/workdirwatch` emits `workdir:changed` and ignores `.DFM` / `.dfmignore`.

See `builder/README.md` for release packaging.
