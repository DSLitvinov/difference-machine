# Content Info — Project view

Правая панель **Content Info** в режиме **Project view**: детали выбранных в Content Preview файлов, History, Metadata, создание коммита.

**Figma (shadcn kit):** [Panel single `4027:5041`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4027-5041) · [Panel multi `4037:1898`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4037-1898)

**Цвета:** [design-tokens.md](./design-tokens.md) §3.6

**Стек:** Wails + React + shadcn/ui

**Связанные документы:** [architecture.md](./architecture.md) · [api-contract.md](./api-contract.md) · [content-preview-project-view.md](./content-preview-project-view.md) · [file-preview-item.md](./file-preview-item.md) · [file-viewer.md](./file-viewer.md) · [file-history-view.md](./file-history-view.md)

**Atom specs:**

| Компонент | Документ |
|-----------|----------|
| Single preview | [info-file-preview-single.md](./info-file-preview-single.md) |
| Multi preview stack | [info-file-preview-multi.md](./info-file-preview-multi.md) |
| Multi preview tile | [info-file-preview-tile.md](./info-file-preview-tile.md) |
| Metadata | [info-metadata-section.md](./info-metadata-section.md) |
| History | [info-history-section.md](./info-history-section.md) |
| Edit in (file viewer only) | §3.2 |
| Create commit dialog | [create-commit-dialog.md](./create-commit-dialog.md) |

---

## 1. Назначение и layout

### 1.1 Режимы окна

| Режим / подрежим | Content Info |
|------------------|--------------|
| **Project view** + `grid` | Видна (третья колонка) |
| **Project view** + `fileViewer` | **Видна** — single-file panel + **Edit in** (§3.2) |
| **Project view** + `fileHistory` | **Скрыта** — Preview на всю ширину ([file-history-view.md §1.1](./file-history-view.md)) |
| **History** (`sidebarMode`) | **Скрыта** — Preview на всю ширину |

```
┌──────────┬─────────────────────────────┬──────────────┐
│ Sidebar  │  Content Preview            │ Content Info │
│          │                             │  min 354     │
└──────────┴─────────────────────────────┴──────────────┘
```

### 1.2 Вход

`onPreviewSelectionChange` из [content-preview-project-view.md §9.4](./content-preview-project-view.md). Тип **`PreviewSelection`** — канон: [architecture.md §3.1](./architecture.md).

| Selection | Layout |
|-------------|--------|
| `none` | Empty state §6.1 |
| `files`, `paths.length === 1` | Single panel [`4027:5041`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4027-5041) |
| `files`, `paths.length > 1` | Multi panel [`4037:1898`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4037-1898) |

Папки не эмитят selection — Content Info не реагирует на drill-down папок.

### 1.3 Зафиксированные решения

| # | Тема | Решение |
|---|------|---------|
| 1 | Ширина | Default **354px**; resizable — [panel-layout.md](./panel-layout.md): min **354px**, max `W − 334 − 747` |
| 2 | Preview types | text → stub; binary → другая stub; image → preview; blend → `workdir.thumbnail` (Blender OS cache / embedded PNG) или stub — [api-contract.md §4.3.2](./api-contract.md) |
| 3 | Badges | status = VCS; lock = Forester lock (`lock.list`) |
| 4 | File name row | **Read-only**, `disabled` Input |
| 5 | Metadata v1 | FS only; пустые поля **скрывать** |
| 6 | History commits | File log загружается для Metadata (editor/creator); UI file log — в File History View |
| 7 | Compare | Только в [File History View](./file-history-view.md) toolbar (binary) |
| 8 | Revert | Только в File History View toolbar; **single file** |
| 9 | Create commit | Только **выбранные** файлы (auto stage) |
| 10 | Author в диалоге | Read-only из config |
| 11 | File History controls | Branch / Commit / Revert / Compare — **только** в [File History View](./file-history-view.md); в Content Info — кнопка **View** ([info-history-section.md](./info-history-section.md)) |
| 12 | Edit in | Кнопка **только** при `projectPreviewMode === 'fileViewer'` (§3.2) |

---

## 2. Анатомия UI (single)

### 2.0 Layout по `projectPreviewMode`

| `projectPreviewMode` | Блоки single panel |
|----------------------|-------------------|
| `grid` | Preview · Name · History (**View**) · Metadata · Create commit |
| `fileViewer` | Preview · Name · **Edit in** · History (**View**) · Metadata · Create commit |
| `fileHistory` | Панель **не рендерится** |

**Figma (file viewer + Edit in):** [`4085:5087`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4085-5087) — кнопка **Edit in** между name и History.

```
grid / fileViewer (single, Content Info visible):
┌─────────────────────────────┐
│  [312×200 preview + badges] │
│  [name file]  Name  (disabled)│
│  [ Edit in ]                  │  ← только fileViewer (§3.2)
│  ▼ History                    │
│    [ View ]                   │  ← opens File History View
│  ─────────────────────────    │
│  ▼ Metadata                   │
│  [ Create commit ]            │
└─────────────────────────────┘
```

Устаревший макет `4027:5041` (branch/commit/Revert/Compare в History) — **не** актуален для Content Info; см. [file-history-view.md §1.3](./file-history-view.md).

### 2.1 Single (`4027:5041` + `4085:5087`)

| Блок | Atom |
|------|------|
| Preview | [info-file-preview-single.md](./info-file-preview-single.md) — `variant="compact"` |
| File name | §3.1 |
| Edit in | §3.2 — **только** `fileViewer` |
| History | [info-history-section.md](./info-history-section.md) — **View** → File History View |
| Metadata | [info-metadata-section.md](./info-metadata-section.md) — full |
| Footer | §4 |

### 2.2 Multi (`4037:1898`)

```
┌─────────────────────────────┐
│  [multi preview stack]      │
│  ▼ Metadata                   │
│    Size (sum), Type           │
│  ─────────────────────────    │
│  [ Create commit ]            │
└─────────────────────────────┘
```

| Блок | Atom |
|------|------|
| Preview stack | [info-file-preview-multi.md](./info-file-preview-multi.md) |
| File name row | **скрыта** |
| History | **не рендерится** (только single file) |
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

## 3.2 Edit in (single, `fileViewer` only)

Кнопка открытия файла во **внешнем редакторе** из Settings. Показывается **только** когда Content Preview в режиме [File Viewer](./file-viewer.md) (`projectPreviewMode === 'fileViewer'`).

**Figma:** [`4085:5087`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4085-5087)

| Token | Значение |
|-------|----------|
| Component | `InfoEditInButton` |
| Trigger | `Button variant="outline"` full width `h-10 w-full` |
| Label | `preview.editIn` — **Edit in** |
| Menu | shadcn `Popover` — список редакторов, ширина = trigger |

### Источник редакторов

`appStore.externalEditorPaths` — тот же список, что submenu **Edit in** в context menu сетки ([settings-dialog.md §6](./settings-dialog.md), [file-preview-item.md §4.2](./file-preview-item.md)).

Label пункта: basename executable без `.exe` / `.app` (`editorDisplayLabel`).

### Поведение

| Действие | API |
|----------|-----|
| Клик по редактору | `workdir.open { path: filePath, editor: editorAbsPath }` |

Popover закрывается после выбора; ошибки — `appStore.setError`.

### Disabled

| Условие | UI |
|---------|-----|
| `externalEditorPaths.length === 0` | `disabled`; tooltip `preview.editInNoEditors` |
| VCS `deleted` / `staged-deleted` | `disabled` |
| Foreign lock (`lock.list`) | `disabled` |

В режиме `grid` кнопка **не рендерится** — открытие в редакторе через context menu сетки.

### Corner cases

| Case | Поведение |
|------|-----------|
| Viewer → View (History) | Edit in **скрыт** (Content Info unmount) |
| Back из History → viewer | Edit in снова видна для `fileViewerPath` |
| Нет repo | Viewer не открыт — N/A |
| Blender-only в cfg | Попадает в `externalEditorPaths` как и для context menu |

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

  // Single file only — not loaded when selection.paths.length > 1
  fileMetadata: FileMetadata | null
  fileLock: LockInfo | null
  fileHistory: FileHistoryEntry[] // file log
  fileHistoryBranch: string | null  // read-only filter for log.get+path; not checkout
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
| `dfm.info.fileHistoryBranch` | per-repo string; file History branch picker filter (not global branch) |
| `dfm.info.historyCollapsed` | boolean |
| `dfm.info.metadataCollapsed` | boolean |

---

## 6. Corner cases

### 6.1 Нет selection

Centered: `text-muted-foreground` — **Select a file to view details**. Preview, History, Metadata, footer скрыты.

### 6.2 Файл удалён с диска

Metadata из last known / partial; preview stub; toast on Revert/Compare fail.

### 6.3 Multiselect 2 vs 10+ files

Stack shows max **3** tiles [`4037:1879`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4037-1879); при >3 — center + 2 rotated; optional `+N` badge v1.1. **History** секция **скрыта** — Revert/Compare недоступны до выбора одного файла.

### 6.4 History: файл never committed

Commit dropdown empty — placeholder «No history for this file».

### 6.5 Compare while tmp_review exists

New extract replaces previous; toast with path.

### 6.6 Revert cancelled in AlertDialog

No API call.

### 6.7 Create commit: nothing to stage

Фильтр через `committablePaths(status.get)` — [api-contract.md §2.1](./api-contract.md).

| Case | UI |
|------|-----|
| `toStage.length === 0` | Toast «Selected files are already committed»; dialog не открывать |
| `toStage.length < selectedPaths.length` | Toast «N of M files will be committed»; stage только `toStage` via `index.add` |

### 6.8 Rail → History / смена `sidebarMode`

Content Info unmount / hidden. `exitSubPreviewViews()` сбрасывает `fileViewer` и `fileHistory` ([file-viewer.md §4.1](./file-viewer.md)).

### 6.9 `fileHistory` подрежим

Content Info **скрыта**; branch/commit/Revert/Compare — в toolbar File History View.

### 6.10 Unicode paths

Display + tooltips UTF-8.

---

## 7. Backend API

Канон: [api-contract.md](./api-contract.md).

| JSON method | Назначение |
|-------------|------------|
| `workdir.metadata` | FS stat + mime |
| `workdir.thumbnail` | Preview image / `.blend` — [api-contract.md §4.3](./api-contract.md) |
| `lock.list` | Lock badge; check before `restore.file` |
| `log.get` + `path` | History commit picker |
| `compare.extract` | History Compare |
| `restore.file` | History Revert (`restore --source=`) |
| `index.add` | Create commit pre-step |
| `commit.create` | Dialog submit |
| `status.get` | Committable filter для Create commit |

### 7.1 `log.get` + `path`

```json
{ "branch": "main", "max_count": 500, "path": "assets/scene.blend" }
→ { "commits": [{ "hash", "message", "timestamp", "author" }] }
```

Коммиты, где blob файла изменился (parent vs commit tree).

---

## 8. Компоненты (React)

```
frontend/src/components/info/
  ContentInfoPanel.tsx
  InfoEditInButton.tsx          # Edit in popover (fileViewer only)
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
| 4 | Multiselect History | **Секция скрыта** — History только при single file |
| 5 | Create commit scope | Selected files only |
| 6 | History in Info | Только **View**; diff controls в File History View |
| 7 | Edit in in Info | Только в **fileViewer**; grid → context menu |
