# Build scripts

Run the full build from the project root:

```bash
./builder/build.sh
```

Native build only (current OS). Cross-compilation is not supported.

## Build dependencies

### Common (all platforms)

Required for `./builder/build.sh` (Forester CLI, c-shared API, Blender addon staging):

| Dependency | Version | Notes |
|------------|---------|-------|
| **Go** | 1.22+ | `sources/forester/go.mod` |
| **C compiler** | gcc or clang | Forester API (`-buildmode=c-shared`); CLI still builds if missing |
| **bash** | 4+ | Build scripts |
| **git** | — | Optional; embeds commit hash in binaries |

### macOS

**Forester payload** (`./builder/build.sh`):

| Dependency | Version | Install |
|------------|---------|---------|
| **Go** | 1.22+; **1.23.3+** on macOS 15+ | `brew install go` or [go.dev/dl](https://go.dev/dl/) |
| **Xcode Command Line Tools** | — | `xcode-select --install` (clang, SDK) |

**GUI** (`--gui` / `--dmg` / `--tar` / `--zip` — `build_gui.sh`):

| Dependency | Version | Install |
|------------|---------|---------|
| **Node.js** | 20+ LTS (22 OK) | `brew install node` |
| **npm** | ships with Node | — |
| **Wails v2 CLI** | latest | `go install github.com/wailsapp/wails/v2/cmd/wails@latest` (auto when `INSTALL_WAILS=true`) |

**DMG** (`--dmg` — `package_macos_dmg.sh`):

| Dependency | Notes |
|------------|-------|
| **hdiutil** | Built into macOS |
| **zip** | Addon archive for DMG (`package_blender_addon_zip.sh`) |

Verify GUI toolchain: `wails doctor` → SUCCESS.

`PATH` is extended with `$(go env GOPATH)/bin` and Homebrew bins (`setup_dev_path.sh`).

```bash
brew install go node
xcode-select --install
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

### Linux

**Forester payload** (`./builder/build.sh`):

| Dependency | Version | Install (Debian/Ubuntu) |
|------------|---------|------------------------|
| **Go** | 1.22+ | `sudo apt install golang-go` or [go.dev/dl](https://go.dev/dl/) |
| **gcc** | — | `sudo apt install build-essential` |

**GUI** (`--gui` / `--tar` / `--release` — `build_gui.sh`):

| Dependency | Version | Install (Debian/Ubuntu) |
|------------|---------|------------------------|
| **Node.js** | 20+ LTS | `nodejs` + `npm` from distro or [nodejs.org](https://nodejs.org/) |
| **Wails v2 CLI** | latest | `go install github.com/wailsapp/wails/v2/cmd/wails@latest` |
| **libgtk-3-dev** | — | GTK 3 headers |
| **libwebkit2gtk** | 4.0 or **4.1** | `libwebkit2gtk-4.0-dev` or `libwebkit2gtk-4.1-dev` (Ubuntu 24.04+) |
| **pkg-config** | — | `pkg-config` |

On distros with WebKit **4.1 only** (e.g. Ubuntu 24.04): `build_gui.sh` passes `-tags webkit2_41` automatically.

Fedora/RHEL family: `golang`, `gcc-c++`, `gtk3-devel`, `webkit2gtk4.1-devel`, `pkg-config`.

```bash
sudo apt install build-essential golang-go nodejs npm \
  libgtk-3-dev libwebkit2gtk-4.1-dev pkg-config
go install github.com/wailsapp/wails/v2/cmd/wails@latest
wails doctor
```

### Windows

**Forester payload** (`./builder/build.sh` via Git Bash / MSYS2):

| Dependency | Version | Install |
|------------|---------|---------|
| **Go** | 1.22+ | [go.dev/dl](https://go.dev/dl/) |
| **MinGW-w64 gcc** or **MSVC** | — | MSYS2: `pacman -S mingw-w64-x86_64-gcc`; or Visual Studio Build Tools (C++) |

**GUI** (`--gui` / `--zip` / `--release` — `build_gui.sh`):

| Dependency | Version | Install |
|------------|---------|---------|
| **Node.js** | 20+ LTS | [nodejs.org](https://nodejs.org/) |
| **npm** | ships with Node | — |
| **Wails v2 CLI** | latest | `go install github.com/wailsapp/wails/v2/cmd/wails@latest` |
| **WebView2** | — | Runtime usually pre-installed on Windows 10/11; `wails doctor` checks it |
| **MinGW-w64** or **MSVC** | — | Same C toolchain as Forester API build |

Optional for installers: **NSIS** (`wails doctor` lists if missing). Release archive requires **zip** (MSYS2).

```powershell
# Go + Node from official installers; then:
go install github.com/wailsapp/wails/v2/cmd/wails@latest
wails doctor
```

Run `./builder/build.sh` from **Git Bash** or **MSYS2** (bash scripts). Add `$(go env GOPATH)\bin` to `PATH`.

## Scripts

| Script | Description |
|--------|-------------|
| **build_forester.sh** | Build Forester CLI and c-shared API into `builder/.staging/forester/` |
| **build_gui.sh** | Build Wails GUI → staging (macOS `.app`, Linux binary, Windows `.exe`) |
| **wrap_forester_app.sh** | Wrap CLI + API into `Forester.app` (macOS DMG) |
| **package_blender_addon_zip.sh** | Zip addon folder for release archives (`difference_machine/` inside archive) |
| **verify_smoke_prereqs.sh** | Check smoke prerequisites §1.1 (toolchain, repo, window mins) |
| **package_macos_dmg.sh** | Assemble macOS DMG (`--dmg` / `--release` on macOS) |
| **package_linux_tar.sh** | Assemble Linux `.tar.gz` (`--tar` / `--release` on Linux) |
| **package_windows_zip.sh** | Assemble Windows `.zip` (`--zip` / `--release` on Windows) |
| **stage_dist.sh** | Assemble payload into `DFM_DIST` (default `~/dfm_distr`) |
| **copy_addons.sh** | Copy `sources/addons/` → `[TARGET]/addons/`. Default target: `~/dfm_distr` |
| **write_setup_cfg.sh** | Write `~/.dfm/setup.cfg` pointing at `DFM_DIST` (optional) |
| **clean_build.sh** | Remove staging and repo build artifacts |
| **lib/detect_platform.sh** | Shared platform detection (sourced by other scripts) |
| **lib/wails_toolchain.sh** | Wails CLI install, toolchain checks, `wails build` |
| **lib/release_install_folder.sh** | Portable install folder for Linux/Windows archives |

## Pipeline

```
build.sh [--gui] [--dmg|--tar|--zip|--release] [--write-local-config]
  ├── build_forester.sh      → builder/.staging/forester/
  ├── build_gui.sh           → builder/.staging/gui/  (optional)
  ├── stage_dist.sh          → ~/dfm_distr (or DFM_DIST)
  ├── write_setup_cfg.sh     → optional (--write-local-config)
  ├── package_macos_dmg.sh   → builder/dist/*.dmg  (--dmg / --release on macOS)
  ├── package_linux_tar.sh   → builder/dist/*.tar.gz  (--tar / --release on Linux)
  ├── package_windows_zip.sh → builder/dist/*.zip  (--zip / --release on Windows)
  └── clean_build.sh
```

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `DFM_DIST` | `$HOME/dfm_distr` | Output directory for the distribution payload |
| `VERSION` | `0.7.5` | Forester version passed to Go ldflags |
| `INSTALL_FOLDER_NAME` | `Difference Machine` | Install folder inside DMG |
| `INSTALL_WAILS` | `true` | Auto `go install` Wails CLI when missing (`build_gui.sh`) |

## Notes

- API is copied into `addons/blender/difference_machine/api/` during staging.
- See `builder/README.md` for layout and manual Blender setup.
