# Forester C API (Structured)

Структурированный C API для интеграции Forester с другими приложениями через ctypes (Python) или напрямую из C/C++.
Все функции возвращают структуры, которые нужно освобождать через `ForesterFree*`.

## Сборка

### Linux
```bash
cd forester
make build-lib
```

Библиотека будет создана в `build/libforester.so`

### macOS
```bash
cd forester
make build-lib
```

Библиотека будет создана в `build/libforester.dylib`

### Windows
```bash
cd forester
make build-lib
```

Библиотека будет создана в `build/forester.dll`

## Использование из Python (structured)

```python
from python_bindings_structured import ForesterAPI

api = ForesterAPI()  # Автоматически найдет библиотеку

repo_path = "/path/to/repo"
api.init(repo_path)

status = api.get_status(repo_path)
if status:
    print(status.to_dict())

commits = api.get_log(repo_path, max_count=10)
if commits:
    print([c.to_dict() for c in commits])

branches = api.get_branches(repo_path)
if branches:
    print([b.to_dict() for b in branches])
```

Пример с дополнительными проверками см. в `test_structured_api.py`.

## Использование из C/C++

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

    ForesterCommitList* log = ForesterGetLog("/path/to/repo", 10, NULL);
    if (log) {
        printf("Commits: %d\n", log->count);
        ForesterFreeCommitList(log);
    }

    return 0;
}
```

Компиляция:
```bash
gcc -o example example.c -L./build -lforester -I./api
```

## API функции

### Репозиторий
```c
ForesterResult* ForesterInit(const char* repoPath);
ForesterResult* ForesterAdd(const char* repoPath, const char* files);
ForesterResult* ForesterCreateCommit(const char* repoPath, const char* message, const char* author);
ForesterResult* ForesterSwitch(const char* repoPath, const char* target, int autoStash);
```

### Статус и история
```c
ForesterStatus* ForesterGetStatus(const char* repoPath);
ForesterCommitList* ForesterGetLog(const char* repoPath, int maxCount, const char* branch);
ForesterCommit* ForesterGetCommit(const char* repoPath, const char* hash);
ForesterBranchList* ForesterGetBranches(const char* repoPath);
```

### Сравнение, восстановление версии, GC и scan
```c
ForesterPathResult* ForesterCompareExtract(const char* repoPath, const char* commitHash, int cleanup, const char* editorPath);
ForesterResult* ForesterRestoreVersion(const char* repoPath, const char* commitHash);  /* full overwrite of working dir to match commit */
ForesterGcResult* ForesterGC(const char* repoPath, int dryRun, int reflogExpireDays);
ForesterRebuildResult* ForesterRebuild(const char* repoPath);  /* scan object store */
```

### Локи
```c
ForesterLockList* ForesterListLocks(const char* repoPath);
ForesterResult* ForesterAcquireLock(const char* repoPath, const char* filePath, const char* user, int lockType, int expireHours);
ForesterResult* ForesterReleaseLock(const char* repoPath, const char* filePath, const char* user);
```

### Файлы коммита
```c
ForesterFileList* ForesterGetCommitFiles(const char* repoPath, const char* commitHash);
```

### Объекты (metadata)
```c
ForesterResult* ForesterAddObject(const char* repoPath, const char* editorType, const char* filePath,
    const char* objectName, const char* objectType, const char* commitHash,
    const char* objectDataJSON, const char* tagsJSON, const char* metadataJSON);
ForesterObject* ForesterGetObject(const char* repoPath, const char* commitHash, const char* filePath, const char* objectName);
ForesterObjectList* ForesterGetObjectsByCommit(const char* repoPath, const char* commitHash);
ForesterResult* ForesterAddTagToObject(const char* repoPath, const char* commitHash, const char* filePath, const char* objectName, const char* tag);
ForesterResult* ForesterRemoveTagFromObject(const char* repoPath, const char* commitHash, const char* filePath, const char* objectName, const char* tag);
ForesterResult* ForesterSetObjectMetadata(const char* repoPath, const char* commitHash, const char* filePath, const char* objectName, const char* key, const char* value);
```

## Управление памятью

Все структуры, полученные из API, нужно освобождать:

```c
void ForesterFreeResult(ForesterResult* r);
void ForesterFreeStatus(ForesterStatus* s);
void ForesterFreeCommit(ForesterCommit* c);
void ForesterFreeCommitList(ForesterCommitList* list);
void ForesterFreeBranchList(ForesterBranchList* list);
void ForesterFreeGcResult(ForesterGcResult* r);
void ForesterFreeRebuildResult(ForesterRebuildResult* r);
void ForesterFreePathResult(ForesterPathResult* r);
void ForesterFreeLockList(ForesterLockList* list);
void ForesterFreeFileList(ForesterFileList* list);
void ForesterFreeObject(ForesterObject* obj);
void ForesterFreeObjectList(ForesterObjectList* list);
```

## Примечания

- Все пути должны быть абсолютными или относительными к текущей рабочей директории.
- Функции автоматически меняют рабочую директорию на `repoPath` перед выполнением команд.
- В Python обертке освобождение памяти выполняется автоматически.
