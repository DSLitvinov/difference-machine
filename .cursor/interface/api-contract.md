# JSON API contract — Forester GUI

Канон **Wails ↔ `internal/jsonapi`**. GUI не дублирует VCS-логику — только вызывает методы ниже. Atom-спеки ссылаются сюда.

**Принцип:** обёртки над существующими `commands.*` (как Git CLI). Новые методы — тонкий JSON-слой, не параллельный API.

**Связанные:** [architecture.md](./architecture.md) · [paths.md](./paths.md)

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
| `objects.by_file` | objects DB / JSON | object list in merge dialog |

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

#### `objects.by_file`

```json
{ "path": "assets/scene.blend", "commit_hash": "abc…" }
→ { "objects": [{ "object_name", "object_type", "tags", "metadata" }] }
```

См. [merge-dialog.md §5–§6](./merge-dialog.md).

---

## 3. VCS — новые обёртки

### 3.1 `diff.name_status`

**CLI:** `diff <from> <to> --name-status`  
**Git-аналог:** `git diff-tree --name-status` / `git show --name-status`

```json
// args
{ "from": "<parent_hash>", "to": "<commit_hash>" }

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
| `from` | **first parent** коммита (merge — как в History spec) |
| `to` | hash выбранного коммита |
| `status` | `A` \| `M` \| `D` (v1); `R` — когда backend добавит rename detect |
| `path` | relative `/` |

History Preview: список changed files. Commit card stats: опционально `diff.stat` (§3.2).

### 3.2 `diff.stat` (optional v1)

**CLI:** `diff <from> <to> --stat`

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
  "max_count": 500,
  "path": "assets/scene.blend"
}
```

Backend: коммиты ветки, где **blob hash файла** изменился (parent tree vs commit tree). Git-аналог: `git log -- <path>`.

Content Info History — commit combobox.

---

## 4. Workdir (FS, не VCS)

| JSON method | Назначение |
|-------------|------------|
| `workdir.tree` | Sidebar: папки only, recursive `item_count` |
| `workdir.entries` | Preview: immediate subfolders + files папки |
| `workdir.search` | Global search по репо |
| `workdir.metadata` | Content Info: stat + mime |
| `workdir.thumbnail` | Preview / Info thumbnails (v1: placeholder ok) |
| `workdir.open` | Double-click → OS default app |

### 4.1 `workdir.tree`

См. [architecture.md §4.2](./architecture.md).

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

---

## 5. App shell (не JSON API Forester repo)

| Wails | Источник |
|-------|----------|
| `GetKnownRepos` / `AddKnownRepo` / `RemoveKnownRepo` / `OpenRepo` | `~/.dfm/setup.cfg` — [multi-repo.md](./multi-repo.md) · [settings-dialog.md §4](./settings-dialog.md) |
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

**Нет** `kind: 'folder'` в `onSelectionChange` — папка только через `ProjectViewContext`.

При смене `selectedFolderPath` → `PreviewSelection = { kind: 'none' }`.

При смене rail Project ↔ History → сброс Preview/commit selection; **persist** `selectedFolderPath`, `showChangedOnly` per repo. `currentBranch` — из `branch.list` (`is_current`), не из localStorage.

---

## 7. Реализация (порядок)

1. `paths` + multi-repo cfg  
2. `workdir.*`  
3. `diff.name_status` / `diff.text` / `blob.get`  
4. `log.get` + `path`  
5. `restore.file`  
6. Shell + panels UI  

Все новые методы — в `jsonapi` (тесты как `integration_test.go`).

---

## 8. Отложено (не v1)

| Тема | Версия |
|------|--------|
| Rename `R` в `diff.name_status` | backend similarity |
| `diff` rename detection | как `git diff -M` |
| Fs watcher | v2 |
| Tree collapse | v2 |
| Branch merge UI | v2 — [merge-dialog.md](./merge-dialog.md) |
| `EvalSymlinks` для repo paths | v1.1 |
