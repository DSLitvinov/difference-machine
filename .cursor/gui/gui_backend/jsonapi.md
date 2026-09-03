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

### Ошибки envelope

GUI показывает `error` как есть (toast или диалог). Пустой `error` → `request failed`. Не переводить и не склеивать с именем метода.

| Строка (или префикс) | Методы | Смысл |
|----------------------|--------|--------|
| `invalid session handle` | любой `Call` | нет сессии |
| `invalid args JSON` | любой | аргументы не JSON |
| `unknown method: {name}` | любой | нет в `dispatch.go` |
| `not a Forester repository` | Open, workdir, reflog, … | нет `.DFM/` |
| `commit_hash is required` / `hash is required` / `path is required` / `files` / `paths` / `branch name is required` | мутации | валидация args; GUI не должна доходить до этого |
| `commit not found` | commit/restore/reflog/diff | нет объекта |
| `failed to get reflog` / `failed to restore commit` | `reflog.*` | Recover: в диалоге |
| `cannot delete current branch` | `branch.delete` | UI блокирует заранее |
| `branch '…' already exists` / `branch '…' not found` / `invalid branch name` | `branch.*` | toast, диалог открыт |
| `no commits to branch from` | `branch.create` | toast |
| `a file already exists at …` / `new_name must not contain path separators` / `invalid new_name` | `workdir.rename` | toast |
| `path is a directory` / `not an image` / `file_too_large` | `workdir.file` / thumbnail | панель превью |
| `screenshot_too_large` | `commit.get` | без скрина |
| `failed to acquire lock. File may be already locked` | `lock.acquire` | toast |
| `ffmpeg not found` | thumbnail видео | placeholder |
| `internal error: …` | panic в handler | toast / диалог; не глотать |
| uncommitted / stash / dirty | `repo.switch` | диалог Switch dirty |

Поверхности GUI: [dialogs](../dialogs/architecture.md#ошибки), [states](../states/architecture.md#ошибки-и-уведомления).

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

Грязный worktree без `auto_stash` — ошибка. UI: диалог «stash and switch» → повтор с `auto_stash: true`. GUI не восстанавливает auto-stash при возврате на ветку (`--keep-stash`): список остаётся на **исходной** ветке до `stash.apply` / `stash.drop`.

### `repo.rebuild`

Сканирование object store (диагностика, не «пересборка БД»).

Результат: `commits_found`, `commits_rebuilt` (всегда 0), `trees_found`, `blobs_found`, `damaged` (HEAD commit или его tree не читаются).

GUI: меню Repository → **Verify repository** (группа с Recover, после Create/Add); кнопка на [DFM Damaged](../views/project-browse.md). Диалог: [maintenance](../dialogs/maintenance.md). Порядок меню — [header-window](../components/items/header-window.md).

**Clean repository** (меню окна, отдельная группа после Recover) — не метод JSON API. GUI удаляет каталог `.DFM/` после `Close`. См. [maintenance](../dialogs/maintenance.md), [header-window](../components/items/header-window.md).

### `reflog.get`

История refs (потерянные / soft-delete коммиты).

| Args | Default |
|------|---------|
| `ref` | все ветки |
| `limit` | 100 |

Результат: `entries[]` с `commit_hash`, `ref_name`, `operation`, `old_value`, `new_value`, `timestamp`, `exists` (объект коммита ещё в store).

GUI: меню Repository → **Recover commit** (группа с Verify). Диалог: [maintenance](../dialogs/maintenance.md).

### `reflog.restore`

Снимает пометки `delete` для `commit_hash` и делает `commit.reset` `mode: mixed` на этот hash. Коммит должен существовать в object store.

| Args | |
|------|--|
| `commit_hash` | обязательно |

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
| `renamed_files` | `{old_path, path}[]` — GUI: [FileStatusBadge](../components/badge-file-status.md) `rename` (**R**, `#a855f7`). Парится по хешу: staged new **или untracked** с deleted. После pairing path уходит из `untracked_files` / `staged_new_files` / deleted. |
| `damaged` | bool: HEAD commit или его tree не читаются из object store. GUI: [DFM Damaged](../views/project-browse.md) |

Пути `.dfmignore` отфильтрованы из `status.get`. Каталог: `workdir.entries` / `search` скрывают их, пока GUI не включит **View ignored** (`include_ignored`). UI-фильтр вида файла (расширение) — поверх каталога, без API.

### `index.add`

| Args | |
|------|--|
| `files` | string[]; пусто или нет поля → `["."]` |

Ставит пути в index. Коммит без непустого index невозможен (бизнес-правило Forester).

GUI: пункт **Append** в [Popover (File Preview Item)](../components/popovers/file-preview-item.md) — только `index.add`, композер не открывать. Композер открывают **Commit All Files**, **Create commit** в том же popover и кнопка Create commit на Select More Files.

### `index.drop`

| Args | |
|------|--|
| `files` | string[]; обязательно, непусто |

Убирает пути из index (unstage). CLI: `restore --staged`. Файл на диске не трогает. Не в index → ошибка.

GUI: пункт **Undo append** в [Popover (File Preview Item)](../components/popovers/file-preview-item.md). Disabled, если path нет в `staged_new_files` / `staged_modified_files` / `staged_deleted_files`.

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

Вызывать при открытии inspect / для screenshot, не на каждую карточку в списке. Ответ — memory LRU по hash.

### `commit.revert` / `commit.reset`

| Args | |
|------|--|
| `commit_hash` | обязательно |
| `mode` | только reset: `soft` \| `mixed` (default) \| `hard` |

### `commit.delete_file`

Убрать path из снимка коммита и всех потомков на текущей ветке. Workdir не трогает (не `workdir.delete`).

| Args | |
|------|--|
| `commit_hash` | обязательно |
| `path` | обязательно, rel с `/` |

Результат: `{success, hash}` — новый хеш переписанного целевого коммита. GUI после успеха: `resetRevisionCache`, `log.get`, выбрать `hash`.

Файл не в дереве коммита (`D` в `name_status`) — ошибка. Во время merge / detached HEAD — ошибка. Destructive — подтверждение из [диалога](../dialogs/architecture.md).

### `log.get`

| Args | Default |
|------|---------|
| `branch` | текущая / `main` |
| `max_count` | 100 |
| `path` | пусто = вся история; иначе коммиты, затрагивающие файл |

Результат: `{commits, capped, filtered}`.  
`capped: true` — есть ещё записи; GUI не показывает «showing N of M». Догрузка — повтор с большим `max_count` (отдельного `offset` нет). Каталог ≠ payload: `diff.stat` / `blob.get` не вызывать на всю страницу. [revision-cache.md](../gui_frontend/revision-cache.md).

Файлового метода `commit.files` в диспетчере нет: список файлов ревизии — `diff.name_status` с `to` = хеш коммита.

---

## Stash

### `stash.list`

| Args | Default |
|------|---------|
| `branch` | текущая ветка |

Каталог stash из `.DFM/stash/` (не `status.get.staged_*`). Auto-stash при dirty switch принадлежит **исходной** ветке, не целевой. Записи без `branch` показываются на любой вкладке.

Результат: `{stashes: [{hash, message, tree_hash, branch, created_at}]}`.  
`created_at` — Unix seconds. Сортировка — `created_at` по убыванию.

GUI рисует [StageCard](../components/atoms/card-stage.md): заголовок `Stash №N` на текущей ветке, описание = `message`. `diff.stat` на hash stash не вызывать.

JSON `repo.switch` не восстанавливает auto-stash при возврате на ветку — список остаётся, apply/drop из меню карточки.

### `stash.apply`

| Args | |
|------|--|
| `hash` | обязательно |

Восстанавливает дерево stash в workdir. Запись остаётся в списке.

### `stash.drop`

| Args | |
|------|--|
| `hash` | обязательно |

Удаляет stash. Destructive в GUI — подтверждение.

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
| `workdir.entries` | `path`, `offset`, `limit` (default 200); `include_ignored` (bool); `path: "*"` — все файлы | `{entries, total, has_more}` |
| `workdir.entries_by_paths` | `paths[]` | `{entries}` |
| `workdir.metadata` | `path` | size, mime, timestamps, для изображений width/height |
| `workdir.thumbnail` | `path` | `kind`: `image` (картинка, в т.ч. SVG как `image/svg+xml`; кадр видео; PNG из `.blend`) \| `text` \| `placeholder`. Кадр видео — тот же `kind: image`, не отдельный kind. Подробно: [thumbnails.md](./thumbnails.md) |
| `workdir.file` | `path` | полный кадр `{content_base64, mime, size}`; только изображения (растр и SVG); Content View файла, не сетка/info |
| `workdir.open` | `path`, опционально `editor` | OS default или указанный executable; macOS `.app` — `open -a` |
| `workdir.rename` | `path`, `new_name` (имя без `/` `\`) | `{success, new_path}` |
| `workdir.delete` | `path` | в корзину ОС |
| `workdir.search` | `query`, `limit` (default 200), `include_ignored` (bool) | `{entries, total, capped}` |
| `workdir.ignore` | `paths[]` | дописать path в `.dfmignore` (папка — с `/`); `{success: true}` |
| `workdir.unignore` | `paths[]` | убрать эти строки из `.dfmignore`; `{success: true}` |
| `workdir.dfmignore.get` | — | `{content}` — весь корневой `.dfmignore`; нет файла → `""` |
| `workdir.dfmignore.set` | `content` | заменить `.dfmignore`; `{success: true}` |

---

## Diff и blob

Общие args для `diff.*`:

| Поле | Смысл |
|------|--------|
| `to` | обязательно: коммит (хеш / HEAD / ветка) |
| `from` | опущено — первый родитель `to`; JSON `null` — пустое дерево (весь коммит как добавления); хеш — этот коммит |

Статусы `diff.name_status`: `A` / `M` / `D` / `R` (+ `old_path` для rename). GUI letter-бейдж: [FileStatusBadge](../components/badge-file-status.md) (`A`→`appended`, `M`→`modified`, `D`→`delete`, `R`→`rename`). `N` (`new`) только из `status.get.untracked_files`, не из `name_status`. Ignored (**i**) не из diff — из `entry.ignored` при View ignored.

### `diff.stat`

`{files_changed, insertions, deletions}` — insertions/deletions только по текстовым blob.  
GUI: лениво для **видимых** карточек, ключ hash (+ `path` в File view). Не после `log.get` на всю страницу.

### `diff.text`

Дополнительно `path`. Результат: `{content, format: "unified", is_binary}`.  
Файл не менялся в паре from/to — ошибка `file not changed in this commit`. Слишком большой — `file_too_large` (лимит 5 MiB суммарно). Только выбранный path.

### `blob.get`

`commit` + `path` → `{content_base64, mime, size}`. Лимит 5 MiB. Memory LRU, не `.DFM/cache/thumbs/`. Только выбранный path.

Ленивость слоёв: [revision-cache.md](../gui_frontend/revision-cache.md).

---

## Compare и restore

### `compare.extract`

| Args | |
|------|--|
| `commit_hash` | обязательно |
| `cleanup` | bool: убрать tmp_review. GUI **Clean temporary folder** |
| `editor_path` | опционально: открыть .blend из extract в этом executable |
| `open` | bool: после extract открыть `.DFM/tmp_review` в файловом менеджере ОС. GUI **Compare with working tree**. Не вместе с `cleanup`. Не ставить при Compare **файла** (там `workdir.open` конкретного path) |

GUI Compare **файла** (не папки): шапка [commit-diff-*](../components/items/commit-diff-text.md) — extract без `open`, затем `workdir.open` `.DFM/tmp_review/…`.

Без `cleanup`: `{success, path}` — **абсолютный** filesystem path `.DFM/tmp_review`.  
Открыть файл оттуда — `workdir.open` с относительным `.DFM/tmp_review/…`.  
Открыть папку целиком — `open: true` на этом методе (не отдельный диалог).

### `restore.version`

`commit_hash` — полная перезапись workdir под дерево коммита (кроме `.DFM`).

### `restore.file`

`commit_hash` + `paths[]` — восстановить перечисленные файлы из коммита.

GUI: один текущий path с шапки [commit-diff-*](../components/items/commit-diff-text.md) и пункта [File in Commit](../components/popovers/file-in-commit.md). Destructive — [диалог](../dialogs/architecture.md).

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

GUI: вкладка Settings → Garbage collection [`6056:12410`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=6056-12410). Поля из `setup.cfg` `[gc]` (тот же файл, что у аддона): `enabled`, `reflog.expire.days`, `schedule.enabled`, `interval.day`, `schedule.hour`, `schedule.minute`. Автозапуск — таймер Wails, если `schedule.enabled`, прошло `interval.day` с `last.run`, и время ≥ `schedule.hour`:`schedule.minute`.

---

## Методы, которых нет в диспетчере

Не вызывать и не эмулировать CLI:

- `commit.files`
- stash save / pop, tag CRUD / hook / cherry-pick / move-to / clean как отдельные JSON-методы

Нужный сценарий → сначала метод в `dispatch.go`, потом UI.
