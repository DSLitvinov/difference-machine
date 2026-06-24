# Difference Machine — Build

Scripts build Forester CLI, native API, Blender addon, optional Wails GUI, and platform **release archives** (macOS `.dmg`, Linux `.tar.gz`, Windows `.zip`).

---

## Quick start

From the project root:

```bash
./builder/build.sh
```

Output (default): `~/dfm_distr`

### macOS release DMG

```bash
./builder/build.sh --dmg
# or platform-neutral:
./builder/build.sh --release
```

Produces:

- `~/dfm_distr` — dev payload (bin, lib, apps, addons)
- `builder/dist/DifferenceMachine-<version>-macos.dmg`

### Linux release tar.gz

```bash
./builder/build.sh --tar
# or: ./builder/build.sh --release
```

Produces:

- `~/dfm_distr`
- `builder/dist/DifferenceMachine-<version>-linux.tar.gz`

### Windows release zip

```bash
./builder/build.sh --zip
# or: ./builder/build.sh --release
```

Produces:

- `~/dfm_distr`
- `builder/dist/DifferenceMachine-<version>-windows.zip`

### macOS DMG layout

```
README.txt
Applications →
Difference Machine/
  Difference Machine.app
  Forester.app
  addons/blender/difference_machine.zip
```

Install path: `/Applications/Difference Machine/` — GUI finds Forester as a sibling app in the same folder.

First launch of **Difference Machine.app** writes `~/.dfm/setup.cfg` ([macos-installer.md](../.cursor/interface/macos-installer.md)).

### Development

```bash
./builder/build.sh --gui --write-local-config
```

- `--gui` — Wails GUI → `dfm_distr/apps/Difference Machine.app`
- `--write-local-config` — `~/.dfm/setup.cfg` → `~/dfm_distr` paths

Override output:

```bash
DFM_DIST=/tmp/dfm_test ./builder/build.sh --dmg
```

---

## Distribution layout (`dfm_distr`)

```
dfm_distr/
├── bin/                 Forester CLI
├── lib/                 Native API (libforester.so / .dylib / forester.dll)
├── apps/                GUI (macOS .app, Linux binary, Windows .exe with --gui)
├── addons/
│   └── blender/
│       └── difference_machine/
│           └── api/     Native lib + python/ bindings (filled by build)
├── manifest.json
├── setup.cfg.template
├── VERSION
└── README.txt
```

Build runs **only for the current OS**. Cross-compilation is not supported.

---

## Pipeline

| Step | Script | Notes |
|------|--------|-------|
| 1 | `scripts/build_forester.sh` | CLI + c-shared API → staging |
| 2 | `scripts/build_gui.sh` | Optional; Wails GUI → staging |
| 3 | `scripts/stage_dist.sh` | Assemble `DFM_DIST` |
| 3b | `scripts/write_setup_cfg.sh` | Optional dev `~/.dfm/setup.cfg` |
| 3c | `scripts/package_macos_dmg.sh` | `--dmg` / `--release` (macOS) |
| 3d | `scripts/package_linux_tar.sh` | `--tar` / `--release` (Linux) |
| 3e | `scripts/package_windows_zip.sh` | `--zip` / `--release` (Windows) |
| 4 | `scripts/clean_build.sh` | Remove staging (keeps `dfm_distr` and `builder/dist/*`) |

---

## Manual addon setup (development)

**macOS** (after `~/dfm_distr` build):

```bash
ln -sf ~/dfm_distr/addons/blender/difference_machine \
  ~/Library/Application\ Support/Blender/4.2/extensions/user_default/difference_machine
```

**After DMG install** (symlink after first GUI launch, or install zip in Blender):

```bash
ln -sf "/Applications/Difference Machine/addons/blender/difference_machine" \
  ~/Library/Application\ Support/Blender/4.5/extensions/user_default/difference_machine
```

---

## Requirements

- **Go 1.22+**
- **C compiler** (Forester API library)
- **GUI:** Node.js 20+, Wails v2 CLI
- **macOS GUI / DMG:** Xcode Command Line Tools
- **Linux GUI / tar:** `build-essential`, `libgtk-3-dev`, WebKitGTK 4.0 or 4.1 dev, `pkg-config`
- **Windows GUI / zip:** WebView2, MinGW-w64 or MSVC, `zip` (MSYS2)

---

## Folder reference

| Path | Description |
|------|-------------|
| `build.sh` | Main entry (`--gui`, `--dmg`, `--tar`, `--zip`, `--release`, `--write-local-config`) |
| `scripts/package_macos_dmg.sh` | macOS install folder + `hdiutil` DMG |
| `scripts/package_linux_tar.sh` | Linux portable folder + `.tar.gz` |
| `scripts/package_windows_zip.sh` | Windows portable folder + `.zip` |
| `scripts/wrap_forester_app.sh` | `Forester.app` from `bin/forester` + API dylib |
| `scripts/lib/macos_app_bundle.sh` | Minimal `.app` bundle helper |
| `scripts/build_forester.sh` | CLI + API |
| `scripts/build_gui.sh` | Wails GUI |
| `scripts/stage_dist.sh` | `dfm_distr` |
| `scripts/write_setup_cfg.sh` | Dev `setup.cfg` |

---

## Code signing

`package_macos_dmg.sh` does **not** sign or notarize. For distribution outside your machine, add Developer ID signing and notarization before release.

---

## CI

macOS:

```bash
DFM_DIST="${PWD}/builder/dist/dfm_distr" ./builder/build.sh --dmg
```

Linux:

```bash
DFM_DIST="${PWD}/builder/dist/dfm_distr" ./builder/build.sh --tar
```

Windows (Git Bash / MSYS2):

```bash
DFM_DIST="${PWD}/builder/dist/dfm_distr" ./builder/build.sh --zip
```

Artifacts: `builder/dist/DifferenceMachine-*-{macos,linux,windows}.*`
