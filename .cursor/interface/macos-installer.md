# macOS installer (DMG)

Release packaging for Forester GUI + CLI + Blender addon on macOS.

**Build:** `./builder/build.sh --dmg` → `builder/dist/DifferenceMachine-<version>-macos.dmg`  
**Builder docs:** [builder/README.md](../../builder/README.md)

---

## 1. Install layout

User drags the **`Difference Machine`** folder from the DMG into **Applications**:

```
/Applications/Difference Machine/
├── Difference Machine.app      GUI
├── Forester.app                CLI (Terminal console app)
└── addons/blender/difference_machine/
```

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
    └── addons/blender/difference_machine/
```

---

## 3. `~/.dfm/setup.cfg`

Created on first launch of **Difference Machine.app** (`internal/install/bootstrap.go`):

```ini
[forester]
path = /Applications/Difference Machine/Forester.app/Contents/MacOS/Forester

[api]
path = /Applications/Difference Machine/Forester.app/Contents/Frameworks/libforester.dylib

[addons]
diffmachine_path = /Applications/Difference Machine/addons/blender/difference_machine
```

Legacy flat install under `/Applications/` (no subfolder) is still detected if present.

---

## 4. User steps (README at DMG root)

1. Drag **`Difference Machine`** folder to Applications.
2. Symlink addon into Blender extensions.
3. Launch **Difference Machine.app** once.
4. Enable addon in Blender.

**Forester.app:** double-click → Terminal with `forester` alias.

---

## 5. Related specs

- [paths.md §2](./paths.md) · [multi-repo.md](./multi-repo.md)
