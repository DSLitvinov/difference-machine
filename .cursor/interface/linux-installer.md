# Linux installer (tar.gz)

Release packaging for Forester GUI + CLI + Blender addon on Linux.

**Build:** `./builder/linux/build.sh --tar` → `builder/dist/DifferenceMachine-<version>-linux.tar.gz`  
**Builder docs:** [builder/README.md](../../builder/README.md)

---

## 1. Install layout

After extracting the archive:

```
Difference Machine/
├── difference-machine          GUI binary
├── bin/forester                Forester CLI
├── bin/ffmpeg                  bundled ffmpeg (BtbN static build)
├── lib/libforester.so          Forester API
├── share/icons/hicolor/...     Forester app icons (optional)
├── addons/blender/difference_machine.zip
├── install.sh                  system / user install helper
└── README.txt
```

`install.sh` copies the payload to `/opt/Difference Machine/` (or `~/.local/share/Difference Machine/` with `--user`), writes Forester/API paths in `~/.dfm/setup.cfg`, creates `/usr/local/bin` symlinks (or `~/.local/bin`), a **applications menu** `.desktop` entry, and copies Forester icons into the system icon theme.

GUI bootstrap resolves install root as the folder containing `difference-machine` (sibling `bin/`, `lib/`, `addons/`).

`manifest.json` `install_defaults.forester_prefix`: `/opt/Difference Machine`.

---

## 2. `install.sh`

Bundled in the release archive. Run from the extracted folder.

| Feature | Detail |
|---------|--------|
| Default target | `/opt/Difference Machine/` |
| User install | `./install.sh --user` → `~/.local/share/Difference Machine/` |
| Symlinks | `/usr/local/bin/forester`, `/usr/local/bin/difference-machine` (or `~/.local/bin` with `--user`) |
| Menu entry | `/usr/local/share/applications/difference-machine.desktop` (or `~/.local/share/applications/` with `--user`) |
| Forester icons | `share/icons/hicolor/` → `/usr/local/share/icons/` (or `~/.local/share/icons/` with `--user`) |
| Uninstall | `sudo ./install.sh --uninstall` |

Flags: `--no-symlinks`, `--no-desktop`, `--no-setup-cfg`, `--prefix PATH`.

**Note:** Linux install creates a **menu** `.desktop` entry only — no `~/Desktop` shortcut (unlike Windows NSIS).

---

## 3. `~/.dfm/setup.cfg`

Created or updated by `install.sh` and on first GUI launch (`internal/install/bootstrap.go`):

```ini
[forester]
path = /opt/Difference Machine/bin/forester
ffmpeg_path = /opt/Difference Machine/bin/ffmpeg

[api]
path = /opt/Difference Machine/lib/libforester.so

[addons]
diffmachine_path = /opt/Difference Machine/addons/blender/difference_machine
```

Paths use native separators after `CanonicalAbsPath`. With `--user`, paths point under `~/.local/share/Difference Machine/`.

---

## 4. App icons

| App | Source | Install target |
|-----|--------|----------------|
| **GUI** | Wails `build/appicon.png` embedded in binary | `.desktop` `Icon=` uses GUI binary path |
| **Forester CLI** | `sources/forester/icons/` → `share/icons/hicolor/{16,32,48,64,128,256,512}x512/apps/` | Copied by `install_forester_icons()` in `install.sh` |

Regenerate Forester icons: `bash builder/scripts/generate_forester_icons.sh`.

---

## 5. Forester CLI

| Approach | How |
|----------|-----|
| **Direct** | `/opt/Difference Machine/bin/forester status` |
| **Symlink (after install.sh)** | `forester status` via `/usr/local/bin/forester` |

---

## 6. User steps

1. Extract `DifferenceMachine-*-linux.tar.gz`.
2. Run `sudo ./install.sh` (or `./install.sh --user`).
3. Launch **Difference Machine** from the applications menu once (writes/updates `setup.cfg`, extracts addon zip).
4. Install Blender addon from `addons/blender/difference_machine.zip` (Install from Disk in Blender).
5. Enable addon in Blender.

---

## 7. Related specs

- [paths.md §2](./paths.md) · [multi-repo.md](./multi-repo.md) · [smoke-checklist.md §Platform release](./smoke-checklist.md)
