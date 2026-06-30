# Linux installer (tar.gz)

Release packaging for Forester GUI + CLI + Blender addon on Linux.

**Build:** `./builder/linux/build.sh --tar` → `builder/dist/DifferenceMachine-<version>-linux.tar.gz`  
**Builder docs:** [builder/README.md](../../builder/README.md)

---

## 1. Install layout

System install target: `/opt/Difference-Machine/`

```
/opt/Difference-Machine/
├── difference-machine              GUI binary
├── difference-machine.desktop      resolved launcher (copy of menu entry)
├── bin/forester                    Forester CLI
├── bin/ffmpeg                      bundled ffmpeg (BtbN static build)
├── lib/libforester.so              Forester API
├── share/icons/hicolor/.../apps/
│   ├── difference-machine.png      GUI menu icon (all sizes)
│   └── forester.png                Forester CLI icon (all sizes)
├── addons/blender/difference_machine.zip
├── install.sh
└── README.txt
```

`install.sh` copies the full payload to `/opt/Difference-Machine/` (or `~/.local/share/Difference-Machine/` with `--user`), writes Forester/API paths in `~/.dfm/setup.cfg`, creates `/usr/local/bin` symlinks (or `~/.local/bin`), registers a **applications menu** `.desktop` entry, and merges icons into the system hicolor theme.

GUI bootstrap resolves install root as the folder containing `difference-machine` (sibling `bin/`, `lib/`, `addons/`).

`manifest.json` `install_defaults.forester_prefix`: `/opt/Difference-Machine`.

---

## 2. `install.sh`

Bundled in the release archive. Run from the extracted folder.

| Feature | Detail |
|---------|--------|
| Default target | `/opt/Difference-Machine/` |
| User install | `./install.sh --user` → `~/.local/share/Difference-Machine/` |
| Symlinks | `/usr/local/bin/forester`, `/usr/local/bin/difference-machine` (or `~/.local/bin` with `--user`) |
| Menu entry | `/usr/share/applications/difference-machine.desktop` (or `~/.local/share/applications/` with `--user`) |
| Icons (bundled) | `/opt/Difference-Machine/share/icons/hicolor/` |
| Icons (menu theme) | merged into `/usr/share/icons/hicolor/` (or `~/.local/share/icons/hicolor/` with `--user`) |
| Uninstall | `sudo ./install.sh --uninstall` |

Flags: `--no-symlinks`, `--no-desktop`, `--no-setup-cfg`, `--prefix PATH`.

**Note:** Linux install creates a **menu** `.desktop` entry only — no `~/Desktop` shortcut (unlike Windows NSIS).

### `.desktop` entry (freedesktop)

- Installed via `desktop-file-install` when available, otherwise copied to `/usr/share/applications/`
- `Exec` / `TryExec` point to `/opt/Difference-Machine/difference-machine`
- `Icon` uses an **absolute path** under `/opt/Difference-Machine/share/icons/hicolor/…/difference-machine.png`
- Same icons are also installed into the system **hicolor** theme (`difference-machine.png`, `forester.png`)
- `update-desktop-database` and `gtk-update-icon-cache` are run after install

---

## 3. `~/.dfm/setup.cfg`

Created or updated by `install.sh` and on first GUI launch (`internal/install/bootstrap.go` on macOS/Windows):

```ini
[forester]
path = /opt/Difference-Machine/bin/forester
ffmpeg_path = /opt/Difference-Machine/bin/ffmpeg

[api]
path = /opt/Difference-Machine/lib/libforester.so

[addons]
diffmachine_path = /opt/Difference-Machine/addons/blender/difference_machine
```

Paths use native separators after `CanonicalAbsPath`. With `--user`, paths point under `~/.local/share/Difference-Machine/`.

Blender addon zip for manual install: `/opt/Difference-Machine/addons/blender/difference_machine.zip`

---

## 4. App icons

| App | Source | Install target |
|-----|--------|----------------|
| **GUI** | `sources/gui/build/share/icons/hicolor/*/apps/difference-machine.png` | bundled under `/opt/…/share/icons/`; `.desktop` `Icon=` absolute path; also `/usr/share/icons/hicolor/` |
| **Forester CLI** | `sources/icons/logo/forester/build/share/icons/hicolor/*/apps/forester.png` | bundled under `/opt/…/share/icons/`; also `/usr/share/icons/hicolor/` |

Regenerate icons: `npm run icons:generate` (GUI) in `sources/gui/frontend`, `bash builder/scripts/generate_forester_icons.sh` (Forester).

---

## 5. Forester CLI

| Approach | How |
|----------|-----|
| **Direct** | `/opt/Difference-Machine/bin/forester status` |
| **Symlink (after install.sh)** | `forester status` via `/usr/local/bin/forester` |

---

## 6. User steps

1. Extract `DifferenceMachine-*-linux.tar.gz`.
2. `cd Difference-Machine`
3. Run `sudo ./install.sh` (or `./install.sh --user`).
4. Launch **Difference Machine** from the applications menu once (writes/updates `setup.cfg`, extracts addon zip).
5. Install Blender addon from `/opt/Difference-Machine/addons/blender/difference_machine.zip` (Install from Disk in Blender).
6. Enable addon in Blender.

---

## 7. Related specs

- [paths.md §2](./paths.md) · [multi-repo.md](./multi-repo.md) · [smoke-checklist.md §Platform release](./smoke-checklist.md)
