# Forester API Setup

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

If the native library is not bundled inside the extension folder, the addon loads it from:

1. `~/.dfm/setup.cfg` -> `[api] path` (written by the GUI or by `./builder/build.sh --write-local-config`)
2. Or derived from `[forester] path`: `bin/forester` -> sibling `lib/forester.dll` (Windows portable install layout)

## Supported JSON API Areas

The method list is implemented in `sources/forester/internal/jsonapi/dispatch.go`. Current categories include:

- Repository: `repo.init`, `repo.switch`, `repo.rebuild`
- Status and index: `status.get`, `index.add`, `index.drop`
- Commits and history: `commit.create`, `commit.get`, `commit.files`, `commit.revert`, `commit.reset`, `log.get`
- Branches: `branch.list`, `branch.create`, `branch.delete`, `branch.rename`
- Compare and restore: `compare.extract`, `restore.version`, `restore.file`
- Workdir and previews: `workdir.tree`, `workdir.entries`, `workdir.metadata`, `workdir.thumbnail`, `workdir.open`, `workdir.search`
- Diff and blobs: `diff.name_status`, `diff.stat`, `diff.text`, `blob.get`
- Merge: `merge.status`, `merge.start`, `merge.continue`, `merge.abort`
- Locks: `lock.list`, `lock.acquire`, `lock.release`
- Object metadata: `object.add`, `object.get`, `object.list`, `object.list_by_file`, `object.delete`, `object.delete_by_file`, object tag methods, and object metadata methods
- Maintenance: `gc.run`

## Troubleshooting

- Check that `api/python/python_bindings_json.py` exists in the addon folder.
- Check that the native library exists either in the addon `api/` folder or at `[api] path` in `~/.dfm/setup.cfg`.
- Rebuild from the project root with `./builder/build.sh` if bindings and native library versions drift.
