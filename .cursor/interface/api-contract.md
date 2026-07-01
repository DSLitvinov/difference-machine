# JSON API contract — Forester GUI

Канон **Wails ↔ `internal/jsonapi`**. GUI не дублирует VCS-логику — только вызывает методы ниже. Atom-спеки ссылаются сюда.

**Принцип:** обёртки над существующими `commands.*` (как Git CLI). Новые методы — тонкий JSON-слой, не параллельный API.

**Связанные:** [architecture.md](./architecture.md) · [paths.md](./paths.md) · [decisions.md](./decisions.md) · [vcs-gui-coverage.md](./vcs-gui-coverage.md) (аудит покрытия GUI)

---

## 1. Транспорт

```ts
// Wails: все вызовы через repo session или repo_path в args
ForesterCall(repoPath: string, method: string, args: object): Promise<unknown>
```

Существующие методы см. `sources/forester/internal/jsonapi/dispatch.go`.

---

## 2. VCS — уже есть

| JSON method | Git-аналог | GUI |
|-------------|------------|-----|
| `status.get` | `git status` (lists) | badges, Changed filter, committable |
| `index.add` | `git add` | Create commit pre-step |
| `commit.create` | `git commit` | Create commit dialog |
| `commit.get` | `git show` (meta) | commit card, preview header (`screenshot_path`) |
| `commit.revert` | `git revert` | Commit card ⋮ |
| `commit.reset` | `git reset` | Commit card ⋮ |
| `log.get` | `git log` | Sidebar History; **+ `path` filter** (см. §3) |
| `branch.list` | `git branch` | History branch selector |
| `branch.create` | `git branch <name>` | History **Create new branch…** — [create-branch-dialog.md](./create-branch-dialog.md) |
| `compare.extract` | worktree extract | Content Info Compare, card menu |
| `restore.version` | restore whole tree | Card menu «Restore this version» |
| `lock.list` | — (Forester) | lock badge (Content Preview + Content Info); check before `restore.file` |

### 2.1 `status.get` — единственный источник VCS UI

Committable paths = union всех непустых списков (см. [sidebar-project-view.md §3.2](./sidebar-project-view.md)).

Badge priority: staged > unstaged для одного path.

Detached HEAD: `is_detached`, `detached_commit`; `head_commit` = checked-out commit (detached or branch tip). State file: `.DFM/DETACHED_HEAD`.

### 2.2 Merge

| JSON method | CLI | GUI |
|-------------|-----|-----|
| `merge.status` | read `.DFM/MERGE_HEAD` | banner + [merge-dialog.md](./merge-dialog.md) |
| `merge.start` | `merge <branch>` | pre-merge preview |
| `merge.continue` | `merge --continue` | Merge button in dialog |
| `merge.abort` | `merge --abort` | banner action |
| `object.list_by_file` | manifest store | object list in merge dialog |

#### `merge.status`

```json
→ {
  "in_progress": true,
  "branch": "feature/ui",
  "current_head": "abc…",
  "target_head": "def…",
  "has_conflicts": false
}
```

#### `object.list_by_file`

```json
{ "path": "assets/scene.blend", "commit_hash": "abc…" }
→ { "objects": [{ "object_name", "object_type", "tags", "metadata" }] }
```

Реализовано в `dispatch.go` как `object.list_by_file`. См. [merge-dialog.md §5–§6](./merge-dialog.md).

---

## 3. VCS — новые обёртки

### 3.1 `diff.name_status`

**CLI:** `diff <from> <to> --name-status`  
**Git-аналог:** `git diff-tree --name-status` / `git show --name-status`

```json
// args — initial commit: from = null (empty tree baseline)
{ "from": "<parent_hash> | null", "to": "<commit_hash>" }

// result
{
  "files": [
    { "status": "A", "path": "assets/new.png" },
    { "status": "M", "path": "src/app.tsx" },
    { "status": "D", "path": "old/data.bin" }
  ]
}
```

| Правило | Значение |
|---------|----------|
| `from` | **first parent** коммита (merge — как в History spec); **`null`** = initial commit (empty baseline) |
| `to` | hash выбранного коммита |
| `status` | `A` \| `M` \| `D` \| `R` |
| `path` | relative `/` |

History Preview: список changed files. Commit card stats: **v1.1** — `diff.stat` (§3.2); v1.0 строка stats **скрыта** ([decisions.md §5](./decisions.md)).

### 3.2 `diff.stat` (v1.1)

**CLI:** `diff <from> <to> --stat`

v1.0: используется только в **PreviewCommitHeader** после выбора коммита (один вызов). Не на каждой commit card.

```json
{ "from": "...", "to": "..." }
→ { "files_changed": 7, "insertions": 12, "deletions": 12 }
```

### 3.3 `diff.text`

**CLI:** `diff <from> <to> --unified [-- path]`

```json
{
  "from": "<parent_hash>",
  "to": "<commit_hash>",
  "path": "src/app.tsx",
  "unified": true
}
→ { "content": "...", "format": "unified", "is_binary": false }
```

Ответ > **5 MB** → error `file_too_large` ([decisions.md §7.7](./decisions.md)).

Split layout в UI — клиент режет unified (v1).

### 3.4 `blob.get`

**CLI:** show / storage read `<commit>:<path>`

```json
{ "commit": "<hash>", "path": "assets/tex.png" }
→ { "content_base64": "...", "mime": "image/png", "size": 12345 }
```

Image diff: два вызова (`from` parent, `to` commit).

### 3.5 `restore.file`

**CLI:** `restore --source=<commit> <path>…`

```json
{
  "commit_hash": "abc…",
  "paths": ["assets/scene.blend"]
}
```

Перед вызовом: `lock.list` — блок если чужой lock; свой lock — разрешено.

**Не путать с** `restore.version` (весь коммит).

### 3.6 `log.get` — расширение

Существующий метод + optional filter:

```json
{
  "branch": "main",
  "max_count": 100,
  "path": "assets/scene.blend"
}
```

Default `max_count`: **100** (если `<= 0` в backend). UI hint при cap: «Showing latest 100 commits».

Backend: коммиты ветки, где **blob hash файла** изменился (parent tree vs commit tree). Git-аналог: `git log -- <path>`.

Content Info History — commit combobox.

---

## 4. Workdir (FS, не VCS)

| JSON method | Назначение |
|-------------|------------|
| `workdir.tree` | Sidebar: папки only, recursive `item_count`; **v1.0:** lazy `depth` ([decisions.md §7.6](./decisions.md)) |
| `workdir.entries` | Preview: immediate subfolders + files папки; **v1.0:** pagination; файлы: `modified`, `created` |
| `workdir.entries_by_paths` | Preview Changed ON: `DirEntry[]` по списку paths с timestamps |
| `workdir.search` | Global search по репо |
| `workdir.metadata` | Content Info: stat + mime |
| `workdir.thumbnail` | Preview / Info thumbnails — images, text snippet, `.blend` (OS cache + embedded) |
| `workdir.open` | Double-click → OS default app; optional `editor` path |
| `workdir.rename` | Rename file in workdir (context menu) |
| `workdir.delete` | Move file to OS Trash / Recycle Bin (context menu) |

### 4.0 Workdir scan exclusions (все методы §4)

Реализация: `sources/forester/internal/jsonapi/workdir_scan.go` → `shouldSkipName`.

GUI **не фильтрует** на frontend — backend не возвращает исключённые пути.

| Исключение | Поведение |
|------------|-----------|
| `.DFM/` (каталог) | Не в tree / entries / search; обход `SkipDir` |
| **`.dfmignore` (файл в корне)** | **Никогда не показывать** в tree / entries / search (служебный файл репо) |
| Пути из `.dfmignore` | Не показывать (паттерны `utils.Patterns`) |
| Symlinks | Не follow (v1.0) |

Затронутые методы: `workdir.tree`, `workdir.entries`, `workdir.search`, recursive `item_count`.

Тест: `TestWorkdirTreeAndEntries` — entries и search не содержат `.dfmignore`.

### 4.1 `workdir.tree`

См. [architecture.md §4.2](./architecture.md).

**v1.0 (lazy):**

```json
{ "path": "", "depth": 1 }
```

`depth` — глубина от `path` (default `1`). Children без вложенных `children` до expand / следующего запроса с `path` узла.

**v1.1:** optional full tree (как в architecture §4.2) для малых репо.

### 4.2 `workdir.entries`

```go
type DirEntry struct {
    Name      string `json:"name"`
    Path      string `json:"path"`        // relative /
    IsDir     bool   `json:"is_dir"`
    ItemCount int    `json:"item_count"`  // folders: recursive files
    Size      int64  `json:"size"`        // files only
    Modified  int64  `json:"modified,omitempty"` // files only; ModTime Unix sec
    Created   int64  `json:"created,omitempty"`  // files only; birth time if OS provides
}
```

Поля `modified` / `created` возвращаются для **файлов** в `workdir.entries`, `workdir.search`, `workdir.entries_by_paths`. Для папок — опущены. `created` — через `fileCreatedUnix` (macOS: birth time; иначе может отсутствовать).

**Pagination (v1.0):**

```json
{ "path": "assets", "offset": 0, "limit": 200 }
→ { "entries": [...], "total": 4521, "has_more": true }
```

Default `limit`: 200.

**All files (`path: "*"`):** recursive flat list **всех файлов** репозитория (без папок), с той же пагинацией. UI: Sidebar **All files** → Content Preview.

Стат по списку repo-relative paths (без пагинации). Используется Content Preview при **Changed ON** — flat list committable с timestamps для сортировки по дате.

```json
{ "paths": ["assets/a.png", "src/main.go"] }
→ { "entries": [ /* DirEntry[], files only */ ] }
```

- Несуществующие paths **пропускаются** (не error).
- Недоступные / невалидные paths (пустой path, `.DFM/`, ignore) **пропускаются** per-path — один bad path не ломает весь batch.
- Директории в `paths` **пропускаются**.

Реализация: `sources/forester/internal/jsonapi/workdir_scan.go` → `entriesForPaths`.

### 4.3 `workdir.thumbnail`

```json
{ "path": "assets/scene.blend" }
```

**Request:** repo-relative `path` (forward slashes).

**Response** — discriminated union по `kind`:

| `kind` | Поля | Когда |
|--------|------|-------|
| `image` | `mime`, `content_base64` | Raster image или успешный `.blend` preview (PNG) |
| `text` | `mime`, `text_preview` | Текстовый файл ≤ 32 KB UTF-8 (обрезка ~2000 runes) |
| `placeholder` | `mime` | Неподдерживаемый тип, слишком большой файл, нет превью |

Лимит `content_base64`: **5 MB** decoded (как `blob.get`).

#### 4.3.1 Raster images

Расширения: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.exr`, `.tiff`, `.tif`, `.bmp`.

- Файл ≤ 64 MiB → **ffmpeg** масштабирует до max edge 512px → `kind: "image"`, PNG в base64.
- Файл > 64 MiB или ffmpeg недоступен → `kind: "placeholder"`.

**ffmpeg resolution order** (backend `resolveFFmpegPath` / GUI `EnsureFFmpegEnv`):

1. `DFM_FFMPEG_PATH` env
2. `[forester] ffmpeg_path` or sibling of `[forester] path` in `~/.dfm/setup.cfg`
3. Bundled `bin/ffmpeg` next to Forester / GUI executable
4. macOS Homebrew: `/opt/homebrew/bin/ffmpeg`, `/usr/local/bin/ffmpeg`
5. `PATH` (`exec.LookPath`)

Release builds bundle ffmpeg in `bin/` (Windows/Linux via BtbN; macOS via Homebrew at build time). Без ffmpeg raster previews показывают stub icon.

Реализация: `workdir_thumbnail_ffmpeg.go`.

#### 4.3.2 `.blend` — Blender thumbnails (cross-platform)

Blender сохраняет превью по [Freedesktop Thumbnail Managing Standard](https://specifications.freedesktop.org/thumbnail-spec/latest-single/). Backend **не рендерит** Blender — только читает уже существующие кэши и встроенное превью в файле.

**Lookup order:**

1. **OS thumbnail cache** — PNG `{md5(uri)}.png` в `large/`, затем `normal/`:
   - **Windows / macOS:** `%USERPROFILE%\.thumbnails\` / `~/.thumbnails/`
   - **Linux:** `$XDG_CACHE_HOME/thumbnails/` или `~/.cache/thumbnails/`; fallback `~/.thumbnails/`
2. **Embedded preview** — блок `TEST` в `.blend` (поддержка gzip; без zstd → skip)

**URI для MD5** (как `uri_from_filepath` в `blender/imbuf/intern/thumbs.cc`):

| OS | Формат |
|----|--------|
| Unix | `file://` + absolute path (`file:///home/user/scene.blend`) |
| Windows | `file:///` + `C:/...` (drive letter **uppercase**, `\` → `/`) |
| UNC | `file://server/share/...` |

URI экранируется glib-правилом `UNSAFE_PATH` (пробелы → `%20`, `/` в path не экранируется). MD5 считается от **escaped URI string**, не от содержимого файла.

Canonical path перед URI: `filepath.Abs` + `Clean` + `EvalSymlinks` (если доступен); на Windows — uppercase drive letter.

Успех → `kind: "image"`, `mime: "image/png"`, `content_base64`.

**UI:** [file-preview-item.md](./file-preview-item.md) (`object-cover` / `object-contain` для blend) · [info-file-preview-single.md](./info-file-preview-single.md) (`object-contain`).

**Нет превью:** `kind: "placeholder"` — stub icon в grid и Info.

**Предусловие:** файл сохранён в Blender с включённым «Save Preview Images»; иначе кэш пуст и embedded `TEST` может отсутствовать.

Реализация: `sources/forester/internal/jsonapi/blend_thumbnail.go`.

### 4.4 `workdir.open`

```json
{ "path": "assets/scene.blend" }
{ "path": "readme.txt", "editor": "/usr/bin/code" }
```

| Поле | Обязательно | Описание |
|------|-------------|----------|
| `path` | да | Repo-relative path |
| `editor` | нет | Abs path к executable; если задан — запуск `editor <absPath>` |

Без `editor`: OS default handler (`open` / `xdg-open` / `start`). Реализация: `workdir_open.go`.

**UI:** double-click → [File Viewer](./file-viewer.md); submenu **Edit in:** в context menu и Content Info (fileViewer) — список из `appStore.externalEditorPaths` ([settings-dialog.md §6](./settings-dialog.md)).

### 4.5 `workdir.rename`

```json
{ "path": "assets/old.png", "new_name": "new.png" }
→ { "success": true, "new_path": "assets/new.png" }
```

| Правило | Описание |
|---------|----------|
| `new_name` | Только имя файла (basename), без `/` или `\` |
| Коллизия | Error если целевой путь уже существует |
| Scope | Только файлы; `.DFM/`, `.dfmignore`, ignored paths — reject |

После успеха GUI: `bumpWorkdirGeneration`, refresh `status.get`, обновить selection по `new_path`.

### 4.6 `workdir.delete`

```json
{ "path": "assets/scene.blend" }
→ { "success": true }
```

**Не** permanent `unlink` — файл перемещается в корзину ОС:

| OS | Механизм |
|----|----------|
| **macOS** | Finder Trash (`osascript`) |
| **Windows** | Recycle Bin (`SendToRecycleBin`) |
| **Linux** | `gio trash` → `trash-put` → freedesktop `~/.local/share/Trash/` |

Реализация: `workdir_trash.go`. Заблокировано для `deleted` / `staged-deleted` и locked files (UI).

---

## 5. App shell (не JSON API Forester repo)

| Wails | Источник |
|-------|----------|
| `GetKnownRepos` / `AddKnownRepo` / `RemoveKnownRepo` / `OpenRepo` / `CloseRepository` | `~/.dfm/setup.cfg` — [multi-repo.md](./multi-repo.md) · [settings-dialog.md §4](./settings-dialog.md) |
| `IsForesterRepository` / `InitRepository` | Проверка `.DFM` и `repo.init` — [init-repository-dialog.md](./init-repository-dialog.md) |
| `GetRepoUser` / `SetRepoUser` | `setup.cfg` `[user]` — [settings-dialog.md §3](./settings-dialog.md) |
| `settings.get` / `settings.save` | full / partial `setup.cfg` — [settings-dialog.md §8](./settings-dialog.md) |

---

## 6. UI events (не API)

| Событие | Когда |
|---------|-------|
| `onProjectViewContextChange({ selectedFolderPath, showChangedOnly })` | Клик **All files** / папки (Sidebar или Preview), drill-down, **toggle Changed в Preview** |

**`selectedFolderPath`:** `'*'` = All files (flat grid всех файлов репо); иначе relative path папки (`assets/foo`). Значение `''` в UI не используется — зарезервировано для tree API root.
| `onSelectionChange({ kind: 'commit', hash, branch })` | Выбор коммита в History; `branch` = `currentBranch` |
| `onSelectionChange({ kind: 'none' })` | Сброс commit selection |
| `onPreviewSelectionChange(PreviewSelection)` | File multiselect в Preview |
| `gui:open-settings` | Application menu View → Settings ([application-menu.md](./application-menu.md)) |
| `gui:switch-mode` | `"project"` \| `"history"` — Application menu или shortcut |
| `gui:toggle-sidebar` | Collapse / expand sidebar column (`⌘B`) |
| `workdir:changed` | Go `fsnotify` на repo workdir (skip `.DFM`) → debounced refresh status + tree (Project) |

**Нет** `kind: 'folder'` в `onSelectionChange` — папка только через `ProjectViewContext`.

При смене `selectedFolderPath` → `PreviewSelection = { kind: 'none' }`.

При смене rail Project ↔ History → сброс Preview/commit selection; **persist** `selectedFolderPath`, `showChangedOnly` per repo. `currentBranch` — из `branch.list` (`is_current`), не из localStorage.

---

## 7. Реализация (порядок)

См. также vertical slices: [decisions.md §4](./decisions.md).

1. Wails bootstrap (`sources/gui/`) + `paths` + multi-repo cfg — **параллельно** с п.2  
2. `workdir.tree` (lazy) / `workdir.entries` (pagination) / `workdir.open`  
3. `diff.name_status` / `diff.text` / `blob.get`  
4. `log.get` + `path`  
5. `restore.file`  
6. Shell + panels UI (slices 1→5)  

Все новые методы — в `jsonapi` (тесты как `integration_test.go`).

---

## 8. Status Notes

| Тема | Статус |
|------|--------|
| Rename `R` в `diff.name_status` | Реализовано |
| `diff.stat` на commit cards | Реализовано |
| Fs watcher | Реализовано: `workdir:changed` из `sources/gui/internal/workdirwatch` |
| Branch merge UI | Реализовано — [merge-dialog.md](./merge-dialog.md) |
| Init repository wizard | Реализовано |
| Tree collapse / large repo behavior | Реализовано частично; perf polish tracked in [implementation-plan-v2.md](./implementation-plan-v2.md) |
| `EvalSymlinks` для repo paths | Backlog polish |
| Virtual scroll edge cases | Backlog polish |
