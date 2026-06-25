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
├── bin/                 Forester CLI
├── lib/                 Native API
├── apps/                GUI (optional --gui)
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

| Component | Requirement |
|-----------|-------------|
| Forester CLI | Go 1.22+ |
| Native API | Go 1.22+ and a C compiler for cgo |
| GUI (`--gui`) | Go 1.22+, Node.js 20+, npm, Wails v2 CLI |
| Blender addon | Blender 4.5.0+ for runtime use |
| macOS DMG | `hdiutil` (macOS system tool) |
| Windows installer | NSIS `makensis` |

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
