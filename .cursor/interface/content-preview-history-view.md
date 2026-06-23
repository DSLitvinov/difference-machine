# Content Preview — History view (diff коммита)

Панель **Content Preview** в режиме **History**: просмотр изменений выбранного в Sidebar коммита — commit header, список changed files + **Diff view**.

**UX-ориентир:** GitHub Desktop (commit detail + file list + diff pane).

**Figma (shadcn kit):**
- [Text diff](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4028-5655) — `4028:5655`
- [Image diff (Split / Overlay)](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4030-3317) — `4030:3317`
- [Binary stub](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4031-3754) — `4031:3754`

**Цвета:** [design-tokens.md](./design-tokens.md) §3.5

**Стек:** Wails (Go backend) + React + shadcn/ui

**Связанные документы:** [architecture.md](./architecture.md) · [sidebar-history-view.md](./sidebar-history-view.md) · [commit-card.md](./commit-card.md) · [content-preview-project-view.md](./content-preview-project-view.md)

**Atom specs (компоненты):**

| Компонент | Документ |
|-----------|----------|
| Commit header | [preview-commit-header.md](./preview-commit-header.md) |
| Changed file row | [history-changed-file-item.md](./history-changed-file-item.md) |
| Diff container | [diff-view.md](./diff-view.md) |
| Text diff | [text-diff-panel.md](./text-diff-panel.md) |
| Image diff | [image-diff-panel.md](./image-diff-panel.md) |
| Binary stub | [binary-diff-stub.md](./binary-diff-stub.md) |
| Deleted stub | [deleted-diff-stub.md](./deleted-diff-stub.md) |

---

## 1. Назначение и layout

### 1.1 Режим History — две панели

В режиме **History** приложение использует **только Sidebar + Content Preview**. Панель **Content Info скрыта**; Content Preview занимает всю оставшуюся ширину окна.

```
┌──────────┬────────────────────────────────────────────────────────────┐
│ Sidebar  │  Content Preview (History)                                  │
│ History  │  ┌────────────────────────────────────────────────────────┐ │
│          │  │ PreviewCommitHeader                                    │ │
│          │  ├──────────────────┬─────────────────────────────────────┤ │
│          │  │ Changed files    │ DiffView                            │ │
│          │  │ ~373px (resize)  │ flex-1                              │ │
│          │  └──────────────────┴─────────────────────────────────────┘ │
└──────────┴────────────────────────────────────────────────────────────┘
```

### 1.2 Связь с Sidebar

Вход: `onSelectionChange({ kind: 'commit', hash, branch })` из [architecture.md §3.1](./architecture.md).

| Событие Sidebar | Действие Preview |
|-----------------|------------------|
| Коммит выбран | Загрузить детали + changed files; **auto-select первый файл** (§4.1) |
| Selection сброшен (`kind: 'none'`) | Empty state Preview |
| Смена `currentBranch` (checkout) | Сброс commit selection; Preview empty; после выбора нового коммита — обычный flow |
| Rail → Project view | Preview переключается на Project layout; History state сбрасывается |

**Поиска в History Preview нет** (в отличие от Project view).

### 1.3 Зафиксированные решения

| # | Тема | Решение |
|---|------|---------|
| 1 | Baseline diff | **Коммит vs parent** (первый parent для merge) |
| 2 | Триггер | Выбор коммита → header + file list; **auto-select первый файл** по пути A→Z |
| 3 | Текстовый diff | **Unified** default; toggle в [diff-view.md](./diff-view.md) |
| 4 | Изображения | 2-up + Swipe + Overlay — [image-diff-panel.md](./image-diff-panel.md) |
| 5 | Расширения image | `png`, `jpg`/`jpeg`, `gif`, `webp`, `bmp`, `tiff`, `exr`; **`svg` → text** |
| 6 | Бинарный | [binary-diff-stub.md](./binary-diff-stub.md); **`.blend`** → скриншот коммита вместо icon ([4030:2796](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4030-2796)) |
| 7 | Удалённый (D) | [deleted-diff-stub.md](./deleted-diff-stub.md) |
| 8 | Status badges | A / M / D / R — [history-changed-file-item.md](./history-changed-file-item.md) |
| 9 | Сортировка списка | Путь A→Z (locale-aware) |
| 10 | Ширина колонок | Список **~373px** default; resizable; min **280px**, max **45%** |
| 11 | Multiselect | **Нет** |
| 12 | Content Info | **Скрыта** в History mode |

---

## 2. Анатомия UI

### 2.1 PreviewCommitHeader

Спека: [preview-commit-header.md](./preview-commit-header.md).

Блок над split-pane; `border-b border-border`, `px-4 py-3`, `bg-background`.

### 2.2 Split pane (files + diff)

`flex flex-1 min-h-0` — обе колонки на всю высоту под header.

| Колонка | Default width | Resize |
|---------|---------------|--------|
| **Changed files** | `373px` | `ResizablePanel` (shadcn) |
| **Diff view** | `flex-1` | complement |

Divider: `w-px bg-border` + hit area 4px; double-click → reset to 373px.

### 2.3 Changed files list

#### Header row

- Фон: `bg-accent`
- Текст: `text-sm font-medium text-foreground`
- Copy: `{count} files changed`

#### Scroll area

- `ScrollArea`, `bg-background`
- Строки: [history-changed-file-item.md](./history-changed-file-item.md)
- Клик → `selectedChangedFilePath`

#### Empty list

`files.length === 0`:

- Header: `0 files changed`
- Body: «No files changed in this commit»
- Diff pane: тот же copy, toolbar скрыт

### 2.4 DiffView

Спека: [diff-view.md](./diff-view.md) → child panels:

| Класс | Atom |
|-------|------|
| Text | [text-diff-panel.md](./text-diff-panel.md) |
| Image | [image-diff-panel.md](./image-diff-panel.md) |
| Binary | [binary-diff-stub.md](./binary-diff-stub.md) |
| Deleted | [deleted-diff-stub.md](./deleted-diff-stub.md) |

Классификация и toolbar — в [diff-view.md §3](./diff-view.md).

---

## 3. Item-компоненты (кратко)

Полные спеки — в atom-документах (см. таблицу в шапке).

### 3.1 History Changed File Item

[history-changed-file-item.md](./history-changed-file-item.md) — badge A/M/D/R, Default/Hover/Selected, single select.

### 3.2 Preview Commit Header

[preview-commit-header.md](./preview-commit-header.md) — merge/Head, title, author, hash+copy, stats. Без description (в отличие от Sidebar [commit-card.md](./commit-card.md), где есть optional description).

### 3.3 Diff atoms

- [text-diff-panel.md](./text-diff-panel.md) — Unified / Split
- [image-diff-panel.md](./image-diff-panel.md) — 2-up (side by side) / Swipe / Overlay
- [binary-diff-stub.md](./binary-diff-stub.md) — кнопка `Open in external application`; `.blend` + screenshot preview
- [deleted-diff-stub.md](./deleted-diff-stub.md) — «File was deleted»

---

## 4. Состояние (Preview History store)

```ts
type TextDiffLayout = 'unified' | 'split'
type ImageDiffLayout = '2up' | 'swipe' | 'overlay'

interface HistoryPreviewState {
  commitHash: string | null
  branch: string | null
  commit: CommitDetail | null
  changedFiles: ChangedFile[]
  selectedFilePath: string | null
  textDiffCache: Map<string, TextDiffResult>
  imageBlobCache: Map<string, { before?: Blob; after?: Blob }>
  filesPanelWidth: number          // default 373
  textDiffLayout: TextDiffLayout   // default 'unified'
  imageDiffLayout: ImageDiffLayout // default '2up'
  loadingCommit: boolean
  loadingDiff: boolean
  error: string | null
}
```

### 4.1 Auto-select первого файла

1. Sort paths A→Z.
2. `selectedFilePath = sorted[0]?.path ?? null`.
3. Prefetch diff для выбранного файла.

При refresh: сохранить selection если path в списке, иначе first file.

### 4.2 Персистентность

| Key | Value |
|-----|-------|
| `dfm.preview.history.filesPanelWidth` | number |
| `dfm.preview.history.textDiffLayout` | `unified` \| `split` |
| `dfm.preview.history.imageDiffLayout` | `2up` \| `swipe` \| `overlay` |

---

## 5. Backend API

Канон: [api-contract.md](./api-contract.md) §3.

| JSON method | Назначение |
|-------------|------------|
| `commit.get` | Header (`screenshot_path` для `.blend`) |
| `diff.name_status` | Changed files list (A/M/D; R — когда backend добавит rename) |
| `diff.text` | Text diff panel |
| `diff.stat` | Optional stats в header / commit card |
| `blob.get` | Image diff, binary temp file |
| `workdir.open` | Binary stub → OS (из temp blob) |

### 5.1 `diff.name_status`

```json
{ "from": "<first_parent_hash>", "to": "<commit_hash>" }
→ { "files": [{ "status": "A|M|D", "path": "relative/path" }] }
```

CLI: `diff <from> <to> --name-status`. UI map: `A→added`, `M→modified`, `D→deleted`.

### 5.2 `diff.text`

```json
{ "from": "...", "to": "...", "path": "src/app.tsx", "unified": true }
→ { "content": "...", "format": "unified", "is_binary": false }
```

### 5.3 Merge commits

Baseline = **first parent** (`from` = `parent_hashes[0]`). Merge icon в [preview-commit-header.md](./preview-commit-header.md).

---

## 6. Corner cases

### 6.1 Нет выбранного коммита

Empty state: `GitCommit` + «Select a commit to view changes».

### 6.2 Root / initial commit

Нет parent — text: all added; image: only after; binary: open commit blob.

### 6.3 Пустой коммит

Список пуст — §2.3 empty copy.

### 6.4 Concurrent updates

Коммит исчез из log → Sidebar clears → Preview empty.

### 6.5 Diff / image load error

Inline error в DiffView + Retry; list selection сохраняется.

### 6.6 Быстрое переключение файлов

Abort stale requests.

### 6.7 Rename без content change

[text-diff-panel.md](./text-diff-panel.md) — «No content changes».

### 6.8 Window resize

`filesPanelWidth` clamp min 280, max 45%.

### 6.9 History → Project

Store сброс; [architecture.md §6.10](./architecture.md).

### 6.10 Keyboard

| Key | Context | Action |
|-----|---------|--------|
| `↑` `↓` | File list focus | prev/next file |
| `Cmd/Ctrl+C` | Copy hash focused | copy full hash |

Детали по компонентам — в atom-спеках.

---

## 7. Компоненты (React)

```
frontend/src/components/preview/history/
  HistoryPreviewPanel.tsx
  PreviewCommitHeader.tsx       # preview-commit-header.md
  ChangedFilesPanel.tsx
  HistoryChangedFileItem.tsx    # history-changed-file-item.md
  DiffView.tsx                  # diff-view.md
  TextDiffPanel.tsx
  ImageDiffPanel.tsx
  ImageDiffSplit.tsx
  ImageDiffOverlay.tsx
  BinaryDiffStub.tsx
  DeletedDiffStub.tsx
  ResizableFilesSplit.tsx
state/
  historyPreviewStore.ts
```

---

## 8. Отличия от Project view

| | Project view | History view |
|---|-------------|--------------|
| Триггер | Папка в Sidebar | Коммит в Sidebar |
| Layout | Toolbar + grid | Header + files + diff |
| Content Info | **Visible** (Project) | **Hidden** |
| Search | Global | **Нет** |
| File open | Double-click workdir | Binary stub button |
| Selection | Multiselect | Single |
| Документ | [content-preview-project-view.md](./content-preview-project-view.md) | этот файл |

---

## 9. Решения (закрытые)

| # | Тема | Решение |
|---|------|---------|
| 1 | Diff baseline | Commit vs first parent |
| 2 | Auto-select file | First in path-sorted list |
| 3 | Text layout | Unified default |
| 4 | Image modes | Split + Overlay |
| 5 | svg | Text diff |
| 6 | Binary open | Button → commit blob; `.blend` → commit screenshot preview |
| 7 | Deleted | Deleted stub |
| 8 | List width | ~373px resizable |
| 9 | Search | Нет |
| 10 | Panels | Sidebar + Preview only |
