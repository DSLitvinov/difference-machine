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

## Toolchain

| Target | Required tools |
|--------|----------------|
| Forester CLI | Go 1.22+ |
| Native API | Go 1.22+, C compiler for cgo |
| Image previews | Bundled `bin/ffmpeg` (BtbN on Windows/Linux; Homebrew/`DFM_FFMPEG_PATH` on macOS) |
| App icons | Node.js (`npm run icons:generate`, `generate_forester_icons.sh`) |
| GUI (`--gui`) | Go 1.22+, Node.js 20+, npm, Wails v2 CLI |
| macOS DMG | macOS `hdiutil` |
| Windows installer | NSIS `makensis` |

---

## Shared scripts (`scripts/`)

| Script | Description |
|--------|-------------|
| **build_forester.sh** | Forester CLI + c-shared API + bundled ffmpeg + icons → `builder/.staging/forester/` |
| **fetch_ffmpeg.sh** | Download ffmpeg static build (Windows/Linux); stage from PATH on macOS |
| **fetch_ffmpeg.ps1** | Download ffmpeg static build (Windows PowerShell) |
| **lib/ffmpeg_cache.sh** | Reuse ffmpeg from `builder/.cache/ffmpeg/` or last `dist/payload` |
| **generate_forester_icons.sh** | Forester PNG / `.ico` / `.icns` / Linux hicolor from `sources/icons/logo/forester/` |
| **generate_forester_icons.mjs** | Icon rasterization (uses `lib/icon-squircle.mjs`) |
| **lib/icon-squircle.mjs** | Shared squircle clip path for GUI + Forester icons |
| **build_gui.sh** | Wails GUI → staging (runs `npm run icons:generate` first) |
| **stage_dist.sh** | Assemble `DFM_DIST` (default `builder/dist/payload`) |
| **package_blender_addon_zip.sh** | Zip addon for release archives |
| **write_setup_cfg.sh** | Dev `~/.dfm/setup.cfg` |
| **clean_build.sh** | Remove staging artifacts |
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
| **linux/package_tar.sh** | `.tar.gz` release (includes `install.sh`) |
| **linux/install.sh** | Post-install: `/opt/Difference-Machine/`, `.desktop`, hicolor icons, `setup.cfg`, `restorecon` |
| **windows/package_zip.sh** | Portable `.zip` |
| **windows/package_nsis.sh** | NSIS `setup.exe` |
| **windows/installer.nsi** | NSIS template |

---

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `DFM_DIST` | `builder/dist/payload` | Distribution payload directory |
| `VERSION` | `0.8` | Forester version (ldflags) |
| `INSTALL_FOLDER_NAME` | platform-specific (`Difference-Machine` on Linux; `Difference Machine` on macOS/Windows) | Top-level folder inside release archives |
| `INSTALL_WAILS` | `true` | Auto-install Wails CLI |
| `FFMPEG_SKIP` | `false` | Skip downloading bundled ffmpeg |
| `FFMPEG_FORCE` | `false` | Re-download ffmpeg even if already cached |
| `DFM_FFMPEG_PATH` | — | macOS: explicit ffmpeg binary to copy into staging |

**ffmpeg cache:** `builder/.cache/ffmpeg/` stores downloaded archives and the extracted binary (Windows/Linux). `clean_build.sh` does not remove it. On the next build, `fetch_ffmpeg` reuses the cache or copies from `builder/dist/payload/bin/` before downloading again. **macOS:** BtbN has no macOS builds — `fetch_ffmpeg.sh` copies from `PATH` (Homebrew) or `DFM_FFMPEG_PATH`; fails with `brew install ffmpeg` hint if missing.

See `../README.md` for layout and Blender addon setup.
