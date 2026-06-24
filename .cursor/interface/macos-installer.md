# macOS installer (DMG)

Release packaging for Forester GUI + CLI + Blender addon on macOS.

**Build:** `./builder/macos/build.sh --dmg` → `builder/dist/DifferenceMachine-<version>-macos.dmg`  
**Builder docs:** [builder/README.md](../../builder/README.md)

---

## 1. Install layout

User drags the **`Difference Machine`** folder from the DMG into **Applications**:

```
/Applications/Difference Machine/
├── Difference Machine.app      GUI
├── Forester.app                CLI (Terminal console app)
└── addons/blender/difference_machine.zip
```

After first launch of **Difference Machine.app**, the zip is extracted to `addons/blender/difference_machine/` for `~/.dfm/setup.cfg` bootstrap.

GUI bootstrap resolves install root as the **parent folder** of `Difference Machine.app` (sibling `Forester.app` + `addons/`).

`manifest.json` `install_defaults.forester_prefix`: `/Applications/Difference Machine`.

---

## 2. DMG volume layout

```
Difference Machine.dmg
├── README.txt                  (outside install folder)
├── Applications →
└── Difference Machine/         (drag this folder to Applications)
    ├── Difference Machine.app
    ├── Forester.app
    └── addons/blender/difference_machine.zip
```

---

## 3. `~/.dfm/setup.cfg`

Created on first launch of **Difference Machine.app** (`internal/install/bootstrap.go`):

```ini
[forester]
path = /Applications/Difference Machine/Forester.app/Contents/Resources/bin/forester

[api]
path = /Applications/Difference Machine/Forester.app/Contents/Frameworks/libforester.dylib

[addons]
diffmachine_path = /Applications/Difference Machine/addons/blender/difference_machine
```

Legacy layouts (`Contents/MacOS/Forester` launcher or `Contents/MacOS/forester` binary) are still detected if the `bin` wrapper is absent.

---

## 4. Forester CLI in Terminal

Industry pattern (VS Code `code`, Docker `docker`, Kumo `kumo`):

| Approach | How |
|----------|-----|
| **Forester.app (default)** | Double-click → Terminal runs `export PATH="…/Forester.app/Contents/Resources/bin:$PATH"` |
| **Persistent (optional)** | `sudo ln -sfn "/Applications/Difference Machine/Forester.app/Contents/Resources/bin/forester" /usr/local/bin/forester` |
| **Persistent (no sudo)** | Add the `Resources/bin` directory to `PATH` in `~/.zprofile` (same as VS Code manual install) |

`Resources/bin/forester` is a small wrapper around `Resources/forester` that sets `DYLD_LIBRARY_PATH` for `libforester.dylib`. Do **not** use shell `alias` — paths contain spaces (`Difference Machine`) and aliases break on expansion.

---

## 5. User steps (README at DMG root)

1. Drag **`Difference Machine`** folder to Applications.
2. Install Blender addon from **`addons/blender/difference_machine.zip`** (Install from Disk in Blender), or symlink after step 3.
3. Launch **Difference Machine.app** once (extracts zip for GUI paths).
4. Enable addon in Blender.

**Forester.app:** double-click → Terminal with `forester` on `PATH`.

---

## 6. Related specs

- [paths.md §2](./paths.md) · [multi-repo.md](./multi-repo.md)
