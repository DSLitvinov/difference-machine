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
./builder/build.sh --gui
# Output: ~/dfm_distr/apps/*.app
```

Native menu spec: [.cursor/interface/application-menu.md](../../.cursor/interface/application-menu.md)

Or directly in this folder (ensure Wails is on PATH):

```bash
export PATH="$PATH:$(go env GOPATH)/bin"
wails build
# Output: build/bin/*.app (macOS)
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

Implementation checklist: [.cursor/interface/implementation-plan.md](../../.cursor/interface/implementation-plan.md)
