# Forester API setup

If you see **"Forester API not available"** or **"Failed to load commits: Forester API not available"**, the addon cannot find the Forester native library or Python bindings.

Copy into `addons/blender/difference_machine/api/`:

- The library: `libforester.so` / `libforester.dylib` / `forester.dll`
- A folder `api/python/` containing `python_bindings_structured.py` (and any files it imports).

Build the library from the project root:

```bash
cd forester
make build-lib
```

Then copy from `forester/build/` (library) and `forester/api/` (bindings into `api/python/`) into the addon’s `api/` folder.
