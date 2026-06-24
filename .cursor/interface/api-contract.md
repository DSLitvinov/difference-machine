# JSON API contract — Forester GUI

Канон **Wails ↔ `internal/jsonapi`**. GUI не дублирует VCS-логику — только вызывает методы ниже. Atom-спеки ссылаются сюда.

**Принцип:** обёртки над существующими `commands.*` (как Git CLI). Новые методы — тонкий JSON-слой, не параллельный API.

**Связанные:** [architecture.md](./architecture.md) · [paths.md](./paths.md) · [decisions.md](./decisions.md)

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
| `lock.list` | — (Forester) | lock badge; check before `restore.file` |

### 2.1 `status.get` — единственный источник VCS UI

Committable paths = union всех непустых списков (см. [sidebar-project-view.md §3.2](./sidebar-project-view.md)).

Badge priority: staged > unstaged для одного path.

### 2.2 Merge (v2)

| JSON method | CLI | GUI |
|-------------|-----|-----|
| `merge.status` | read `.DFM/MERGE_HEAD` | banner + [merge-dialog.md](./merge-dialog.md) |
| `merge.start` | `merge <branch>` | pre-merge preview |
| `merge.continue` | `merge --continue` | Merge button in dialog |
| `merge.abort` | `merge --abort` | banner action |
| `objects.by_file` | objects DB / JSON | object list in merge dialog — **канон:** `object.list_by_file` ([decisions.md §7.1](./decisions.md)) |

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

#### `object.list_by_file` (alias в docs: `objects.by_file`)

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
| `status` | `A` \| `M` \| `D` (v1.0); `R` — v2 |
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
| `workdir.entries` | Preview: immediate subfolders + files папки; **v1.0:** pagination |
| `workdir.search` | Global search по репо |
| `workdir.metadata` | Content Info: stat + mime |
| `workdir.thumbnail` | Preview / Info thumbnails — images, text snippet, `.blend` (OS cache + embedded) |
| `workdir.open` | Double-click → OS default app |

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
}
```

**Pagination (v1.0):**

```json
{ "path": "assets", "offset": 0, "limit": 200 }
→ { "entries": [...], "total": 4521, "has_more": true }
```

Default `limit`: 200.

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

- Файл ≤ 5 MB → `kind: "image"`, raw bytes в base64.
- Файл > 5 MB → `kind: "placeholder"`.

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

---

## 5. App shell (не JSON API Forester repo)

| Wails | Источник |
|-------|----------|
| `GetKnownRepos` / `AddKnownRepo` / `RemoveKnownRepo` / `OpenRepo` | `~/.dfm/setup.cfg` — [multi-repo.md](./multi-repo.md) · [settings-dialog.md §4](./settings-dialog.md) |
| `IsForesterRepository` / `InitRepository` | Проверка `.DFM` и `repo.init` — [init-repository-dialog.md](./init-repository-dialog.md) |
| `GetRepoUser` / `SetRepoUser` | `setup.cfg` `[user]` — [settings-dialog.md §3](./settings-dialog.md) |
| `settings.get` / `settings.save` | full / partial `setup.cfg` — [settings-dialog.md §8](./settings-dialog.md) |

---

## 6. UI events (не API)

| Событие | Когда |
|---------|-------|
| `onProjectViewContextChange({ selectedFolderPath, showChangedOnly })` | Клик папки Sidebar, drill-down Preview, toggle Changed |
| `onSelectionChange({ kind: 'commit', hash, branch })` | Выбор коммита в History; `branch` = `currentBranch` |
| `onSelectionChange({ kind: 'none' })` | Сброс commit selection |
| `onPreviewSelectionChange(PreviewSelection)` | File multiselect в Preview |
| `gui:open-settings` | Application menu View → Settings ([application-menu.md](./application-menu.md)) |
| `gui:switch-mode` | `"project"` \| `"history"` — Application menu или shortcut |
| `gui:toggle-sidebar` | Collapse / expand sidebar column (`⌘B`) |

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

## 8. Отложено

| Тема | Версия |
|------|--------|
| Rename `R` в `diff.name_status` | v2 |
| `diff.stat` на commit cards | v1.1 |
| `diff` rename detection | v2 |
| Fs watcher | v2 |
| Tree collapse + fully expanded tree | v1.1 / v2 |
| Branch merge UI | v2 — [merge-dialog.md](./merge-dialog.md) |
| `EvalSymlinks` для repo paths | v1.1 |
| Virtual scroll (Preview) | v1.1 |
| Init repository wizard | v1.1 |
