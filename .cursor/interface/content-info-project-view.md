# Content Info — Project view

Правая панель **Content Info** в режиме **Project view**: детали выбранных в Content Preview файлов, History, Metadata, создание коммита.

**Figma (shadcn kit):** [Panel single `4027:5041`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4027-5041) · [Panel multi `4037:1898`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4037-1898)

**Цвета:** [design-tokens.md](./design-tokens.md) §3.6

**Стек:** Wails + React + shadcn/ui

**Связанные документы:** [architecture.md](./architecture.md) · [content-preview-project-view.md](./content-preview-project-view.md) · [file-preview-item.md](./file-preview-item.md)

**Atom specs:**

| Компонент | Документ |
|-----------|----------|
| Single preview | [info-file-preview-single.md](./info-file-preview-single.md) |
| Multi preview stack | [info-file-preview-multi.md](./info-file-preview-multi.md) |
| Multi preview tile | [info-file-preview-tile.md](./info-file-preview-tile.md) |
| Metadata | [info-metadata-section.md](./info-metadata-section.md) |
| History | [info-history-section.md](./info-history-section.md) |
| Create commit dialog | [create-commit-dialog.md](./create-commit-dialog.md) |

---

## 1. Назначение и layout

### 1.1 Режимы окна

| Режим | Content Info |
|-------|----------------|
| **Project view** | Видна (третья колонка) |
| **History** | **Скрыта** — Preview на всю ширину |

```
┌──────────┬─────────────────────────────┬──────────────┐
│ Sidebar  │  Content Preview            │ Content Info │
│          │                             │  ~354px      │
└──────────┴─────────────────────────────┴──────────────┘
```

### 1.2 Вход

`onPreviewSelectionChange` из [content-preview-project-view.md §9.4](./content-preview-project-view.md):

```ts
type PreviewSelection =
  | { kind: 'none' }
  | { kind: 'file'; path: string; vcsStatus?: VcsFileStatus }
  | { kind: 'files'; paths: string[] }
```

| Selection | Layout |
|-------------|--------|
| `none` | Empty state §6.1 |
| `file` (1 path) | Single panel [`4027:5041`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4027-5041) |
| `files` (2+) | Multi panel [`4037:1898`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4037-1898) |

Папки не эмитят selection — Content Info не реагирует на drill-down папок.

### 1.3 Зафиксированные решения

| # | Тема | Решение |
|---|------|---------|
| 1 | Ширина | Default **354px**; **resizable**; min **280px** |
| 2 | Preview types | text → stub; binary → другая stub; image → preview; blend → `GetThumbnail` или stub |
| 3 | Badges | status = VCS; lock = Forester lock (`lock.list`) |
| 4 | File name row | **Read-only**, `disabled` Input |
| 5 | Metadata v1 | FS only; пустые поля **скрывать** |
| 6 | History commits | **File log** (коммиты, где менялся файл) |
| 7 | Compare | `compare.extract` → tmp_review + **toast** (без auto-open Blender) |
| 8 | Revert | `restore --source=<commit>` + **AlertDialog**; batch в multiselect |
| 9 | Create commit | Только **выбранные** файлы (auto stage) |
| 10 | Author в диалоге | Read-only из config |

---

## 2. Анатомия UI (single)

```
┌─────────────────────────────┐
│  [312×312 preview + badges] │
│  [name file]  Name  (disabled)│
│  ▼ History                    │
│    Branch / Commit combobox   │
│    [Revert]  [Compare]        │
│  ─────────────────────────    │
│  ▼ Metadata                   │
│    Modified, Size, Type, …    │
│  ─────────────────────────    │
│  [ Create commit ]            │
└─────────────────────────────┘
```

### 2.1 Single (`4027:5041`)

| Блок | Atom |
|------|------|
| Preview | [info-file-preview-single.md](./info-file-preview-single.md) |
| File name | §3.1 |
| History | [info-history-section.md](./info-history-section.md) — Revert + Compare |
| Metadata | [info-metadata-section.md](./info-metadata-section.md) — full |
| Footer | §4 |

### 2.2 Multi (`4037:1898`)

| Блок | Atom |
|------|------|
| Preview stack | [info-file-preview-multi.md](./info-file-preview-multi.md) |
| File name row | **скрыта** |
| History | Revert **only** (full width), no Compare |
| Metadata | Size (sum) + Type (aggregated) |
| Footer | Create commit |

---

## 3. File name row (single only)

Read-only disabled `Input` (визуально как макет: label `name file` + value).

| Token | Значение |
|-------|----------|
| Component | shadcn `Input` `disabled` |
| Value | basename файла или full relative path (product: **basename** + tooltip full path) |
| Edit | **нет** в v1 |

Multiselect: строка **не рендерится**.

---

## 4. Footer — Create commit

| Element | Spec |
|---------|------|
| Button | `Button variant="default"` full width `322px` / `w-full` max |
| Label | `Create commit` |
| Action | Open [create-commit-dialog.md](./create-commit-dialog.md) |

| State | UI |
|-------|-----|
| Default | enabled |
| No selection | footer скрыт или disabled (empty state §6.1 — footer hidden) |
| Loading commit | button disabled + spinner |

---

## 5. Состояние (Content Info store)

```ts
interface ContentInfoState {
  selection: PreviewSelection
  panelWidth: number              // default 354

  // Single file
  fileMetadata: FileMetadata | null
  fileLock: LockInfo | null
  fileHistory: FileHistoryEntry[] // file log
  historyBranch: string | null
  historyCommit: string | null

  previewUrl: string | null       // image / blend thumbnail object URL
  previewKind: 'image' | 'text' | 'binary' | 'blend'

  createCommitOpen: boolean
  loadingMetadata: boolean
  loadingPreview: boolean
  error: string | null
}
```

### 5.1 Персистентность

| Key | Value |
|-----|-------|
| `dfm.info.panelWidth` | number |
| `dfm.info.historyBranch` | per-repo string |
| `dfm.info.historyCollapsed` | boolean |
| `dfm.info.metadataCollapsed` | boolean |

---

## 6. Corner cases

### 6.1 Нет selection

Centered: `text-muted-foreground` — **Select a file to view details**. Preview, History, Metadata, footer скрыты.

### 6.2 Файл удалён с диска

Metadata из last known / partial; preview stub; toast on Revert/Compare fail.

### 6.3 Multiselect 2 vs 10+ files

Stack shows max **3** tiles [`4037:1879`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4037-1879); при >3 — center + 2 rotated; optional `+N` badge v1.1.

### 6.4 History: файл never committed

Commit dropdown empty — placeholder «No history for this file».

### 6.5 Compare while tmp_review exists

New extract replaces previous; toast with path.

### 6.6 Revert cancelled in AlertDialog

No API call.

### 6.7 Create commit: nothing to stage

Toast «Selected files are already committed»; dialog не открывать или disable button.

### 6.8 Rail → History

Content Info unmount / hidden.

### 6.9 Unicode paths

Display + tooltips UTF-8.

---

## 7. Wails backend

| Метод Wails | JSON API | Назначение |
|-------------|----------|------------|
| `GetFileMetadata(repoPath, fileRel)` | **новый** `file.metadata` | FS stat + mime |
| `GetFileThumbnail(repoPath, fileRel, size)` | **новый** | Preview image/blend |
| `GetFileLock(repoPath, branch, fileRel)` | `lock.list` filter | Lock badge |
| `GetFileLog(repoPath, branch, fileRel)` | **новый** `file.log` | Commits touching file |
| `CompareExtract(repoPath, commitHash)` | `compare.extract` | History Compare |
| `RestoreFileFromCommit(repoPath, commitHash, paths[])` | **новый** `restore.file` | History Revert |
| `StageFiles(repoPath, paths[])` | `add` / index | Before commit |
| `CreateCommit(repoPath, message, author)` | `commit.create` | Dialog submit |
| `GetRepoUser(repoPath)` | config `[user].name` | Dialog author |

### 7.1 `file.log` (предлагаемый)

```json
{
  "file_path": "assets/scene.blend",
  "branch": "main",
  "commits": [
    { "hash": "abc…", "message": "Update scene", "timestamp": 1710000000, "author": "Name" }
  ]
}
```

Walk branch log; include commit if file path changed in tree vs parent.

---

## 8. Компоненты (React)

```
frontend/src/components/info/
  ContentInfoPanel.tsx
  InfoFilePreviewSingle.tsx
  InfoFilePreviewMulti.tsx
  InfoFilePreviewTile.tsx
  InfoMetadataSection.tsx
  InfoHistorySection.tsx
  CreateCommitDialog.tsx
  ContentInfoEmpty.tsx
state/
  contentInfoStore.ts
```

---

## 9. Решения (закрытые)

| # | Тема | Решение |
|---|------|---------|
| 1 | Compare after extract | Toast only |
| 2 | File name | Read-only disabled |
| 3 | Empty metadata fields | Hide |
| 4 | Multiselect History | Revert only, batch restore |
| 5 | Create commit scope | Selected files only |
