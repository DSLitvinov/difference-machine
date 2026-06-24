# Build scripts

Run the full build from the project root:

```bash
./builder/build.sh
```

## Scripts

| Script | Description |
|--------|-------------|
| **build_forester.sh** | Build Forester CLI and c-shared API into `builder/.staging/forester/` |
| **build_gui.sh** | Build Wails GUI into `builder/.staging/gui/` (macOS, used with `--gui`) |
| **stage_dist.sh** | Assemble payload into `DFM_DIST` (default `~/dfm_distr`) |
| **copy_addons.sh** | Copy `sources/addons/` → `[TARGET]/addons/`. Default target: `~/dfm_distr` |
| **write_setup_cfg.sh** | Write `~/.dfm/setup.cfg` pointing at `DFM_DIST` (optional) |
| **clean_build.sh** | Remove staging and repo build artifacts |
| **lib/detect_platform.sh** | Shared platform detection (sourced by other scripts) |

## Pipeline

```
build.sh [--gui] [--write-local-config]
  ├── build_forester.sh   → builder/.staging/forester/
  ├── build_gui.sh        → builder/.staging/gui/  (optional, macOS)
  ├── stage_dist.sh       → ~/dfm_distr (or DFM_DIST)
  ├── write_setup_cfg.sh  → optional (--write-local-config)
  └── clean_build.sh
```

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `DFM_DIST` | `$HOME/dfm_distr` | Output directory for the distribution payload |
| `VERSION` | `0.7.5` | Forester version passed to Go ldflags |
| `BUILD_GUI` | `false` | Set by `build.sh --gui`; stages GUI into `apps/` |
| `INSTALL_WAILS` | `true` | Auto `go install` Wails CLI when missing (`build_gui.sh`) |

## Notes

- Native build only (current OS).
- API is copied into `addons/blender/difference_machine/api/` during staging.
- See `builder/README.md` for layout and manual Blender setup.
