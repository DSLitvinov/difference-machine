# Forester GUI — архитектура

Документация для разработчиков. Три панели: **Sidebar**, **Content Preview**, **Content Info**. Sidebar и Content Preview (Project + History) задокументированы; Content Info — позже.

**Стек:** Wails (Go backend) + React + shadcn/ui  
**Дизайн:** [design-tokens.md](./design-tokens.md) · Sidebar Project [4026:4812](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4026-4812) · History [4026:4547](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4026-4547)

---

## 1. Назначение

Sidebar управляет выбором **папки**, **ветки/коммита**. Выбор **файла** — в Content Preview, не в Sidebar.

Два режима основной панели:

| Режим | Документ | Кратко |
|-------|----------|--------|
| **Project view** | [sidebar-project-view.md](./sidebar-project-view.md) | Дерево папок (fully expanded) + toggle «Changed» |
| **History** | [sidebar-history-view.md](./sidebar-history-view.md) | Ветка + список коммитов + поиск |

**Content Preview (Project view):** [content-preview-project-view.md](./content-preview-project-view.md) — сетка папок/файлов, drill-down, multiselect, поиск, slider.  
Item specs: [folder-preview-item.md](./folder-preview-item.md) · [file-preview-item.md](./file-preview-item.md)

**Content Preview (History view):** [content-preview-history-view.md](./content-preview-history-view.md) — orchestration. Atoms: [preview-commit-header.md](./preview-commit-header.md) · [history-changed-file-item.md](./history-changed-file-item.md) · [diff-view.md](./diff-view.md) · [text-diff-panel.md](./text-diff-panel.md) · [image-diff-panel.md](./image-diff-panel.md) · [binary-diff-stub.md](./binary-diff-stub.md) · [deleted-diff-stub.md](./deleted-diff-stub.md). **Content Info скрыта**.

---

## 2. Компоновка

### 2.0 Режимы окна

| Режим | Панели | Content Preview |
|-------|--------|-----------------|
| **Project view** | Sidebar + Preview (+ Content Info v2) | Grid папок/файлов |
| **History** | **Sidebar + Preview** (Content Info скрыта) | Commit diff layout |

```
Project view:
┌──────────┬─────────────────────────────┬──────────────┐
│ Sidebar  │  Content Preview          │ Content Info │
└──────────┴─────────────────────────────┴──────────────┘

History:
┌──────────┬────────────────────────────────────────────┐
│ Sidebar  │  Content Preview (full remaining width)    │
└──────────┴────────────────────────────────────────────┘
```

### 2.1 Sidebar (общая для обоих режимов)

```
┌──────────┬─────────────────────────────┬──┐
│  Rail    │  Main sidebar panel         │◀ │ collapse
│  (48px)  │  (~285px)                   │  │
│          │                             │  │
│  [logo]  │  Header (title + controls)  │  │
│  [proj]  │  Context selector           │  │
│  [hist]  │  Search / toggle (mode-dep)  │  │
│          │  Scrollable list            │  │
│          │                             │  │
│  [user]  │                             │  │
└──────────┴─────────────────────────────┴──┘
```

### 2.2 Rail (левая узкая колонка)

| Элемент | Иконка (lucide) | Действие |
|---------|-----------------|----------|
| App / home | `GalleryVerticalEnd` | Зарезервировано (настройки / about — вне scope v1) |
| Project view | `FolderGit2` | `sidebarMode = 'project'` |
| History | `GitFork` | `sidebarMode = 'history'` |
| User avatar | image | Зарезервировано (профиль / author — вне scope v1) |

Активный пункт rail: `bg-primary text-primary-foreground`. Неактивный — прозрачный + `hover:bg-accent`.

### 2.3 Main panel

Общие блоки:

1. **Header** — заголовок режима (`Project view` / `History`).
2. **Context selector** — dropdown:
   - Project view → имя репозитория (basename root path).
   - History → текущая выбранная ветка.
3. **Mode-specific controls** — см. дочерние документы.
4. **Scrollable list** — папки / коммиты (белый фон Container, §2.5).
5. **Collapse control** — кнопка `PanelLeft` на правом краю; сворачивает всю Sidebar (состояние в `ui.sidebarCollapsed`).

### 2.5 Цвета и фоны

**Источник токенов:** [design-tokens.md](./design-tokens.md) (shadcn/ui Zinc light, Figma kit).

**Figma (adapted):** Project view [4026:4812](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4026-4812) · History [4026:4547](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4026-4547)

| Слой | Figma token | Tailwind (shadcn) |
|------|-------------|-------------------|
| **Shell** (весь Sidebar + Rail) | `background/primary/light` | `bg-sidebar` |
| **List Container** (scroll) | `background/default` | `bg-background` |
| **Header** | — | `border-b border-border` |
| **Context selector** | `background/default` | `bg-background border-border` |
| **Search input** | `background/default` | `bg-background border-input` |
| **Selected folder row** | `background/primary/light` | `bg-sidebar rounded-sm` |
| **Active rail item** | `background/primary/default` | `bg-primary text-primary-foreground` |
| **Border** | `border/default` | `border-border` |
| **Section title** | `foreground/muted` | `text-muted-foreground` |
| **Row label** | `foreground/secondary` | `text-secondary-foreground` |

```
┌──────────┬─────────────────────────────┐
│  Rail    │  Header                     │  bg-sidebar
│ sidebar  ├─────────────────────────────┤
│          │  List Container             │
│          │  bg-background              │
│          │  [selected row bg-sidebar]  │
└──────────┴─────────────────────────────┘
```

### 2.6 shadcn/ui mapping

| UI | shadcn component |
|----|------------------|
| Rail buttons | `Button` variant `ghost` / `secondary` |
| Dropdowns | `DropdownMenu` или `Popover` + `Command` |
| Search | `Input` |
| Changed toggle | `Switch` + `Label` |
| Folder tree rows | `FolderTreeRow` + virtual scroll |
| Commit cards | `Card` + `Badge` + `Tooltip` + `DropdownMenu` |
| Scroll area | `ScrollArea` |
| Empty / loading | `Skeleton` |

---

## 3. Глобальное состояние (Sidebar)

```ts
type SidebarMode = 'project' | 'history'

interface SidebarState {
  collapsed: boolean
  mode: SidebarMode

  // Repository context (shared)
  repoPath: string | null
  repoName: string | null
  currentBranch: string | null
  headCommit: string | null

  // Project view — folders only
  showChangedOnly: boolean
  selectedFolderPath: string | null   // relative; '' = repo root
  folderTree: FolderTreeNode | null   // from ListWorkdirTree

  // History view
  historyBranch: string | null        // browse log only; see sidebar-history-view §2.5
  commitSearchQuery: string
  selectedCommitHash: string | null

  loading: boolean
  error: string | null
}
```

> **Файлы** не хранятся в Sidebar state. `selectedFilePaths` (multiselect) живёт в [Content Preview store](./content-preview-project-view.md) §9.

### 3.1 События наружу (контракт с Preview / Info)

Sidebar **не** рендерит preview. При изменении selection эмитит:

```ts
// Emitted by Sidebar only
type SidebarSelection =
  | { kind: 'none' }
  | { kind: 'folder'; path: string }
  | { kind: 'commit'; hash: string; branch: string }

// File selection — Content Preview (not Sidebar); see content-preview-project-view.md §9
type PreviewSelection =
  | { kind: 'none' }
  | { kind: 'files'; paths: string[]; primary: string }

interface SidebarEvents {
  onSelectionChange(selection: SidebarSelection): void
  onModeChange(mode: SidebarMode): void
  /** Project view: folder + Changed toggle → drives Preview file list */
  onProjectViewContextChange(ctx: ProjectViewContext): void
}

interface ProjectViewContext {
  selectedFolderPath: string   // '' = repo root (files at repository root)
  showChangedOnly: boolean     // true → Preview shows committable files only
}
```

`VcsFileStatus` вычисляется из `status.get` (см. §5).

### 3.2 Персистентность

| Ключ | Что хранить |
|------|-------------|
| `localStorage` `dfm.sidebar.collapsed` | boolean |
| `localStorage` `dfm.sidebar.mode` | `project` \| `history` |
| per-repo `dfm.sidebar.showChangedOnly` | boolean |
| per-repo `dfm.sidebar.selectedFolderPath` | string (`''` = root) |
| per-repo `dfm.sidebar.historyBranch` | string |

При смене репозитория сбрасывать selection, но восстанавливать mode и per-repo prefs.

---

## 4. Wails backend (контракт для Sidebar)

Sidebar вызывает Go-методы (обёртка над `internal/jsonapi`):

| Метод Wails | JSON API | Назначение |
|-------------|----------|------------|
| `GetStatus(repoPath)` | `status.get` | Ветка, HEAD, списки changed/untracked |
| `ListBranches(repoPath)` | `branch.list` | Dropdown веток (History) |
| `GetLog(repoPath, branch, maxCount)` | `log.get` | Commits; расширить: `tags`, `files_added`, `files_removed` |
| `GetCommit(repoPath, hash)` | `commit.get` | Детали коммита (Info) |
| `GetCommitFileStats(repoPath, hash)` | **новый** `commit.stats` | Files Changed если не в log |
| `ListTags(repoPath)` | **новый** | Tag Badge fallback |
| `ListWorkdirTree(repoPath)` | **новый** | Folder tree (folders only, recursive counts) |
| `ListWorkdirFiles(repoPath, folder)` | **новый** | Для **Content Preview**, не Sidebar |
| `OpenWithDefaultApp(repoPath, fileRel)` | **новый** | Double-click в Preview (Project): открыть workdir-файл в ОС |
| `GetCommitChangedFiles(repoPath, hash)` | **новый** `commit.files` | History Preview: список A/M/D/R |
| `GetCommitFileDiff(repoPath, hash, filePath)` | **новый** `commit.diff` | History Preview: text diff |
| `GetCommitFileBlob(repoPath, hash, filePath)` | **новый** `commit.blob` | History Preview: image before/after |
| `OpenCommitFileWithDefaultApp(repoPath, hash, filePath)` | **новый** | History Preview: binary stub → temp blob + OS open |
| `GetCommitScreenshot(repoPath, hash)` | **новый** `commit.screenshot` | History Preview: `.blend` binary stub preview |

> `status.get` возвращает **плоские** списки путей, не иерархию. Для Project view (список папок) нужен отдельный метод на Go: обход FS + агрегация + учёт `.dfmignore` и скрытия `.DFM/`.

### 4.1 Формат `status.get` (уже есть)

```json
{
  "current_branch": "main",
  "head_commit": "abc…",
  "staged_new_files": [],
  "staged_modified_files": [],
  "staged_deleted_files": [],
  "unstaged_modified_files": [],
  "unstaged_deleted_files": [],
  "untracked_files": []
}
```

### 4.2 `ListWorkdirTree` (Project view)

```json
{
  "name": "my-project",
  "path": "",
  "item_count": 1200,
  "children": [
    {
      "name": "References",
      "path": "assets/References",
      "item_count": 972,
      "children": []
    }
  ]
}
```

`item_count` — **recursive**. Узлы — **только папки**; файлы не включаются. Дерево отдаётся полностью; UI раскрывает все узлы сразу.

---

## 5. VCS-статусы и toggle «Changed»

### 5.1 Committable files

Файлы, которые можно поместить в коммит — объединение всех непустых списков `status.get` (см. [sidebar-project-view.md](./sidebar-project-view.md) §3.2).

### 5.2 Двойной эффект `showChangedOnly`

| Панель | `false` | `true` |
|--------|---------|--------|
| **Sidebar** | Полное дерево папок | Только папки с committable в поддереве |
| **Content Preview** | Все files в выбранной папке | Только committable files в выбранной папке |

Сигнал: `onProjectViewContextChange({ selectedFolderPath, showChangedOnly })`.

### 5.3 Статусы для badge в Preview

| Статус | Источник |
|--------|----------|
| `staged-new` | `staged_new_files` |
| `staged-modified` | `staged_modified_files` |
| `staged-deleted` | `staged_deleted_files` |
| `modified` | `unstaged_modified_files` |
| `deleted` | `unstaged_deleted_files` |
| `untracked` | `untracked_files` |

---

## 6. Общие corner cases (оба режима)

### 6.1 Репозиторий не открыт

- Rail виден, main panel — empty state: «Open repository».
- Selection = `{ kind: 'none' }`.
- Dropdown disabled.

### 6.2 Путь не является Forester repo

- `GetStatus` → error `not a Forester repository`.
- Показать inline error в header + toast; не падать.

### 6.3 Repo root недоступен

- Диск отмонтирован / нет прав / path deleted.
- `error` в state; список пуст; кнопка «Re-open».

### 6.4 Forester API / Wails binding недоступен

- Skeleton → error banner «Forester unavailable».
- Retry по кнопке.

### 6.5 Конкурентные изменения на диске

- Polling `status.get` каждые N сек (настраиваемо, default 5s) **только когда** `mode === 'project'` или окно в фокусе.
- При расхождении selection (файл удалён) → сбросить selection, toast.

### 6.6 Смена ветки извне (CLI / Blender)

- После refresh: обновить `currentBranch`, `headCommit`.
- History: если `historyBranch` была current — обновить log.
- Project: пересчитать changed lists.

### 6.7 Пустой репозиторий (нет коммитов)

- `head_commit === ""`.
- History: пустой список коммитов, copy «No commits yet».
- Project: папки FS видны; все файлы untracked.

### 6.8 Очень длинные имена / unicode

- Truncate с `title` tooltip.
- Paths всегда хранить relative, slash-normalized (`/`).

### 6.9 Collapse

- `collapsed === true` → только rail (48px) или полностью скрыть (product decision: **v1 = только rail**).
- Selection сохраняется.

### 6.10 Переключение Project ↔ History

- Selection **сбрасывается** (`kind: 'none'`), чтобы Preview не показывал несовместимый контекст.
- **Layout:** History → Content Info **скрыта**, Preview на всю ширину; Project → Content Info снова доступна (v2).
- History Preview: при выборе коммита — auto-select первый changed file (см. [content-preview-history-view.md §5.1](./content-preview-history-view.md)).
- Альтернатива (если понадобится): запоминать last selection per mode — **не в v1**.

---

## 7. Структура файлов (frontend)

```
frontend/src/
  components/sidebar/
    Sidebar.tsx              # shell + rail
    SidebarRail.tsx
    SidebarCollapseButton.tsx
    project/
      ProjectViewPanel.tsx
      ProjectHeader.tsx
      FolderTree.tsx
      FolderTreeRow.tsx
    history/
      HistoryViewPanel.tsx
      HistoryHeader.tsx
      BranchSelector.tsx
      CommitSearch.tsx
      CommitList.tsx
      CommitCard.tsx
      CommitCardMenu.tsx
      CommitCardStats.tsx
  state/
    sidebarStore.ts          # zustand или context
  wails/
    forester.ts              # typed bindings
```

---

## 8. Фазы реализации

| Фаза | Scope |
|------|-------|
| **v1** | Sidebar + Content Preview Project view (grid, multiselect, search, slider) |
| **v1.1** | Thumbnails, virtual scroll polish, changed-count badge on folders |
| **v2** | Content Preview History (diff), Content Info, tree collapse, context menus, fs watcher |

---

## 9. Связанные документы

- [sidebar-project-view.md](./sidebar-project-view.md) — режим папок
- [sidebar-history-view.md](./sidebar-history-view.md) — ветки и коммиты
- [commit-card.md](./commit-card.md) — карточка коммита
- [design-tokens.md](./design-tokens.md) — shadcn/ui цвета (Figma kit)
- [content-preview-project-view.md](./content-preview-project-view.md) — Content Preview (Project view)
- [content-preview-history-view.md](./content-preview-history-view.md) — Content Preview (History / diff)
- [preview-commit-header.md](./preview-commit-header.md) — header коммита в Preview
- [history-changed-file-item.md](./history-changed-file-item.md) — changed file row
- [diff-view.md](./diff-view.md) — Diff view container
- [text-diff-panel.md](./text-diff-panel.md) · [image-diff-panel.md](./image-diff-panel.md) · [binary-diff-stub.md](./binary-diff-stub.md) · [deleted-diff-stub.md](./deleted-diff-stub.md)
- [folder-preview-item.md](./folder-preview-item.md) — item папки
- [file-preview-item.md](./file-preview-item.md) — item файла
- [plan.md](./plan.md) — исходное ТЗ
