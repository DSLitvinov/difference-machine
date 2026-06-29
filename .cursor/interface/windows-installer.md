# Windows installer (NSIS)

Release packaging for Forester GUI + CLI + Blender addon on Windows.

**Build:** `./builder/windows/build.sh --installer` → `builder/dist/DifferenceMachine-<version>-windows-setup.exe`  
**Portable zip:** `./builder/windows/build.sh --zip`  
**Builder docs:** [builder/README.md](../../builder/README.md)

---

## 1. Install layout

Default install path (64-bit):

```
C:\Program Files\Difference Machine\
├── difference-machine.exe      GUI (embedded icon from build/windows/icon.ico)
├── bin\forester.exe            Forester CLI (embedded icon via go-winres)
├── bin\forester.ico            Forester icon resource (reference copy)
├── bin\ffmpeg.exe              bundled ffmpeg (BtbN static build)
├── lib\forester.dll            Forester API
├── addons\blender\
│   └── difference_machine.zip
├── README.txt
└── uninst.exe                  Uninstaller (created by NSIS)
```

After first launch of **difference-machine.exe**, the addon zip is extracted to `addons\blender\difference_machine\` for `~/.dfm/setup.cfg` bootstrap (same as macOS DMG).

GUI bootstrap resolves install root as the **parent folder** of `difference-machine.exe` (sibling `bin\`, `lib\`, `addons\`).

`manifest.json` `install_defaults.forester_prefix`: `C:\Program Files\Difference Machine`.

---

## 2. NSIS installer

Built by `builder/windows/package_nsis.sh` using `builder/windows/installer.nsi`.

| Feature | Detail |
|---------|--------|
| Install dir | `$PROGRAMFILES64\Difference Machine` |
| Start menu | Shortcut to GUI + Uninstall |
| Desktop | Shortcut to GUI (`$DESKTOP\Difference Machine.lnk`, icon from exe) |
| Uninstall | Settings → Apps, Start menu, or desktop shortcut removed on uninstall |
| Admin | `RequestExecutionLevel admin` |

**Requires:** [NSIS](https://nsis.sourceforge.io/Download) (`makensis` on PATH, or default install path).

---

## 3. `%USERPROFILE%\.dfm\setup.cfg`

Created on first launch of **difference-machine.exe** (`internal/install/bootstrap.go`):

```ini
[forester]
path = C:\Program Files\Difference Machine\bin\forester.exe
ffmpeg_path = C:\Program Files\Difference Machine\bin\ffmpeg.exe

[api]
path = C:\Program Files\Difference Machine\lib\forester.dll

[addons]
diffmachine_path = C:\Program Files\Difference Machine\addons\blender\difference_machine
```

Paths use native Windows separators after `CanonicalAbsPath`.

Bootstrap re-runs when `[forester] path`, `[api] path`, or `[addons] diffmachine_path` is missing or invalid (`NeedsForesterBootstrap` in `internal/config/store.go`).

---

## 4. App icons

| App | Build output | Where it appears |
|-----|--------------|------------------|
| **GUI** | `sources/gui/build/windows/icon.ico` (from `npm run icons:generate`) | Embedded in `difference-machine.exe`; Start menu + desktop shortcuts |
| **Forester CLI** | `sources/forester/icons/build/forester.ico` (go-winres at build time) | Embedded in `forester.exe`; `bin\forester.ico` copy in payload |

Both use a macOS-style **squircle** background (superellipse n=5, 824px live area on 1024 canvas). Regenerate: GUI — `cd sources/gui/frontend && npm run icons:generate`; Forester — `bash builder/scripts/generate_forester_icons.sh`.

---

## 5. Forester CLI

| Approach | How |
|----------|-----|
| **Direct** | `"C:\Program Files\Difference Machine\bin\forester.exe" status` |
| **PATH (optional)** | Add `...\Difference Machine\bin` to user PATH |

---

## 6. User steps

1. Run **DifferenceMachine-*-windows-setup.exe** and complete the wizard.
2. Launch **Difference Machine** from the Start menu or desktop shortcut once (extracts addon zip, writes `setup.cfg`).
3. Install Blender addon from **`addons\blender\difference_machine.zip`** (Install from Disk in Blender), or symlink after step 2.
4. Open Blender and enable the **Difference Machine** extension.

---

## 7. Code signing

`builder/windows/package_nsis.sh` does **not** Authenticode-sign the installer. For distribution outside your machine, sign `*-windows-setup.exe` before release to reduce SmartScreen warnings.

---

## 8. Build commands

```bash
./builder/windows/build.sh --installer
./builder/windows/build.sh --zip
```
