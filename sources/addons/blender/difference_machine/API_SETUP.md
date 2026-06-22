# Forester API setup

If you see **"Forester API not available"** or **"Failed to load commits: Forester API not available"**, the addon cannot find the Forester native library or Python bindings.

Copy into `addons/blender/difference_machine/api/`:

- The library: `libforester.so` / `libforester.dylib` / `libforester_arm64.dylib` / `forester.dll`
- A folder `api/python/` containing `python_bindings_json.py`

Build the library from the project root:

```bash
./builder/build.sh
```

The build copies the native library and JSON bindings into the addon automatically. For manual setup, copy from `~/dfm_distr/lib/` (library) and `sources/forester/api/python_bindings_json.py` (into `api/python/`).

The addon uses the JSON C API (`ForesterOpen` / `ForesterCall`), not the legacy structured C API.
