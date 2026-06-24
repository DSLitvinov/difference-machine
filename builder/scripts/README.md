# Build scripts

## Entry points (by platform)

| Platform | Script | Release flags |
|----------|--------|---------------|
| macOS | `../macos/build.sh` | `--dmg` |
| Linux | `../linux/build.sh` | `--tar` |
| Windows | `../windows/build.sh` | `--installer`, `--zip` |

`../build.sh` delegates to the script above for the current OS.

Common flags: `--gui`, `--write-local-config`

Default payload: `builder/dist/payload` (override with `DFM_DIST`).

---

## Shared scripts (`scripts/`)

| Script | Description |
|--------|-------------|
| **build_forester.sh** | Forester CLI + c-shared API → `builder/.staging/forester/` |
| **build_gui.sh** | Wails GUI → staging (`.app` / binary / `.exe`) |
| **stage_dist.sh** | Assemble `DFM_DIST` (default `builder/dist/payload`) |
| **package_blender_addon_zip.sh** | Zip addon for release archives |
| **write_setup_cfg.sh** | Dev `~/.dfm/setup.cfg` |
| **clean_build.sh** | Remove staging artifacts |
| **verify_smoke_prereqs.sh** | Smoke prerequisites §1.1 |
| **copy_addons.sh** | Copy addons into distribution |
| **lib/detect_platform.sh** | OS detection |
| **lib/dfm_dist.sh** | Default `DFM_DIST` resolution |
| **lib/setup_dev_path.sh** | PATH for Go / Homebrew |
| **lib/build_common.sh** | Shared pipeline steps |
| **lib/wails_toolchain.sh** | Wails checks + build |
| **lib/release_install_folder.sh** | Portable folder (Linux/Windows archives) |
| **lib/zip_archive.sh** | Cross-platform zip (`zip`, `tar`, Python, PowerShell) |

## Platform scripts

| Path | Description |
|------|-------------|
| **macos/package_dmg.sh** | DMG installer |
| **macos/wrap_forester_app.sh** | `Forester.app` for DMG |
| **macos/lib/app_bundle.sh** | `.app` bundle helpers |
| **linux/package_tar.sh** | `.tar.gz` release |
| **windows/package_zip.sh** | Portable `.zip` |
| **windows/package_nsis.sh** | NSIS `setup.exe` |
| **windows/installer.nsi** | NSIS template |

---

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `DFM_DIST` | `builder/dist/payload` | Distribution payload directory |
| `VERSION` | `0.8` | Forester version (ldflags) |
| `INSTALL_FOLDER_NAME` | `Difference Machine` | Install folder in releases |
| `INSTALL_WAILS` | `true` | Auto-install Wails CLI |

See `../README.md` for layout and Blender addon setup.
