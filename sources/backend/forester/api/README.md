# Forester API

Forester exposes two native API layers:

- **JSON API**: the primary integration surface used by the Blender addon, GUI, and `forester api`.
- **Structured C API**: typed C structs for lower-level integrations that prefer direct function calls.

Prefer the JSON API for new integrations. It stays closest to the GUI/addon contract and covers repository, status, index, commit, branch, stash, workdir, diff, merge, lock, object metadata, and maintenance operations.

GUI method contract: `.cursor/gui/gui_backend/jsonapi.md`. Dispatcher: `sources/backend/forester/internal/jsonapi/dispatch.go`.

## Build

From the repository root:

```bash
./builder/build.sh
```

The native library is staged into `builder/dist/payload/lib/`:

- Linux: `libforester.so`
- macOS: `libforester.dylib`
- Windows: `forester.dll`

For component-only development:

```bash
cd sources/backend/forester
make build-lib
```

## JSON API

The native JSON API has a small C surface:

```c
int64_t ForesterOpen(const char* workPath);
char* ForesterCall(int64_t handle, const char* method, const char* argsJSON);
void ForesterClose(int64_t handle);
void ForesterFreeCString(char* ptr);
```

The GUI uses the same methods in-process via `pkg/jsonapi` (`Open` / `Call` / `Close` / `CallStateless`), not the C library.

The response is always a JSON envelope:

```json
{"ok":true,"result":{}}
```

or:

```json
{"ok":false,"error":"message"}
```

Python usage:

```python
from python_bindings_json import ForesterAPI

api = ForesterAPI()
handle = api.open("/path/to/repo")
try:
    status = api.call(handle, "status.get", {})
    print(status)
finally:
    api.close(handle)
```

CLI usage:

```bash
forester api status.get --args '{}' -C /path/to/repo
```

Method categories in `sources/backend/forester/internal/jsonapi/dispatch.go`:

- Repository: `repo.init`, `repo.switch`, `repo.rebuild`
- Status and index: `status.get`, `index.add`, `index.drop`
- Commits and history: `commit.create`, `commit.get`, `commit.revert`, `commit.reset`, `commit.delete_file`, `log.get`
- Stash: `stash.list`, `stash.apply`, `stash.drop`
- Branches: `branch.list`, `branch.create`, `branch.delete`, `branch.rename`
- Compare and restore: `compare.extract`, `restore.version`, `restore.file`
- Workdir and previews: `workdir.tree`, `workdir.entries`, `workdir.entries_by_paths`, `workdir.metadata`, `workdir.thumbnail`, `workdir.file`, `workdir.open`, `workdir.search`, `workdir.rename`, `workdir.delete` (OS Trash), `workdir.ignore`, `workdir.unignore`, `workdir.dfmignore.get`, `workdir.dfmignore.set`
- Diff and blobs: `diff.name_status` (`A` / `M` / `D` / `R`), `diff.stat`, `diff.text`, `blob.get`
- Merge: `merge.status`, `merge.start`, `merge.continue`, `merge.abort`
- Locks: `lock.list`, `lock.acquire`, `lock.release`
- Objects: `object.add`, `object.get`, `object.list_by_commit`, `object.list_by_file` (alias `objects.by_file`), `object.delete`, `object.delete_by_file`, `object.tag.add`, `object.tag.remove`, `object.metadata.set`
- Maintenance: `gc.run`, `reflog.get`, `reflog.restore`

There is no `commit.files`. Revision file lists come from `diff.name_status`.

Relative paths in args and results use `/` (`utils.NormalizeRepoRelPath`).

## Structured C API

The structured API remains available for C/C++ or ctypes users that want typed structs and explicit free functions.

Example:

```c
#include "forester.h"
#include <stdio.h>

int main() {
    ForesterResult* init = ForesterInit("/path/to/repo");
    if (!init || !init->success) {
        printf("Init error: %s\n", init && init->error ? init->error : "unknown");
    }
    ForesterFreeResult(init);

    ForesterStatus* status = ForesterGetStatus("/path/to/repo");
    if (status) {
        printf("Branch: %s\n", status->current_branch);
        ForesterFreeStatus(status);
    }

    return 0;
}
```

Compile example:

```bash
gcc -o example example.c -L./build -lforester -I./api
```

Common structured functions include:

```c
ForesterResult* ForesterInit(const char* repoPath);
ForesterResult* ForesterAdd(const char* repoPath, const char* files);
ForesterResult* ForesterCreateCommit(const char* repoPath, const char* message, const char* author);
ForesterStatus* ForesterGetStatus(const char* repoPath);
ForesterCommitList* ForesterGetLog(const char* repoPath, int maxCount, const char* branch);
ForesterBranchList* ForesterGetBranches(const char* repoPath);
ForesterPathResult* ForesterCompareExtract(const char* repoPath, const char* commitHash, int cleanup, const char* editorPath);
ForesterResult* ForesterRestoreVersion(const char* repoPath, const char* commitHash);
ForesterGcResult* ForesterGC(const char* repoPath, int dryRun, int reflogExpireDays);
ForesterRebuildResult* ForesterRebuild(const char* repoPath);
```

Every structured result returned from C must be freed with the matching `ForesterFree*` function. Python structured bindings handle this automatically.

## Files

- `capi_json.go`: JSON C API.
- `capi_structured.go`: structured C API.
- `forester.h`: exported C declarations.
- `python_bindings_json.py`: Python JSON API wrapper.
- `python_bindings_structured.py`: Python structured wrapper.
