# Difference Machine - База данных

## Обзор

Forester использует **SQLite3** для хранения метаданных репозитория. База данных находится в `.DFM/database.db` и содержит информацию о коммитах, ветках, тегах, блокировках, комментариях и других метаданных.

**Важно**: Сами объекты (файлы, меши) хранятся в файловой системе в `.DFM/objects/`, а не в базе данных. БД хранит только ссылки на них (хеши).

## Технические детали

### Движок БД
- **SQLite3** через CGO (`github.com/mattn/go-sqlite3`)
- **WAL mode** (Write-Ahead Logging) для лучшей производительности
- **Foreign keys** включены для целостности данных
- **Транзакции** для атомарности операций

### Инициализация
```go
db, err := sql.Open("sqlite3", dbPath+"?_foreign_keys=1")
db.Exec("PRAGMA journal_mode=WAL;")
db.Exec("PRAGMA foreign_keys=ON;")
```

## Схема базы данных

### Таблица: `commits`
Хранит информацию о коммитах.

| Колонка | Тип | Описание |
|---------|-----|----------|
| `hash` | TEXT PRIMARY KEY | SHA256 хеш коммита |
| `parent_hash` | TEXT | Хеш родительского коммита (NULL для первого коммита) |
| `tree_hash` | TEXT NOT NULL | Хеш дерева файлов коммита |
| `author` | TEXT NOT NULL | Автор коммита |
| `message` | TEXT NOT NULL | Сообщение коммита |
| `timestamp` | INTEGER NOT NULL | Unix timestamp создания коммита |
| `type` | INTEGER NOT NULL | Тип коммита (0 = PROJECT) |
| `screenshot_path` | TEXT | Путь к скриншоту коммита (опционально) |

**Индексы:**
- `idx_commits_parent` на `parent_hash`
- `idx_commits_tree` на `tree_hash`

**Foreign Keys:**
- `parent_hash` → `commits(hash)`

### Таблица: `branches`
Хранит информацию о ветках.

| Колонка | Тип | Описание |
|---------|-----|----------|
| `name` | TEXT PRIMARY KEY | Имя ветки |
| `commit_hash` | TEXT | Хеш HEAD коммита ветки (NULL для пустых веток) |
| `created_at` | INTEGER NOT NULL | Unix timestamp создания ветки |

**Индексы:**
- `idx_branches_commit` на `commit_hash`

### Таблица: `tags`
Хранит информацию о тегах.

| Колонка | Тип | Описание |
|---------|-----|----------|
| `name` | TEXT PRIMARY KEY | Имя тега |
| `commit_hash` | TEXT NOT NULL | Хеш коммита, на который ссылается тег |
| `author` | TEXT NOT NULL | Автор тега |
| `message` | TEXT | Сообщение тега (опционально) |
| `created_at` | INTEGER NOT NULL | Unix timestamp создания тега |

**Индексы:**
- `idx_tags_commit` на `commit_hash`

**Foreign Keys:**
- `commit_hash` → `commits(hash)`

### Таблица: `stashes`
Хранит информацию о stash (временных сохранениях).

| Колонка | Тип | Описание |
|---------|-----|----------|
| `hash` | TEXT PRIMARY KEY | SHA256 хеш stash |
| `message` | TEXT NOT NULL | Сообщение stash |
| `tree_hash` | TEXT NOT NULL | Хеш дерева файлов stash |
| `created_at` | INTEGER NOT NULL | Unix timestamp создания stash |

### Таблица: `locks`
Хранит информацию о блокировках файлов.

| Колонка | Тип | Описание |
|---------|-----|----------|
| `file_path` | TEXT NOT NULL | Путь к заблокированному файлу |
| `user` | TEXT NOT NULL | Имя пользователя, заблокировавшего файл |
| `branch` | TEXT NOT NULL | Ветка, в которой заблокирован файл |
| `lock_type` | INTEGER NOT NULL | Тип блокировки (0 = EXCLUSIVE, 1 = SHARED) |
| `created_at` | INTEGER NOT NULL | Unix timestamp создания блокировки |
| `expires_at` | INTEGER | Unix timestamp истечения блокировки (NULL = никогда) |

**Primary Key:** `(file_path, user, branch)`

**Индексы:**
- `idx_locks_file` на `file_path`
- `idx_locks_branch` на `branch`

### Таблица: `comments`
Хранит комментарии к ресурсам (система review).

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | Уникальный ID комментария |
| `asset_type` | TEXT NOT NULL | Тип ресурса ("mesh", "blob", "commit") |
| `asset_id` | TEXT NOT NULL | ID ресурса (хеш или другой идентификатор) |
| `author` | TEXT NOT NULL | Автор комментария |
| `content` | TEXT NOT NULL | Текст комментария |
| `x` | REAL DEFAULT 0.0 | X координата для 3D контента |
| `y` | REAL DEFAULT 0.0 | Y координата для 3D контента |
| `created_at` | INTEGER NOT NULL | Unix timestamp создания комментария |
| `resolved` | INTEGER DEFAULT 0 | Флаг разрешения (0 = не разрешен, 1 = разрешен) |

**Индексы:**
- `idx_comments_asset` на `(asset_type, asset_id)`

### Таблица: `approvals`
Хранит одобрения/отклонения ресурсов.

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | Уникальный ID одобрения |
| `asset_type` | TEXT NOT NULL | Тип ресурса |
| `asset_id` | TEXT NOT NULL | ID ресурса |
| `author` | TEXT NOT NULL | Автор одобрения |
| `status` | TEXT NOT NULL | Статус ("pending", "approved", "rejected") |
| `comment` | TEXT | Комментарий к одобрению |
| `created_at` | INTEGER NOT NULL | Unix timestamp создания одобрения |

**Unique Constraint:** `(asset_type, asset_id, author)`

**Индексы:**
- `idx_approvals_asset` на `(asset_type, asset_id)`

### Таблица: `blobs`
Хранит метаданные о бинарных объектах (файлах).

| Колонка | Тип | Описание |
|---------|-----|----------|
| `hash` | TEXT PRIMARY KEY | SHA256 хеш объекта |
| `path` | TEXT NOT NULL | Путь к файлу в хранилище |
| `stored_at` | INTEGER NOT NULL | Unix timestamp сохранения |

### Таблица: `reflog`
Журнал всех операций с коммитами (для безопасного удаления).

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | Уникальный ID записи |
| `commit_hash` | TEXT NOT NULL | Хеш коммита |
| `ref_name` | TEXT NOT NULL | Имя ссылки ("HEAD", "main", "v1.0") |
| `ref_type` | TEXT NOT NULL | Тип ссылки ("HEAD", "branch", "tag") |
| `old_value` | TEXT | Старое значение ссылки |
| `new_value` | TEXT | Новое значение ссылки |
| `operation` | TEXT NOT NULL | Операция ("create", "update", "delete") |
| `timestamp` | INTEGER NOT NULL | Unix timestamp операции |

**Индексы:**
- `idx_reflog_commit` на `commit_hash`
- `idx_reflog_ref` на `(ref_name, ref_type)`
- `idx_reflog_timestamp` на `timestamp`

## Диаграмма связей

```
commits
├── parent_hash → commits(hash) [self-reference]
└── tree_hash → [objects/trees/]

tags
└── commit_hash → commits(hash)

branches
└── commit_hash → commits(hash) [nullable]

stashes
└── tree_hash → [objects/trees/]

locks
└── (file_path, user, branch) [composite PK]

comments
└── (asset_type, asset_id) [indexed]

approvals
└── (asset_type, asset_id, author) [unique]

blobs
└── hash [PK, references objects/blobs/]

reflog
└── commit_hash → commits(hash) [indexed]
```

## Staging Area (Index)

**Важно**: Staging area (индекс) **НЕ хранится в БД**, а в JSON файле `.DFM/index`.

### Формат файла индекса
```json
{
  "path/to/file1.txt": "abc123def456...",
  "path/to/file2.blend": "def789ghi012...",
  "subdir/file3.py": "ghi345jkl678..."
}
```

### Структура
- **Путь**: `.DFM/index`
- **Формат**: JSON объект `map[string]string`
- **Ключ**: относительный путь к файлу от корня репозитория
- **Значение**: SHA256 хеш содержимого файла

### Операции с индексом
- `Add(filePath, hash)` — добавить файл в индекс
- `Remove(filePath)` — удалить файл из индекса
- `Clear()` — очистить весь индекс
- `GetEntries()` — получить все записи
- `HasFile(filePath)` — проверить наличие файла
- `GetHash(filePath)` — получить хеш файла
- `IsEmpty()` — проверить, пуст ли индекс

## Основные операции с БД

### Коммиты

#### Создание коммита
```go
commit := &models.Commit{
    Hash: "abc123...",
    ParentHash: "def456...",
    TreeHash: "ghi789...",
    Author: "John Doe",
    Message: "Initial commit",
    Timestamp: time.Now().Unix(),
    Type: models.CommitTypeProject,
}
db.CreateCommit(commit)
```

#### Получение коммита
```go
commit, err := db.GetCommit("abc123...")
```

#### История коммитов
```go
commits, err := db.GetCommitHistory("main", 10) // последние 10 коммитов
```

#### Удаление коммита
- `DeleteCommit(hash)` — помечает для удаления (добавляет в reflog)
- `ForceDeleteCommit(hash)` — физически удаляет (используется GC)

### Ветки

#### Создание ветки
```go
db.CreateBranch("feature-branch", "abc123...")
```

#### Установка HEAD ветки
```go
db.SetBranchHead("main", "def456...")
```

#### Получение HEAD ветки
```go
headHash, err := db.GetBranchHead("main")
```

#### Список веток
```go
branches, err := db.ListBranches()
```

#### Удаление ветки
```go
db.DeleteBranch("old-branch")
```

### Теги

#### Создание тега
```go
tag := &models.Tag{
    Name: "v1.0.0",
    CommitHash: "abc123...",
    Author: "John Doe",
    Message: "Release version 1.0.0",
    CreatedAt: time.Now().Unix(),
}
db.CreateTag(tag)
```

#### Получение тега
```go
tag, err := db.GetTag("v1.0.0")
```

#### Список тегов
```go
tags, err := db.ListTags()
```

### Stash

#### Создание stash
```go
stash := &models.Stash{
    Hash: "stash{abc123...}",
    Message: "WIP: working on textures",
    TreeHash: "def456...",
    CreatedAt: time.Now().Unix(),
}
db.CreateStash(stash)
```

#### Список stash
```go
stashes, err := db.ListStashes()
```

#### Удаление stash
```go
db.DeleteStash("stash{abc123...}")
```

### Блокировки файлов

#### Блокировка файла
```go
lock := &models.Lock{
    FilePath: "model.blend",
    User: "john",
    Branch: "main",
    LockType: models.LockTypeExclusive,
    CreatedAt: time.Now().Unix(),
    ExpiresAt: 0, // никогда не истекает
}
acquired, err := db.AcquireLock(lock)
```

#### Проверка блокировки
```go
locked, err := db.IsLocked("model.blend")
```

#### Получение блокировок ветки
```go
locks, err := db.GetLocks("main")
```

#### Разблокировка
```go
db.ReleaseLock("model.blend", "john")
```

### Система Review

#### Создание комментария
```go
comment := &models.Comment{
    AssetType: "mesh",
    AssetID: "abc123...",
    Author: "John Doe",
    Content: "Looks good!",
    X: 1.5,
    Y: 2.3,
    CreatedAt: time.Now().Unix(),
    Resolved: false,
}
commentID, err := db.CreateComment(comment)
```

#### Получение комментариев
```go
comments, err := db.GetComments("mesh", "abc123...")
```

#### Разрешение комментария
```go
db.ResolveComment(commentID)
```

#### Создание одобрения
```go
approval := &models.Approval{
    AssetType: "mesh",
    AssetID: "abc123...",
    Author: "John Doe",
    Status: models.ApprovalStatusApproved,
    Comment: "Approved for production",
    CreatedAt: time.Now().Unix(),
}
db.CreateApproval(approval)
```

#### Получение одобрений
```go
approvals, err := db.GetApprovals("mesh", "abc123...")
```

### Reflog

#### Добавление записи
```go
db.AddReflogEntry(
    "abc123...",        // commit_hash
    "HEAD",             // ref_name
    "commit",           // ref_type
    "def456...",        // old_value
    "abc123...",        // new_value
    "update",           // operation
)
```

#### Получение reflog
```go
entries, err := db.GetReflog("main", 100) // последние 100 записей для ветки main
allEntries, err := db.GetReflog("", 100)  // последние 100 записей всех ссылок
```

#### Истечение reflog (GC)
```go
expireBefore := time.Now().AddDate(0, 0, -90).Unix() // 90 дней назад
db.ExpireReflog(expireBefore)
```

#### Проверка наличия в reflog
```go
inReflog, err := db.IsCommitInReflog("abc123...")
```

#### Восстановление коммита
```go
restored, err := db.RestoreCommitFromReflog("abc123...")
```

### Метаданные объектов

#### Сохранение blob
```go
db.StoreBlob("abc123...", "objects/blobs/sha256/abc123...")
```

#### Получение пути к blob
```go
path, err := db.GetBlobPath("abc123...")
```

## Транзакции

Все критические операции выполняются в транзакциях для обеспечения атомарности:

```go
tx, err := d.db.Begin()
if err != nil {
    return err
}
defer tx.Rollback()

// Выполнение операций
if _, err := tx.Exec("DELETE FROM commits WHERE hash = ?", hash); err != nil {
    return err
}

// Коммит транзакции
return tx.Commit()
```

## Производительность

### Оптимизации
1. **WAL mode** — позволяет параллельные чтения
2. **Индексы** — ускорение поиска по часто используемым полям
3. **Foreign keys** — целостность данных на уровне БД
4. **Подготовленные запросы** — переиспользование планов запросов

### Индексы
- `commits`: `parent_hash`, `tree_hash`
- `branches`: `commit_hash`
- `tags`: `commit_hash`
- `locks`: `file_path`, `branch`
- `comments`: `(asset_type, asset_id)`
- `approvals`: `(asset_type, asset_id)`
- `reflog`: `commit_hash`, `(ref_name, ref_type)`, `timestamp`

## Безопасность удаления коммитов

### Механизм reflog
1. **Удаление коммита** (`DeleteCommit`) не удаляет его физически
2. Добавляется запись в `reflog` с операцией "delete"
3. Коммит скрывается из истории, но остается в БД
4. **Garbage Collection** (`ForceDeleteCommit`) физически удаляет только:
   - Коммиты с истекшим reflog (по умолчанию 90 дней)
   - Коммиты без активных ссылок (ветки, теги, HEAD)

### Восстановление
```go
// Восстановить коммит из reflog
restored, err := db.RestoreCommitFromReflog("abc123...")
```

## Работа с БД в коде

### Инициализация
```go
db, err := core.NewDatabase(".DFM/database.db")
if err != nil {
    log.Fatal(err)
}
defer db.Close()
```

### Обработка ошибок
```go
commit, err := db.GetCommit(hash)
if err != nil {
    if dbErr, ok := err.(*core.DatabaseException); ok {
        // Обработка ошибки БД
        log.Printf("Database error: %s", dbErr.Message)
    }
    return err
}
```

### Проверка существования
```go
// Проверка наличия коммита
commit, err := db.GetCommit(hash)
if err != nil {
    if strings.Contains(err.Error(), "not found") {
        // Коммит не найден
    }
}
```

## Миграции и версионирование схемы

**Текущая версия**: Схема создается автоматически при инициализации репозитория через `createTables()`.

**Будущие миграции**: При необходимости можно добавить систему версионирования схемы БД.

## Резервное копирование

База данных SQLite — это один файл `.DFM/database.db`, что упрощает резервное копирование:

```bash
# Копирование БД
cp .DFM/database.db .DFM/database.db.backup

# Восстановление
cp .DFM/database.db.backup .DFM/database.db
```

**Важно**: При копировании БД убедитесь, что нет активных транзакций. SQLite в WAL mode создает дополнительные файлы (`.db-wal`, `.db-shm`), которые также нужно копировать для полной консистентности.

## Восстановление БД

### Пересборка из хранилища объектов
```bash
forester rebuild
```

Эта команда пересобирает БД из объектов в `.DFM/objects/`, что полезно при повреждении БД.

## Ограничения SQLite

- **Размер БД**: Практически неограничен (до 281 TB)
- **Параллельные записи**: WAL mode позволяет параллельные чтения, но только одна запись одновременно
- **Сетевой доступ**: SQLite не поддерживает сетевой доступ напрямую (нужен файловый доступ)

## Мониторинг и отладка

### Просмотр схемы
```sql
.schema
```

### Просмотр таблиц
```sql
.tables
```

### Просмотр индексов
```sql
.indices commits
```

### Статистика таблиц
```sql
SELECT COUNT(*) FROM commits;
SELECT COUNT(*) FROM branches;
SELECT COUNT(*) FROM tags;
```

### Анализ производительности
```sql
EXPLAIN QUERY PLAN SELECT * FROM commits WHERE parent_hash = ?;
```

