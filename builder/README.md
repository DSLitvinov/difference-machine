# Difference Machine — Build

Platform-specific entry points under `builder/{macos,linux,windows}/`. Shared steps live in `builder/scripts/`.

---

## Quick start

| Platform | Entry | Release |
|----------|-------|---------|
| **macOS** | `./builder/macos/build.sh` | `--dmg` |
| **Linux** | `./builder/linux/build.sh` | `--tar` |
| **Windows** | `./builder/windows/build.sh` | `--installer` or `--zip` |

Convenience wrapper (detects current OS):

```bash
./builder/build.sh
```

Output (default payload): `builder/dist/payload`

### macOS

```bash
./builder/macos/build.sh              # Forester + addon
./builder/macos/build.sh --gui        # + Wails GUI
./builder/macos/build.sh --dmg        # + DifferenceMachine-*-macos.dmg
./builder/macos/build.sh --gui --write-local-config
```

### Linux

```bash
./builder/linux/build.sh
./builder/linux/build.sh --gui
./builder/linux/build.sh --tar        # + DifferenceMachine-*-linux.tar.gz
```

After extracting the release archive:

```bash
tar -xzf builder/dist/DifferenceMachine-*-linux.tar.gz
cd Difference-Machine
sudo ./install.sh                     # → /opt/Difference-Machine/
```

`install.sh` copies the payload to `/opt`, writes Forester/API paths in `~/.dfm/setup.cfg`, and creates `/usr/local/bin` symlinks, a **applications menu** `.desktop` entry, and Forester hicolor icons. Install the Blender addon from `addons/blender/difference_machine.zip` in Blender. Use `./install.sh --user` for a home-directory install without sudo.

See [.cursor/interface/linux-installer.md](../.cursor/interface/linux-installer.md) for install layout and icon paths.

### Windows (Git Bash / MSYS2)

```bash
./builder/windows/build.sh
./builder/windows/build.sh --gui
./builder/windows/build.sh --installer   # NSIS setup.exe (requires makensis)
./builder/windows/build.sh --zip           # portable zip
```

---

## Layout

```
builder/
├── build.sh                 # thin delegate → macos|linux|windows/build.sh
├── scripts/                 # shared: forester, gui, stage, clean, libs
├── dist/
│   ├── payload/             # default build output (bin, lib, apps, addons)
│   └── DifferenceMachine-*  # release installers / archives
├── macos/
├── linux/
└── windows/
```

### Distribution payload (`builder/dist/payload`)

```
payload/
├── bin/                 Forester CLI + bundled ffmpeg (+ forester.ico on Windows)
├── lib/                 Native API
├── apps/                GUI (optional --gui)
├── share/icons/         Forester hicolor icons (Linux)
├── addons/blender/difference_machine/
├── manifest.json
├── setup.cfg.template
└── VERSION
```

Override path: `DFM_DIST=/custom/path ./builder/macos/build.sh`

### Release artifacts (`builder/dist/`)

- macOS: `DifferenceMachine-<version>-macos.dmg`
- Linux: `DifferenceMachine-<version>-linux.tar.gz`
- Windows: `DifferenceMachine-<version>-windows-setup.exe`
- Windows portable: `DifferenceMachine-<version>-windows.zip`

---

## Shared pipeline

Each `*/build.sh` runs:

1. `scripts/build_forester.sh`
2. `scripts/build_gui.sh` (optional)
3. `scripts/stage_dist.sh`
4. `scripts/write_setup_cfg.sh` (optional `--write-local-config`)
5. Platform package script (optional)
6. `scripts/clean_build.sh`

---

## Requirements

Build targets are layered: **base** (Forester CLI + addon staging), **GUI** (`--gui`), and **release** (`--dmg` / `--tar` / `--installer` / `--zip`). Install only what matches the command you run.

### All platforms (base build)

| Tool | Used for |
|------|----------|
| **Go 1.22+** | Forester CLI, native API (`c-shared`), Wails backend |
| **C compiler** | Native API library (`libforester`); optional for CLI-only if API build is skipped |
| **git** | Version metadata in binaries (optional; falls back to `unknown`) |
| **curl** or **wget** | Download bundled `ffmpeg` into `bin/` (Windows/Linux; auto-fetched during build) |
| **unzip** (Windows ffmpeg) | Extract ffmpeg zip archives |
| **tar** + **xz** (Linux ffmpeg) | Extract ffmpeg `.tar.xz` archives |
| **ffmpeg** (macOS only) | Stage from Homebrew or `DFM_FFMPEG_PATH` — BtbN has no macOS builds |

Runtime (not a build dependency): **Blender 4.5.0+** to use the staged addon.

### GUI (`--gui`)

Adds a Wails v2 desktop app (`sources/gui`). Checked by `scripts/lib/wails_toolchain.sh`.

| Tool | Used for |
|------|----------|
| **Node.js 20+** | Frontend build (React/Vite) + icon generation (`npm run icons:generate`) |
| **npm** | Frontend dependencies |
| **Wails v2 CLI** | `wails build` (auto-installed via `go install` when `INSTALL_WAILS=true`, default) |

Ensure `$(go env GOPATH)/bin` is on `PATH` so `wails` is found after install.

Platform-specific GUI dependencies come from **Wails on Linux** (GTK + WebKitGTK), not from Forester or the Blender addon.

### macOS

| Target | Packages / tools |
|--------|------------------|
| **Base** | Go 1.22+ (`brew install go`), Xcode **Command Line Tools** (`xcode-select --install`) for the C compiler |
| **GUI** | Above + Node.js 20+ (`brew install node`), Wails CLI |
| **Release (`--dmg`)** | `hdiutil` (built into macOS) |

```bash
# Typical dev setup
xcode-select --install
brew install go node ffmpeg   # ffmpeg required for release build + image previews
```

### Linux

| Target | Packages / tools |
|--------|------------------|
| **Base** | Go 1.22+, `gcc` (or `clang`) for the native API |
| **GUI** | Above + `pkg-config`, **GTK 3** dev headers, **WebKitGTK** dev headers, Node.js 20+, Wails CLI |

Wails links against `gtk+-3.0` and `webkit2gtk-4.0` or `webkit2gtk-4.1` (4.1 uses Wails build tag `webkit2_41`).

**Debian / Ubuntu**

```bash
sudo apt install golang-go build-essential pkg-config \
  libgtk-3-dev libwebkit2gtk-4.1-dev
# Older distros without 4.1: libwebkit2gtk-4.0-dev
```

**Fedora**

```bash
sudo dnf install golang gcc pkg-config gtk3-devel webkit2gtk4.1-devel
# Older distros: webkit2gtk4.0-devel
```

**Arch**

```bash
sudo pacman -S go gcc pkg-config gtk3 webkit2gtk-4.1
```

| Target | Packages / tools |
|--------|------------------|
| **Release (`--tar`)** | `tar`, `gzip` (usually preinstalled) |

### Windows (Git Bash / MSYS2)

| Target | Packages / tools |
|--------|------------------|
| **Base** | Go 1.22+ from [go.dev/dl](https://go.dev/dl/), network access for ffmpeg download |
| **GUI** | Above + Node.js 20+ LTS, Wails CLI; **MinGW-w64** (`gcc`) or MSVC (run `wails doctor` if unsure) |
| **Release (`--zip`)** | No extra tools |
| **Release (`--installer`)** | NSIS — `makensis` on `PATH` or default install under `C:\Program Files (x86)\NSIS\` |

```bash
# After installing Go and Node.js
go install github.com/wailsapp/wails/v2/cmd/wails@latest
wails doctor
```

### Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `INSTALL_WAILS` | `true` | Auto-install Wails CLI when missing |
| `FFMPEG_SKIP` | `false` | Skip downloading bundled ffmpeg |
| `FFMPEG_FORCE` | `false` | Re-download ffmpeg even if cached |
| `DFM_FFMPEG_PATH` | — | macOS: explicit ffmpeg binary to stage into payload |
| `DFM_DIST` | `builder/dist/payload` | Override staging output path |

**ffmpeg cache:** `builder/.cache/ffmpeg/` — archives + extracted binary (Windows/Linux); preserved across `clean_build.sh`. Reused from `dist/payload/bin/` when staging is empty. **macOS:** no BtbN download — copies from Homebrew (`brew install ffmpeg`) or `DFM_FFMPEG_PATH`.

### App icons

| App | Regenerate | Output |
|-----|------------|--------|
| GUI | `cd sources/gui/frontend && npm run icons:generate` | `sources/gui/build/appicon.png`, `build/windows/icon.ico` |
| Forester | `bash builder/scripts/generate_forester_icons.sh` | `sources/icons/logo/forester/build/` (PNG, `.ico`, `.icns`, Linux hicolor) |

Both use squircle masking via `builder/scripts/lib/icon-squircle.mjs`. GUI icons run automatically in `build_gui.sh`; Forester icons run in `build_forester.sh`.

See [scripts/README.md](scripts/README.md) for script-level details.

---

## CI

```bash
./builder/macos/build.sh --dmg
./builder/linux/build.sh --tar
./builder/windows/build.sh --installer
```

---

## Code signing

DMG and NSIS scripts do not sign binaries. Add Developer ID (macOS) or Authenticode (Windows) before public release.
