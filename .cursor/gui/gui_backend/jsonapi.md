# JSON API Forester для GUI

Канон методов — карта в `sources/backend/forester/internal/jsonapi/dispatch.go`.  
Публичный вход: `pkg/jsonapi`. Envelope: [architecture.md](../architecture.md).

GUI вызывает **только** методы из этой таблицы. Нет метода в `dispatch.go` — нет операции в UI (или сначала расширение API).

Относительные пути в аргументах и результатах — `/` (`utils.NormalizeRepoRelPath`).

---

## Envelope и общие результаты

Успех мутации часто:

```json
{"ok": true, "result": {"success": true}}
```

Ошибка:

```json
{"ok": false, "error": "…"}
```

Коммит в ответах `log.get` / `commit.get`:

| Поле | Тип | Смысл |
|------|-----|--------|
| `hash` | string | SHA-256, 64 hex |
| `parent_hash` | string | Первый родитель |
| `parent_hashes` | string[] | Все родители (merge) |
| `tree_hash` | string | Дерево |
| `author` | string | Автор |
| `message` | string | Сообщение |
| `timestamp` | int64 | Unix |
| `type` | string | Тип коммита |
| `screenshot_path` | string | Опционально |
| `tag` | string | Если на коммите есть тег |
| `screenshot_base64` | string | Только `commit.get`, если файл доступен |

---

## Repository

### `repo.init`

Создаёт `.DFM/` в `workPath`.

| Args | |
|------|--|
| `author` | string, опционально |
| `dfmignore` | string, опционально |

Результат: `{success: true}`.

### `repo.switch`

Переключение ветки или коммита (detached HEAD).

| Args | |
|------|--|
| `target` | string, обязательно: имя ветки, хеш, `HEAD`, `HEAD~n` |
| `auto_stash` | bool: сохранить грязную копию (`-a`) |

Грязный worktree без `auto_stash` — ошибка. UI: диалог «stash and switch» → повтор с `auto_stash: true`.

### `repo.rebuild`

Сканирование object store (диагностика, не «пересборка БД»).

Результат: `commits_found`, `commits_rebuilt` (всегда 0), `trees_found`, `blobs_found`.

---

## Status и index

### `status.get`

Без аргументов. Источник истины для dirty/detached.

| Поле | Смысл |
|------|--------|
| `current_branch` | Текущая ветка (при detached — из состояния) |
| `head_commit` | HEAD |
| `is_detached` | bool |
| `detached_commit` | хеш при detached |
| `staged_new_files` | []string |
| `staged_modified_files` | []string |
| `staged_deleted_files` | []string |
| `unstaged_modified_files` | []string |
| `unstaged_deleted_files` | []string |
| `untracked_files` | []string |
| `renamed_files` | `{old_path, path}[]` |

Пути `.dfmignore` отфильтрованы. GUI не добавляет свои фильтры поверх, кроме UI-фильтров вида файла (расширение), если они есть в макете.

### `index.add`

| Args | |
|------|--|
| `files` | string[]; пусто или нет поля → `["."]` |

Ставит пути в index. Коммит без непустого index невозможен (бизнес-правило Forester).

Метода `index.drop` в диспетчере **нет**. Unstage в GUI не выдумывать без нового API.

---

## Commits и история

### `commit.create`

| Args | |
|------|--|
| `message` | обязательно |
| `author` | опционально |
| `amend` | bool |
| `tag` | string |

### `commit.get`

| Args | |
|------|--|
| `hash` | обязательно |

### `commit.revert` / `commit.reset`

| Args | |
|------|--|
| `commit_hash` | обязательно |
| `mode` | только reset: `soft` \| `mixed` (default) \| `hard` |

### `log.get`

| Args | Default |
|------|---------|
| `branch` | текущая / `main` |
| `max_count` | 100 |
| `path` | пусто = вся история; иначе коммиты, затрагивающие файл |

Результат: `{commits, capped, filtered}`.  
`capped: true` — есть ещё записи; GUI не показывает «showing N of M», если этого нет в макете. Догрузка — повтор с большим `max_count` или отдельный UX из спеки.

Файлового метода `commit.files` в диспетчере нет: список файлов ревизии — `diff.name_status` с `to` = хеш коммита.

---

## Branches

| Метод | Args | Ограничения |
|-------|------|-------------|
| `branch.list` | — | `{branches: [{name, commit_hash, created_at, is_current}]}`; `created_at` сейчас 0 |
| `branch.create` | `name`, опционально `commit_hash` | валидное имя; иначе HEAD / detached commit |
| `branch.delete` | `name` | нельзя удалить текущую ветку |
| `branch.rename` | `old_name`, `new_name` | новое имя свободно и валидно |

---

## Workdir

Подробно: [workdir.md](./workdir.md).

| Метод | Args | Результат |
|-------|------|-----------|
| `workdir.tree` | `path`, `depth` (default 1) | узел дерева папок |
| `workdir.entries` | `path`, `offset`, `limit` (default 200); `path: "*"` — все файлы | `{entries, total, has_more}` |
| `workdir.entries_by_paths` | `paths[]` | `{entries}` |
| `workdir.metadata` | `path` | size, mime, timestamps, для изображений width/height |
| `workdir.thumbnail` | `path` | `kind`: `image` \| `text` \| `placeholder` |
| `workdir.open` | `path`, опционально `editor` | OS default или указанный executable |
| `workdir.rename` | `path`, `new_name` (имя без `/` `\`) | `{success, new_path}` |
| `workdir.delete` | `path` | в корзину ОС |
| `workdir.search` | `query`, `limit` (default 200) | `{entries, total, capped}` |

---

## Diff и blob

Общие args для `diff.*`:

| Поле | Смысл |
|------|--------|
| `to` | обязательно: коммит (хеш / HEAD / ветка) |
| `from` | опущено — первый родитель `to`; JSON `null` — пустое дерево (весь коммит как добавления); хеш — этот коммит |

Статусы `diff.name_status`: `A` / `M` / `D` / `R` (+ `old_path` для rename).

### `diff.stat`

`{files_changed, insertions, deletions}` — insertions/deletions только по текстовым blob.

### `diff.text`

Дополнительно `path`. Результат: `{content, format: "unified", is_binary}`.  
Файл не менялся в паре from/to — ошибка `file not changed in this commit`. Слишком большой — `file_too_large` (лимит 5 MiB суммарно).

### `blob.get`

`commit` + `path` → `{content_base64, mime, size}`. Лимит 5 MiB.

---

## Compare и restore

### `compare.extract`

| Args | |
|------|--|
| `commit_hash` | обязательно |
| `cleanup` | bool: убрать tmp_review |
| `editor_path` | опционально |

Без `cleanup`: `{success, path}` — **абсолютный** filesystem path `.DFM/tmp_review`.  
Открыть файл оттуда — `workdir.open` с относительным `.DFM/tmp_review/…`.

### `restore.version`

`commit_hash` — полная перезапись workdir под дерево коммита (кроме `.DFM`).

### `restore.file`

`commit_hash` + `paths[]` — восстановить перечисленные файлы из коммита.

---

## Merge

Состояние на диске: `.DFM/MERGE_HEAD`.

### `merge.status`

Нет merge: `{in_progress: false, conflicts: []}`.  
Идёт merge: `in_progress`, `branch`, `current_head` / `from`, `target_head` / `to`, `has_conflicts`, `conflicts[]` (`path`, hashes, `kind`: `text` \| `binary`).

### `merge.start`

| Args | |
|------|--|
| `branch` | обязательно, вливаемая ветка |
| `no_ff` | bool |
| `no_commit` | bool |

Результат после команды: `{success, hash, in_progress, has_conflicts?, conflicts}`.

### `merge.continue` / `merge.abort`

Без args. `abort` → `{success: true}`. `continue` — тот же расширенный результат, что у start.

Теги объектов для merge-сценария (DELETE / RENAME / MERGE) — методы `object.*`, не поля `merge.*`.

---

## Locks

Веткa блокировок — текущая ветка репо.

| Метод | Args |
|-------|------|
| `lock.list` | — → `{locks: [{file_path, user, branch, lock_type, created_at, expires_at}]}` |
| `lock.acquire` | `file_path`, опционально `user`, `lock_type` (0 exclusive, 1 shared), `expire_hours` |
| `lock.release` | `file_path`, опционально `user` |

Пустой `user` → `$USER` или `"Unknown"`. GUI должен передавать автора из `setup.cfg`, а не полагаться на env.

---

## Objects (manifest)

Blender-объекты в `.DFM/manifests/`. GUI merge-диалог и info по объектам.

Объект: `id`, `editor_type`, `file_path`, `object_name`, `object_type`, `commit_hash`, `object_data`, `tags`, `metadata`, `created_at`, `updated_at`.

| Метод | Args |
|-------|------|
| `object.add` | поля объекта |
| `object.get` | `commit_hash`, `file_path`, `object_name` |
| `object.list_by_commit` | `commit_hash` |
| `object.list_by_file` / `objects.by_file` | `commit_hash`, `file_path` |
| `object.delete` | commit + file + name |
| `object.delete_by_file` | commit + file |
| `object.tag.add` / `object.tag.remove` | + `tag` |
| `object.metadata.set` | + metadata map |

---

## Maintenance

### `gc.run`

| Args | Default |
|------|---------|
| `dry_run` | false |
| `reflog_expire_days` | 90 |

Результат: `commits_deleted`, `trees_deleted`, `blobs_deleted`, `dry_run`.

GC в GUI не обязателен (в аддоне есть scheduled GC). Если появится в макете — этот метод.

---

## Методы, которых нет в диспетчере

Не вызывать и не эмулировать CLI:

- `index.drop`, `commit.files`
- stash / reflog / tag CRUD / hook / cherry-pick / move-to / clean как отдельные JSON-методы

Нужный сценарий → сначала метод в `dispatch.go`, потом UI.
