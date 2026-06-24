# Forester API setup

If you see **"Forester API not available"** or **"Failed to load commits: Forester API not available"**, the addon cannot find the Forester native library or Python bindings.

Copy into `addons/blender/difference_machine/api/`:

- The library: `libforester.so` / `libforester.dylib` / `libforester_arm64.dylib` / `forester.dll`
- A folder `api/python/` containing `python_bindings_json.py`

Build the library from the project root:

```bash
./builder/build.sh
```

The build copies the native library and JSON bindings into the addon automatically. For manual setup, copy from `builder/dist/payload/lib/` (library) and `sources/forester/api/python_bindings_json.py` (into `api/python/`).

The addon uses the JSON C API (`ForesterOpen` / `ForesterCall`). Python bindings live in `api/python/python_bindings_json.py` and are kept in sync with `sources/forester/api/python_bindings_json.py`.

If the native library is not bundled inside the extension folder, the addon loads it from `~/.dfm/setup.cfg` → `[api] path` (written by **Difference Machine.app** on first launch).

Supported JSON methods include repository ops (`repo.init`, `index.add`, `commit.create`, `status.get`, `log.get`, `branch.*`, `repo.switch`), compare/restore (`compare.extract`, `restore.version`, `restore.file`), maintenance (`gc.run`, `repo.rebuild`), locks, object metadata, and commit queries (`commit.get`, `commit.revert`, `commit.reset`).
