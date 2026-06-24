# Difference Machine GUI

Wails v2 desktop app for Forester.

## Development

```bash
export PATH="$PATH:$(go env GOPATH)/bin"
cd sources/gui
wails dev
```

## Build

From the project root (recommended):

```bash
./builder/macos/build.sh --gui
# Output: builder/dist/payload/apps/

./builder/macos/build.sh --dmg
# builder/dist/DifferenceMachine-<version>-macos.dmg

./builder/windows/build.sh --installer
# builder/dist/DifferenceMachine-<version>-windows-setup.exe
```

Native menu spec: [.cursor/interface/application-menu.md](../../.cursor/interface/application-menu.md)

Or directly in this folder (ensure Wails is on PATH):

```bash
export PATH="$PATH:$(go env GOPATH)/bin"
wails build
# Output: build/bin/*.app (macOS), build/bin/difference-machine (Linux), build/bin/difference-machine.exe (Windows)
```

## Layout

```
sources/gui/
  main.go, app.go, menu.go     # Wails entry + bindings + native menu
  internal/
    config/                # ~/.dfm/setup.cfg
    paths/                 # CanonicalAbsPath, SamePath
    forester/              # jsonapi session client
  frontend/src/
    components/shell/      # AppShell, SidebarRail
    components/sidebar/    # Project panel, empty state
    stores/                # zustand app state
```

Forester JSON API: `github.com/difference-machine/forester/pkg/jsonapi`

Release: [macos-installer.md](../../.cursor/interface/macos-installer.md) · [windows-installer.md](../../.cursor/interface/windows-installer.md)
