# Difference Machine Installer

This folder contains scripts to install Forester (CLI and API) and the Blender addon, and to build a distributable installer package.

---

## For end users: how to install

You need a ready-made installer package (e.g. from an ISO or from the `DFM_Installer` folder). Then run the appropriate script from that package.

### Linux and macOS

From the installer directory:

```bash
./install.sh
```

The script will:

1. Detect OS and architecture (linux/macos, x64/arm64).
2. Look for the Forester binary in `<linux|osx>/forester/bin/forester` (and optionally the API library in `<linux|osx>/forester/lib/`). On macOS the folder is `osx/`.
3. Ask for an installation path (default: `/opt/DiffMachine` on Linux, `/Applications/DiffMachine` on macOS). For system paths you may need `sudo`.
4. Copy the binary (and API library if present) into `<path>/bin` and `<path>/lib`.
5. Install the **Difference Machine GUI**: if a PyInstaller build exists in `<linux|osx>/diffmachine_gui/`, copy it and create a launcher `<path>/bin/dfm-gui`. Otherwise, if sources are present, copy them, create a virtualenv in `<path>/gui-venv`, install dependencies from `requirements.txt`, and create the launcher. On Linux a `.desktop` shortcut is added to `~/.local/share/applications`; on macOS a `.command` launcher is added to `~/Applications` or `~/Desktop`.
6. Optionally install the Blender addon: it searches for Blender in `~/.config/blender` (Linux) or `~/Library/Application Support/Blender` (macOS), and can install for all versions or a specific one.
7. Create `~/.dfm/setup.cfg` with `[forester] path=...`, and, if available, `[api]`, `[python_bindings]`, and `[difference machine gui]`.

After installation, add the binary to your PATH or create a symlink, for example:

```bash
export PATH="/opt/DiffMachine/bin:$PATH"
# or
sudo ln -s /opt/DiffMachine/bin/forester /usr/local/bin/forester
```

### Windows

From the installer directory, run:

```cmd
install.bat
```

Or double‑click `install.bat`. The script will:

1. Use the binary from `windows\forester\bin\forester.exe` (and optionally `windows\forester\lib\forester.dll`).
2. Ask for an installation path (default: `C:\Program Files\DiffMachine`). Administrator rights may be required for that path.
3. Copy the binary (and DLL if present) into `<path>\bin`.
4. Install the **Difference Machine GUI**: if a PyInstaller build exists in `windows\diffmachine_gui\`, copy it and create `<path>\bin\dfm-gui.cmd`. Otherwise, copy sources, create a virtualenv in `<path>\gui-venv`, install dependencies, and create the launcher. Shortcuts are created in the Start Menu and on the Desktop.
5. Optionally install the Blender addon: it looks in `%APPDATA%\Blender Foundation\Blender` and can install for all versions or a chosen one.
6. Create `%USERPROFILE%\.dfm\setup.cfg` with `[forester] path=...`, `[api]` if the DLL was installed, and `[difference machine gui]`.

To use Forester from any folder, add the install `bin` folder to your PATH, e.g.:

```cmd
setx PATH "%PATH%;C:\Program Files\DiffMachine\bin"
```

---

## Installing GUI (Difference Machine)

The installer installs the **Difference Machine GUI** automatically together with Forester and the Blender addon.

- **PyInstaller build**: If the installer package contains a frozen GUI in `<os>/diffmachine_gui/` (e.g. `DifferenceMachine` or `DifferenceMachine.exe`), it is copied as-is and a launcher is created. No Python is required on the target machine.
- **Sources**: If only sources are present, the script creates a virtualenv, installs dependencies (PyQt6, etc.) from PyPI, and creates the launcher. This requires Python 3 with the `venv` module and network access.

- **Linux**: After install, run the GUI from the applications menu (“Difference Machine”) or from a terminal: `<path>/bin/dfm-gui` (or `dfm-gui` if `<path>/bin` is in your PATH).
- **macOS**: A “Difference Machine.command” launcher is created in `~/Applications` or `~/Desktop`; double-click it to start the GUI. You can also run `<path>/bin/dfm-gui` from a terminal.
- **Windows**: Shortcuts are created in the Start Menu and on the Desktop. You can also run `<path>\bin\dfm-gui.cmd`.

The GUI virtualenv (when using sources) is at `<path>/gui-venv` (or `<path>\gui-venv` on Windows). To update dependencies manually, activate the venv and run `pip install -r <path>/diffmachine_gui/requirements.txt`.

---

## For maintainers: building the installer package

The script `build_installer_full.sh` does the full build: Forester, GUI (PyInstaller), then assembles the installer layout in `DFM_Installer/`. Run it from the project root or from the `installer` directory. The `DFM_Installer` folder is **not** deleted. ISO is **not** created by the build; use `installer/scripts/build_iso.sh` separately to create `installer/DFM_Installer_<os>.iso` (requires xorriso, genisoimage, or mkisofs).

### Structure of DFM_Installer

```
DFM_Installer/
├── linux/           forester/, diffmachine_gui/
├── windows/         forester/, diffmachine_gui/
├── osx/             forester/, diffmachine_gui/
├── addons/          blender/
├── install.sh
├── install.bat
└── README.txt
```

Each platform folder (`linux`, `windows`, `osx`) contains its own Forester binaries and API, and a PyInstaller-built GUI (or sources). The install script uses only the folder for the current OS.

### What the build does

1. **Build Forester** (`scripts/build_forester.sh`):
   - **Linux**: on Linux, builds `installer/forester/linux/bin/forester` and `installer/forester/linux/lib/libforester.so`.
   - **macOS**: on macOS, builds `installer/forester/macos/bin/forester` and `installer/forester/macos/lib/libforester.dylib`.
   - **Windows**: cross-compiles from Linux/macOS with Go into `installer/forester/windows/bin/forester.exe` and `installer/forester/windows/lib/forester.dll`; or use `forester/WINDOWS_build.bat` on Windows.

2. **Build GUI** (`scripts/build_gui_pyinstaller.sh` or `.bat`):
   - PyInstaller builds the GUI **directly into** `DFM_Installer/<linux|windows|osx>/diffmachine_gui/`. On macOS the folder is `osx/`.

3. **Assemble installer** (`scripts/build_installer.sh`):
   - Copies `installer/forester/<os>/` → `DFM_Installer/<os>/forester/` for the current OS.
   - Copies `addons/` → `DFM_Installer/addons/`.
   - Copies API (and Python bindings) into `DFM_Installer/addons/blender/diffmachine/api/` (all platforms present) and into `DFM_Installer/<os>/diffmachine_gui/api/` (current platform).
   - Overwrites `install.sh`, `install.bat`, and `README.txt` in `DFM_Installer/`.
   - Does **not** create ISO; use `scripts/build_iso.sh` for that.

Binaries for an OS are only built when that OS (or cross-compilation) is available. Each build run fills or updates **one** platform’s folder in `DFM_Installer`; to have all three, build on Linux, Windows, and macOS (or copy the built folders into one `DFM_Installer`).

### How to run

From the project root:

```bash
./installer/build_installer_full.sh
```

Or from `installer`:

```bash
./build_installer_full.sh
```

On **Windows**, step 2 (GUI) is not run by the shell script: run `installer\scripts\build_gui_pyinstaller.bat` manually, then run `build_installer_full.sh` again (or only `scripts/build_installer.sh`) to copy forester, addons, and scripts.

### Requirements for building

- **Go** (for Forester and, where supported, API libraries).
- **Platform builds**: Linux binary on Linux, macOS binary on macOS; Windows can be cross-built from Linux/macOS.
- **GUI (PyInstaller)**: install build dependencies:

  ```bash
  pip install -r installer/requirements-build.txt
  ```

  This installs PyInstaller and the GUI runtime deps (PyQt6, etc.). Then run `installer/scripts/build_gui_pyinstaller.sh` (Linux/macOS) or `installer/scripts/build_gui_pyinstaller.bat` (Windows). See `installer/scripts/README.md` for the full flow.

- **ISO**: run `installer/scripts/build_iso.sh` to create `installer/DFM_Installer_<os>.iso` (requires xorriso, genisoimage, or mkisofs).

### Testing the installer

After a build, `installer/DFM_Installer/` is left in place. Test installation by:

```bash
cd installer/DFM_Installer
./install.sh   # Linux/macOS
# or on Windows:
# install.bat
```

---

## Layout of this folder

| Path | Description |
|------|-------------|
| `install.sh` | Install script for Linux/macOS. Expects `<linux|osx>/forester/`, `<linux|osx>/diffmachine_gui/`, and `addons/` alongside it. |
| `install.bat` | Install script for Windows. Expects `windows\forester\`, `windows\diffmachine_gui\`, and `addons\blender` alongside it. |
| `build_installer_full.sh` | Full build: Forester, GUI into `DFM_Installer/<os>/diffmachine_gui/`, then `scripts/build_installer.sh` to copy forester, addons, and scripts. ISO: `scripts/build_iso.sh`. |
| `requirements-build.txt` | Dependencies for building the GUI with PyInstaller: `pip install -r installer/requirements-build.txt`. |
| `scripts/` | Step-by-step build: `build_forester.sh`, `copy_addons.sh`, `build_gui_pyinstaller.sh` / `.bat`, `build_installer.sh`, `build_iso.sh`. See `scripts/README.md`. |
| `setup.cfg.example` | Example config for `~/.dfm/setup.cfg` (forester path, api path, blender, gui, etc.). The install scripts create a minimal `setup.cfg`; you can extend it using this example. |
| `forester/linux/`, `forester/macos/`, `forester/windows/` | Built Forester CLI and API (bin/, lib/). Used as source for copying into `DFM_Installer/<os>/forester/`. |

After `build_installer_full.sh` (or `scripts/build_installer.sh`), the **layout inside** `DFM_Installer/` is:

```
DFM_Installer/
├── linux/
│   ├── forester/       bin/forester, lib/libforester.so
│   └── diffmachine_gui/   (PyInstaller build or sources)
├── windows/
│   ├── forester/       bin/forester.exe, lib/forester.dll
│   └── diffmachine_gui/   (PyInstaller build or sources)
├── osx/
│   ├── forester/       bin/forester, lib/libforester.dylib
│   └── diffmachine_gui/   (PyInstaller build or sources)
├── addons/
│   └── blender/       Blender addon (shared)
├── install.sh
├── install.bat
└── README.txt
```

---

## Configuration after install

The install scripts create `~/.dfm/setup.cfg` (or `%USERPROFILE%\.dfm\setup.cfg` on Windows) with at least:

- `[forester] path` — path to the `forester` binary.
- `[api]` — path to the API library if it was installed.
- `[difference machine gui]` — path to the GUI launcher (`dfm-gui` or `dfm-gui.cmd`) if the GUI was installed.

For Blender and merge behaviour, use `setup.cfg.example` as a reference and add sections like `[blender]` and `[user]` as needed. See the main project docs and `doc/usage_guide.md` for details.
