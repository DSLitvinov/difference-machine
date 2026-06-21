# Difference Machine — Build

Scripts in this folder produce a **distribution payload** (`dfm_distr`): Forester CLI, native API library, and the Blender addon with embedded API. The payload is self-contained and intended to be consumed by a separate system installer (not implemented here).

---

## Quick start

From the project root:

```bash
./builder/build.sh
```

Output (default): `~/dfm_distr`

Override output location:

```bash
DFM_DIST=/tmp/dfm_test ./builder/build.sh
```

Write `~/.dfm/setup.cfg` for local development:

```bash
./builder/build.sh --write-local-config
```

On Windows (Git Bash or WSL):

```bash
bash builder/build.sh
```

---

## Distribution layout (`dfm_distr`)

```
dfm_distr/
├── bin/                 Forester CLI
├── lib/                 Native API (libforester.so / .dylib / forester.dll)
├── addons/
│   └── blender/
│       └── difference_machine/
│           └── api/     Native lib + python/ bindings (filled by build)
├── manifest.json        Contract for the future installer
├── setup.cfg.template   Config template with {PREFIX} placeholders
├── VERSION
└── README.txt
```

Build runs **only for the current OS** (native compile). Cross-compilation is not supported.

---

## What the build does

1. **`scripts/build_forester.sh`** — Go CLI (`cmd/forester`) and c-shared API (`./api`) → `builder/.staging/forester/`
2. **`scripts/stage_dist.sh`** — Copy staging + addons into `DFM_DIST`, embed API in the addon, write `manifest.json` and metadata
3. **`scripts/clean_build.sh`** — Remove staging and intermediate artifacts (does **not** delete `dfm_distr`)

---

## Manual addon setup (development)

After build, link the addon into Blender extensions, for example:

**Linux**

```bash
ln -sf ~/dfm_distr/addons/blender/difference_machine \
  ~/.config/blender/4.2/extensions/user_default/difference_machine
```

**macOS**

```bash
ln -sf ~/dfm_distr/addons/blender/difference_machine \
  ~/Library/Application\ Support/Blender/4.2/extensions/user_default/difference_machine
```

**Windows** (cmd, adjust version):

```cmd
mklink /D "%APPDATA%\Blender Foundation\Blender\4.2\extensions\user_default\difference_machine" ^
  "%USERPROFILE%\dfm_distr\addons\blender\difference_machine"
```

Add Forester to PATH:

```bash
export PATH="$HOME/dfm_distr/bin:$PATH"
```

---

## Requirements

- **Go 1.21+** (Forester CLI and API)
- **C compiler** (optional, for CGO/SQLite in Forester)
- Platform build only on matching OS (Linux on Linux, macOS on macOS, Windows on Windows)

---

## Folder reference

| Path | Description |
|------|-------------|
| `build.sh` | Main entry point |
| `setup.cfg.template` | Template for `~/.dfm/setup.cfg` (used by future installer) |
| `setup.cfg.example` | Extended example config for end users |
| `scripts/build_forester.sh` | Build CLI + API to staging |
| `scripts/stage_dist.sh` | Assemble `dfm_distr` |
| `scripts/copy_addons.sh` | Copy `sources/addons/` into target |
| `scripts/write_setup_cfg.sh` | Write `~/.dfm/setup.cfg` (optional, `--write-local-config`) |
| `scripts/clean_build.sh` | Clean intermediate artifacts |
| `scripts/lib/detect_platform.sh` | Shared OS / library name detection |

---

## Future installer

The payload includes `manifest.json` with relative paths to components. A separate installer will:

1. Read `manifest.json`
2. Copy `bin/`, `lib/`, and `addons/` to a system prefix
3. Install the Blender addon
4. Generate `~/.dfm/setup.cfg` from `setup.cfg.template`

Build scripts do **not** install into system paths or modify Blender directories.

---

## CI packaging

For embedding in an installer bundle:

```bash
DFM_DIST="${PWD}/builder/dist/dfm_distr" ./builder/build.sh
```

The layout is identical; only the output path changes.
