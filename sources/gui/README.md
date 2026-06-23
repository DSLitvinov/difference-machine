# Difference Machine GUI

Wails v2 desktop app for Forester.

## Development

```bash
export PATH="$PATH:$(go env GOPATH)/bin"
cd sources/gui
wails dev
```

## Build

```bash
wails build
# Output: build/bin/difference-machine-gui.app (macOS)
```

## Layout

```
sources/gui/
  main.go, app.go          # Wails entry + bindings
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
