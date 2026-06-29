# Content Preview — File Viewer

Подрежим **Content Preview** в **Project view**: полноэкранный (в колонке Preview) просмотр **одного файла** из рабочей директории — масштабируемое превью с toolbar; **Content Info остаётся видимой** (три панели).

**UX-ориентир:** macOS Preview / Quick Look — фокус на содержимом файла; метаданные и History — в правой панели.

**Figma (shadcn kit):**
- [Окно GUI (Sidebar + Preview + File Info)](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4084-6834) — `4084:6834`
- Колонка Preview: `4084:7571` (`Content Preview/View Folder content`)
- Toolbar: `4084:7572` · Preview area: `4084:7698` · File Info: `4027:5041` (reuse)
- **Edit in** (Content Info, не toolbar): [`4085:5087`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4085-5087)

**Цвета:** [design-tokens.md](./design-tokens.md) §3.6 (info preview) · §4.5

**Стек:** Wails (Go backend) + React + shadcn/ui

**Связанные документы:** [architecture.md](./architecture.md) · [content-preview-project-view.md](./content-preview-project-view.md) · [content-info-project-view.md](./content-info-project-view.md) · [file-history-view.md](./file-history-view.md) · [info-file-preview-single.md](./info-file-preview-single.md)

**Atom specs (переиспользование):**

| Компонент | Документ |
|-----------|----------|
| Preview (логика) | [info-file-preview-single.md](./info-file-preview-single.md) · `useWorkdirPreview` |
| File Info panel | [content-info-project-view.md](./content-info-project-view.md) |
| History → diff | [file-history-view.md](./file-history-view.md) (кнопка **View**) |

---

## 1. Назначение и layout

### 1.1 Место в приложении

File Viewer — **не** отдельный `sidebarMode`. Подрежим центральной колонки при `sidebarMode === 'project'`:

| `projectPreviewMode` | Content Preview | Content Info |
|----------------------|-----------------|--------------|
| `grid` (default) | Сетка папок / файлов | single / multi / empty |
| `fileViewer` | **File Viewer** | **Видна** — single-file panel ([`4027:5041`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4027-5041)) |
| `fileHistory` | [File History View](./file-history-view.md) | **Скрыта** |

```
Project view + fileViewer:
┌──────────┬─────────────────────────────────────┬──────────────┐
│ Sidebar  │  File Viewer (Content Preview)      │ Content Info │
│ Project  │  [←]  [————●———— zoom slider]       │  preview     │
│          │  ┌─────────────────────────────┐    │  name        │
│          │  │   file preview (full area)  │    │  [ Edit in ]   │
│          │  │                             │    │  History       │
│          │  │                             │    │  Metadata    │
│          │  └─────────────────────────────┘    │  Create commit│
└──────────┴─────────────────────────────────────┴──────────────┘
```

Ширины: трёхколоночный layout — [panel-layout.md](./panel-layout.md) (Preview min **747px**, Info min **354px**). **Не** скрывать Content Info (в отличие от `fileHistory`).

### 1.2 Вход (триггеры)

| Триггер | Условие | Действие |
|---------|---------|----------|
| **Double-click** по `FilePreviewItem` | Любой файл (см. §1.4) | `projectPreviewMode = 'fileViewer'`, `fileViewerPath = path` |
| **Enter** на сфокусированном файле | = double-click | То же |
| Context menu → **Open in Preview** (v1.1, optional) | single file | То же |

**Не** открывает File Viewer: single click (только selection), context menu → **Open in external application**.

**Выход:** кнопка `<` (Back) → `projectPreviewMode = 'grid'`; папка / selection / scroll сетки **сохраняются**.

### 1.3 Связь с Content Info и File History

| Режим Preview | Content Info |
|---------------|--------------|
| `fileViewer` | Single-file layout для `fileViewerPath`; **Edit in** (§1.3.2); History: кнопка **View** → [file-history-view.md](./file-history-view.md) |
| `fileHistory` | Панель **скрыта** |
| `grid` | Обычное поведение по selection |

При входе в File Viewer файл **должен быть в selection** (`selectedFilePaths` содержит `fileViewerPath`, `primary = fileViewerPath`) — Content Info показывает тот же файл.

Кнопка **View** в History секции Content Info переключает Preview в `fileHistory`; запоминается `fileHistoryReturnMode` (§1.3.1). `fileViewerPath` **не сбрасывается**.

#### 1.3.1 Стек навигации Viewer ↔ History

```
grid ──double-click──► fileViewer ──View──► fileHistory
  ▲                        ▲                    │
  │                        └──── Back ──────────┘ (returnMode=fileViewer)
  └──────────────── Back ───────────────────────┘ (returnMode=grid)
```

| Переход | `fileHistoryReturnMode` после View |
|---------|-----------------------------------|
| `grid` + View | `grid` |
| `fileViewer` + View | `fileViewer` |

#### 1.3.2 Edit in (Content Info)

При `fileViewer` в Content Info показывается кнопка **Edit in** — popover со списком `externalEditorPaths` → `workdir.open` с выбранным редактором.

Спека: [content-info-project-view.md §3.2](./content-info-project-view.md) · Figma `4085:5087`.

### 1.4 Изменение double-click (breaking)

Заменяет [content-preview-project-view.md §4.4](./content-preview-project-view.md) и уточняет [file-history-view.md §1.2](./file-history-view.md):

| Жест | Было (v1) | Стало |
|------|-----------|-------|
| Double-click файл | `workdir.open` → ОС | **File Viewer** |
| Enter на файле | `workdir.open` | **File Viewer** |

| Действие | Куда |
|----------|------|
| Double-click / Enter | **File Viewer** (этот документ) |
| Content Info → **View** | **File History View** |
| Context menu → Open | `workdir.open` → ОС |

### 1.5 Зафиксированные решения

| # | Тема | Решение |
|---|------|---------|
| 1 | Превью | Рабочая копия файла (`workdir.thumbnail` / text snippet / stubs) — та же классификация, что [info-file-preview-single.md](./info-file-preview-single.md) |
| 2 | Zoom slider | Масштаб **превью в viewer**, не сетки; диапазон §2.2 |
| 3 | Content Info | **Всегда видна** в `fileViewer` |
| 4 | Toolbar | Только **Back** + **Slider** (без breadcrumbs, search, forward) |
| 5 | Multiselect + double-click | History целевого файла; selection **не** сбрасывается до single (§8.4) |
| 6 | Rail → History | Авто-выход через `exitSubPreviewViews()` |
| 7 | Sidebar: смена папки | Авто-выход через `exitSubPreviewViews()` (навигация папки) |
| 8 | Удалённый файл (VCS D) | Viewer открывается; preview dimmed / stub; metadata partial |
| 9 | Cache превью | `useWorkdirPreview` + `workdirPreviewCache` — [virtual-scroll-preview-ux rule](../rules/virtual-scroll-preview-ux.mdc) |

---

## 2. Анатомия UI

**Статус реализации (v1):**

| Элемент | Статус |
|---------|--------|
| Back `<` | **Shipped** |
| Zoom slider | **Planned** (§2.2) |
| Expanded preview (`InfoFilePreviewSingle` `variant="expanded"`) | **Shipped** |
| Edit in (Content Info) | **Shipped** — [content-info-project-view.md §3.2](./content-info-project-view.md) |

### 2.1 Toolbar (node `4084:7572`)

`flex items-center gap-1`, `px-2 py-1.5`, `border-b border-border`.

```
┌────────────────────────────────────────────────────────────┐
│ [<] │ [——————————●—————————— zoom slider]                │
└────────────────────────────────────────────────────────────┘
```

| # | Элемент | Spec | Поведение |
|---|---------|------|-----------|
| 1 | **Back** `<` | `Button` ghost **40×40**, `ChevronLeft` 16 | `closeFileViewer()` → `grid` (§1.2) |
| — | Separator | vertical, **24px** | `4084:7578` — **planned** (не рендерится без slider) |
| 2 | **Zoom slider** | shadcn `Slider` **120px**, centered `flex-1` | §2.2 — **planned** |

> В макете **нет** Forward `>`, breadcrumbs, Search — не рендерить.

### 2.2 Zoom slider (planned)

> Не в текущей сборке. Превью занимает доступную область без масштабирования.

| Token | Значение |
|-------|----------|
| Component | shadcn `Slider` size `sm` |
| Track width | `120px` (центр toolbar) |
| Range | **25% → 100%** от максимального fit в content area |
| Steps | 5 дискретных шагов (как сетка: 25, 44, 63, 81, 100 %) |
| Default | **100%** (максимальный fit) |
| Persist | per-repo `dfm.fileViewer.zoom` (0–4 index) |

**Fit:** превью вписывается в content area с `object-contain`; при 100% — max сторона = min(ширина, высота) контейнера минус padding; при 25% — ¼ от fit.

Текстовые файлы: `font-size` / `max-width` масштабируются пропорционально (monospace block).

### 2.3 Content area — File preview (node `4084:7585` / `4084:7698`)

`flex-1 min-h-0`, padding `px-4 py-3`, вертикальный/горизонтальный скролл при overflow.

```
┌────────────────────────────────────────┐
│                                        │
│     ┌──────────────────────────┐       │
│     │  preview (scaled)        │       │
│     │  border rounded-md       │       │
│     └──────────────────────────┘       │
│                                        │
└────────────────────────────────────────┘
```

| Token | Значение |
|-------|----------|
| Container | `flex flex-1 items-center justify-center min-h-0 overflow-auto` |
| Preview frame | `border border-border rounded-md bg-muted/30` |
| Max size | из §2.2 zoom × fit box |

#### Контент по типу (`InfoPreviewKind`)

| Kind | UI | Источник |
|------|-----|----------|
| **image** | `<img>` `object-contain`, checkerboard if alpha | `useWorkdirPreview` |
| **blend** | `<img>` `object-contain` или blend stub | `workdir.thumbnail` |
| **text** | `<pre>` scroll, monospace | text snippet из cache |
| **binary** | centered stub icon 64–96px | `FileArchive` / `FileQuestion` |

Badges **status** / **lock** — **не** в центральном превью (есть в Content Info thumbnail); viewer — чистая область контента.

#### Состояния

| State | UI |
|-------|-----|
| Loading | `Skeleton` на fit box |
| Error | stub по kind + optional Retry |
| Deleted (VCS) | dimmed overlay или stub; панель открыта |

### 2.4 shadcn/ui mapping

| UI | Component |
|----|-----------|
| Back | `Button` variant `ghost` |
| Zoom | `Slider` |
| Image / blend | `img` |
| Text | `pre` + `ScrollArea` optional |
| Binary / text stub | lucide icon |
| Loading | `Skeleton` |

---

## 3. Поведение

### 3.1 Синхронизация с selection

- `openFileViewer(path)` устанавливает `fileViewerPath` и добавляет `path` в selection, если отсутствует.
- Content Info читает `selectedFilePaths` — при `fileViewer` всегда single file для отображаемого path.
- Смена selection в grid **недоступна** (viewer fullscreen); Back → grid → можно менять selection.

### 3.2 Навигация между файлами (v1)

**Нет** prev/next file в toolbar v1. Переключение: Back → grid → другой файл.

v1.1 (optional): стрелки ← → по `sortedEntryPaths` текущей папки.

### 3.3 Keyboard

| Key | Действие |
|-----|----------|
| `Escape` | Back → grid (как в grid Esc сбрасывает selection — в viewer приоритет **Back**) |
| `Enter` | — (уже в viewer) |
| `+` / `-` | zoom step ±1 (optional v1.1) |

---

## 4. Состояние

### 4.1 Store (`projectStore`)

```ts
type ProjectPreviewMode = 'grid' | 'fileViewer' | 'fileHistory'

interface ProjectPreviewState {
  projectPreviewMode: ProjectPreviewMode
  fileViewerPath: string | null    // active when mode === 'fileViewer'
  fileHistoryPath: string | null   // active when mode === 'fileHistory'
  fileViewerZoom: number           // 0..4 — planned; not in store yet

  fileHistoryReturnMode: FileHistoryReturnMode  // см. file-history-view.md §1.2.1

  openFileViewer: (path: string) => void
  closeFileViewer: () => void
  exitSubPreviewViews: () => void   // grid; clears viewer + history
  setFileViewerZoom: (index: number) => void  // planned
  openFileHistory: (path: string) => void   // sets returnMode from current mode
  closeFileHistory: () => void              // restores viewer or grid
}
```

`closeFileViewer` / `exitSubPreviewViews` / смена папки / Rail → History: `projectPreviewMode = 'grid'`, `fileViewerPath = null`.

`closeFileHistory` при возврате в `grid` также сбрасывает `fileViewerPath`.

### 4.2 Персистентность

| Key | Value |
|-----|-------|
| `dfm.fileViewer.zoom` | per-repo, slider index 0–4 |

`projectPreviewMode`, `fileViewerPath` — **не** персистятся.

### 4.3 Panel layout (`AppShell`)

| `projectPreviewMode` | `hideInfoPanel` |
|----------------------|-----------------|
| `grid` | `false` |
| `fileViewer` | **`false`** |
| `fileHistory` | **`true`** |

`usePanelLayout(sidebarMode, collapsed, hideInfoPanel)` — см. [file-history-view.md §1.1](./file-history-view.md).

---

## 5. Backend API

| JSON method | Назначение |
|-------------|------------|
| `workdir.thumbnail` | image / blend / text snippet |
| `workdir.metadata` | Content Info (parallel) |
| `status.get` | badges в Info |
| `lock.list` | lock badge в Info |

Открытие в ОС — **не** из viewer; context menu `workdir.open`.

---

## 6. Компоненты (React)

```
frontend/src/components/preview/
  FileViewer.tsx              # toolbar (Back) + expanded preview
  ProjectPreviewPanel.tsx     # switch grid | fileViewer | fileHistory

frontend/src/components/info/
  ContentInfoPanel.tsx        # visible in fileViewer; InfoEditInButton when fileViewer
  InfoEditInButton.tsx
  InfoFilePreviewSingle.tsx   # variant compact | expanded

frontend/src/lib/
  externalEditors.ts          # editorDisplayLabel()
  workdirPreviewCache.ts

frontend/src/hooks/
  useWorkdirPreview.ts

# planned:
  fileViewerZoom.ts           # zoom steps + persist
```

### 6.1 Props (shipped)

```ts
interface FileViewerProps {
  filePath: string
  onBack: () => void
}
```

### 6.2 Props (planned — zoom)

```ts
interface FileViewerProps {
  filePath: string
  zoomIndex: number
  onZoomChange: (index: number) => void
  onBack: () => void
}
```

---

## 7. Corner cases

### 7.1 Нет repo

Viewer не открывается; grid empty state.

### 7.2 Файл удалён с диска

`workdir.thumbnail` fail → stub; Content Info partial metadata ([content-info-project-view.md §6.2](./content-info-project-view.md)).

### 7.3 Multiselect + double-click

Открывается viewer файла под курсором; остальные selected paths **сохраняются**; Content Info показывает **открытый** файл (`fileViewerPath`).

### 7.4 Большой текст / `file_too_large`

Truncated snippet как в thumbnail API; scroll в preview area; без полного файла в v1.

### 7.5 `.blend` без thumbnail

Blend stub в центре; zoom масштабирует frame/stub.

### 7.6 `svg`

Text kind — snippet или image per API.

### 7.7 Быстрый Back + double-click другого файла

Stale preview: generation guard в `useWorkdirPreview` (path + generation).

### 7.8 File Viewer → View (History) → Back

Back из History → **File Viewer** (`fileHistoryReturnMode = 'fileViewer'`) — [file-history-view.md §1.2.1](./file-history-view.md). Content Info снова видна; zoom и path viewer сохраняются.

### 7.9 Unicode paths

UTF-8; normalize per [paths.md](./paths.md).

### 7.10 Window resize

Preview refit на 100% zoom; slider index сохраняется.

---

## 8. i18n

| Key | EN |
|-----|-----|
| `preview.editIn` | Edit in |
| `preview.editInNoEditors` | Add external editors in Settings |
| `fileViewer.back` | Back to files |
| `fileViewer.zoom` | Zoom (tooltip, optional) |

Reuse: `common.loading`, stubs from `info.*`.

---

## 9. Решения (закрытые)

| # | Тема | Решение |
|---|------|---------|
| 1 | Double-click | **File Viewer**, не History и не ОС |
| 2 | File History entry | Content Info → **View** only |
| 3 | Content Info | **Видна** в fileViewer |
| 4 | Toolbar | Back + zoom slider only |
| 5 | Preview logic | Reuse `useWorkdirPreview` / Info kinds |
| 6 | Badges in viewer | Только в Content Info |
| 7 | OS open | Context menu |
| 8 | Exit (viewer Back) | Back + auto on folder/mode change |
| 9 | Zoom | 25–100% fit, 5 steps, per-repo persist |
| 10 | History back | В **viewer**, если History открыта из viewer |
| 11 | Edit in | Content Info при `fileViewer` — popover editors ([§1.3.2](./file-viewer.md)) |
| 12 | Zoom slider | Planned v1.1 |

---

## 10. Связанные изменения документации

- [content-preview-project-view.md §1.3 #8, §4.4](./content-preview-project-view.md) — double-click → File Viewer
- [file-history-view.md §1.2, §1.4](./file-history-view.md) — убрать double-click; вход только View
- [architecture.md §2.0](./architecture.md) — `projectPreviewMode` tri-state
- [content-info-project-view.md §3.2](./content-info-project-view.md) — Edit in в fileViewer
