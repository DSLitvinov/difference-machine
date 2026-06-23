# Forester GUI — архитектура

Документация для разработчиков. Три панели: **Sidebar**, **Content Preview**, **Content Info**. Sidebar, Content Preview и Content Info (Project) задокументированы.

**Стек:** Wails (Go backend) + React + shadcn/ui  
**Дизайн:** [design-tokens.md](./design-tokens.md) (канон цветов и item states) · Sidebar Project [4026:4812](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4026-4812) · History [4026:4547](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4026-4547)

**Канон:** события §3.1 · API [api-contract.md](./api-contract.md) · пути [paths.md](./paths.md) · multi-repo [multi-repo.md](./multi-repo.md) · resize [panel-layout.md](./panel-layout.md)

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

**Content Preview (History view):** [content-preview-history-view.md](./content-preview-history-view.md) — orchestration. Atoms: [preview-commit-header.md](./preview-commit-header.md) · … **Content Info скрыта**.

**Content Info (Project view):** [content-info-project-view.md](./content-info-project-view.md) — preview, metadata, history (single file only), create commit. Atoms: [info-file-preview-single.md](./info-file-preview-single.md) · [info-file-preview-multi.md](./info-file-preview-multi.md) · [info-metadata-section.md](./info-metadata-section.md) · [info-history-section.md](./info-history-section.md) · [create-commit-dialog.md](./create-commit-dialog.md). **Скрыта в History mode**.

**UX веток (GitHub Desktop):** одно поле `currentBranch` в state. History Sidebar: branch dropdown = `repo.switch` on select ([sidebar-history-view.md §2.6](./sidebar-history-view.md)). Log коммитов всегда для `currentBranch`. File History в Content Info — отдельный read-only filter ветки ([info-history-section.md](./info-history-section.md)).

---

## 2. Компоновка

### 2.0 Режимы окна

| Режим | Панели | Content Preview |
|-------|--------|-----------------|
| **Project view** | Sidebar + Preview + **Content Info** | Grid папок/файлов |
| **History** | **Sidebar + Preview** (Content Info скрыта) | Commit diff layout |

```
Project view:
┌──────────┬─────────────────────────────┬──────────────┐
│ Sidebar  │  Content Preview            │ Content Info │
│ min 334  │  min 747                    │  min 354     │
└──────────┴─────────────────────────────┴──────────────┘
  ◀ resize handles — [panel-layout.md](./panel-layout.md)

History:
┌──────────┬────────────────────────────────────────────┐
│ Sidebar  │  Content Preview (min 747)                 │
│ min 334  │                                            │
└──────────┴────────────────────────────────────────────┘
```

Ширины и max: **[panel-layout.md](./panel-layout.md)**.

### 2.1 Sidebar (общая для обоих режимов)

```
┌──────────┬─────────────────────────────┬──┐
│  Rail    │  Main sidebar panel         │◀ │ resize / collapse
│  (48px)  │  (min 334 total column)     │  │
│          │                             │  │
│  [logo]  │  Header (title + controls)  │  │
│  [proj]  │  Context selector           │  │
│  [hist]  │  Search / toggle (mode-dep)  │  │
│          │  Scrollable list            │  │
│  [⚙]    │                             │  │
│  [user]  │                             │  │
└──────────┴─────────────────────────────┴──┘
```

### 2.2 Rail (левая узкая колонка)

**Figma:** Project [`4026:4812`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4026-4812) · History [`4026:4547`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4026-4547) — узел Settings: `4039:1102` / `4039:1261`.

Вертикальный stack `flex flex-col h-full` (сверху вниз):

| # | Элемент | Иконка (lucide) | Действие |
|---|---------|-----------------|----------|
| 1 | App / home | `GalleryVerticalEnd` | Зарезервировано (about — вне scope v1) |
| 2 | Project view | `FolderGit2` | `sidebarMode = 'project'` |
| 3 | History | `GitFork` | `sidebarMode = 'history'` |
| — | *(spacer)* | — | `flex-1` между mode icons и footer |
| 4 | **Settings** | `Settings` | Открыть [settings-dialog.md](./settings-dialog.md) |
| 5 | User avatar | image 32×32 | Зарезервировано (профиль — вне scope v1) |

Mode icons — блок по центру (`flex-1`, `gap-1`, `p-2`). Footer: Settings → avatar.

#### Settings button

| Property | Spec |
|----------|------|
| Icon | `Settings` 16×16 |
| Hit area | `p-2` (`padding-xxs`), `rounded-sm` |
| Variant | `Button ghost` — как неактивный rail item |
| Active state | **нет** — не toggle |
| Tooltip | `Settings` |
| Collapsed sidebar | **виден** (Rail всегда 48px) |

```ts
onSettingsClick={() => setSettingsOpen(true)}
```

Активный пункт mode rail: `bg-primary text-primary-foreground`. Неактивный — прозрачный + `hover:bg-accent`. Settings **не** получает `bg-primary` при открытом dialog.

### 2.3 Main panel

Общие блоки:

1. **Header** — заголовок режима (`Project view` / `History`).
2. **Context selector** — dropdown:
   - Project view → имя репозитория (basename root path); read-only label **`currentBranch`** под repo name (muted, `text-xs`) — без checkout из Project mode в v1.
   - History → **`BranchSelector`**: `currentBranch`, checkout on select — [sidebar-history-view.md §2.6](./sidebar-history-view.md).
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
| **Selected folder row** | `background/accent` + `border/primary/default` | см. [design-tokens.md §4](./design-tokens.md) — `bg-accent border border-ring rounded-md` |
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
│          │  [selected row — preview item style] │
└──────────┴─────────────────────────────┘
```

### 2.6 shadcn/ui mapping

| UI | shadcn component |
|----|------------------|
| Rail buttons | `Button` variant `ghost` / `secondary` |
| Settings | `Button ghost` + `Settings` icon → `Dialog` |
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
  folderTree: FolderTreeNode | null   // from workdir.tree

  // History view
  commitSearchQuery: string
  selectedCommitHash: string | null

  loading: boolean
  error: string | null
}
```

> **Файлы** не хранятся в Sidebar state. `selectedFilePaths` (multiselect) живёт в [Content Preview store](./content-preview-project-view.md) §9.

### 3.1 События наружу (контракт с Preview / Info)

Полная таблица: [api-contract.md §6](./api-contract.md).

```ts
// History: выбор коммита в Sidebar
type SidebarCommitSelection =
  | { kind: 'none' }
  | { kind: 'commit'; hash: string; branch: string }

// Project: папка + Changed — единственный канал (нет kind: 'folder')
interface ProjectViewContext {
  selectedFolderPath: string   // '' = repo root
  showChangedOnly: boolean
}

// File selection — Content Preview only
type PreviewSelection =
  | { kind: 'none' }
  | { kind: 'files'; paths: string[]; primary: string }

interface SidebarEvents {
  /** History only */
  onSelectionChange(selection: SidebarCommitSelection): void
  onModeChange(mode: SidebarMode): void
  /** Project: folder + Changed toggle */
  onProjectViewContextChange(ctx: ProjectViewContext): void
}
```

| Правило | Поведение |
|---------|-----------|
| Смена `selectedFolderPath` | `PreviewSelection → { kind: 'none' }` |
| Rail Project ↔ History | сброс commit + file selection; **сохранить** `selectedFolderPath`, `showChangedOnly`; `currentBranch` из `branch.list` |
| Смена ветки (checkout) | `repo.switch` → обновить `currentBranch`, log, Project status; сброс commit selection |
| VCS badges / committable | только `status.get` — [api-contract.md §2.1](./api-contract.md) |

### 3.2 Персистентность

| Ключ | Что хранить |
|------|-------------|
| `~/.dfm/setup.cfg` `[current repo] path` | Последний открытый репозиторий (авто-open при старте) |
| `~/.dfm/setup.cfg` `[repo] path_N` | Список добавленных репозиториев |
| `localStorage` `dfm.layout.sidebarWidth` | number — [panel-layout.md](./panel-layout.md) |
| `localStorage` `dfm.layout.infoWidth` | number |
| `localStorage` `dfm.layout.previewWidth` | optional number |
| `localStorage` `dfm.sidebar.collapsed` | boolean |
| `localStorage` `dfm.sidebar.mode` | `project` \| `history` |
| per-repo `dfm.sidebar.showChangedOnly` | boolean |
| per-repo `dfm.sidebar.selectedFolderPath` | string (`''` = root) |

Полная спека multi-repo: [multi-repo.md](./multi-repo.md). Пути: [paths.md](./paths.md). Resize: [panel-layout.md](./panel-layout.md).

При смене репозитория сбрасывать selection, но восстанавливать mode и per-repo prefs (localStorage keyed by `repoPath`).

---

## 4. Backend API

**Канон:** [api-contract.md](./api-contract.md). Wails — thin wrapper `ForesterCall(repoPath, method, args)`.

Краткая сводка:

| Группа | Методы |
|--------|--------|
| **VCS (есть)** | `status.get`, `index.add`, `commit.create`, `commit.get`, `log.get`, `branch.list`, `compare.extract`, `restore.version`, `commit.revert`, `commit.reset`, `lock.list` |
| **VCS (новые)** | `diff.name_status`, `diff.text`, `diff.stat`, `blob.get`, `restore.file`; `log.get` + `path` |
| **Workdir** | `workdir.tree`, `workdir.entries`, `workdir.search`, `workdir.metadata`, `workdir.thumbnail`, `workdir.open` |
| **Shell** | `OpenRepo`, `GetKnownRepos`, … — [multi-repo.md](./multi-repo.md) |

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

### 4.2 `workdir.tree` (Project view)

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

`item_count` — **recursive file count** в поддереве папки. **Одинаковая семантика везде:** `workdir.tree`, `workdir.entries` (`DirEntry` для папок), `FolderPreviewItem`. Узлы дерева — **только папки**; файлы в JSON дерева не возвращаются.

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

- Старт: прочитать `[current repo] path` из `~/.dfm/setup.cfg` → `OpenRepo` ([multi-repo.md §3](./multi-repo.md)).
- Если путь пустой / невалидный: Rail виден, main panel — empty state «Open repository» + **+ Add repository**.
- Selection = `{ kind: 'none' }`.
- Repo selector: dropdown с **+ Add repository** (список пуст).

### 6.2 Путь не является Forester repo

- `status.get` → error `not a Forester repository`.
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
- History: перезагрузить `log.get` для `currentBranch`.
- Project: пересчитать changed lists.

### 6.7 Пустой репозиторий (нет коммитов)

- `head_commit === ""`.
- History: пустой список коммитов, copy «No commits yet».
- Project: папки FS видны; все файлы untracked.

### 6.8 Очень длинные имена / unicode / пути

- Truncate с `title` tooltip; UTF-8 в UI.
- **Relative** (файлы, папки, API, selection): всегда `/` — [paths.md §4](./paths.md).
- **Absolute** (`repoPath`, cfg, FS): нативный ОС — [paths.md §3](./paths.md).
- macOS vs Windows: [paths.md §2](./paths.md), [multi-repo.md §2](./multi-repo.md).

### 6.9 Collapse

- `collapsed === true` → Sidebar column **48px** (только Rail). Min окна в collapse: см. [panel-layout.md §5](./panel-layout.md).
- Folder/commit context **сохраняется**.

### 6.10 Переключение Project ↔ History

- Сброс **PreviewSelection** и **commit selection** (`kind: 'none'`).
- **Persist per-repo:** `selectedFolderPath`, `showChangedOnly`.
- **Layout:** History → Content Info **скрыта**; Project → **видна** (v1 full scope).
- History Preview: auto-select первый changed file — [content-preview-history-view.md §5.1](./content-preview-history-view.md).

---

## 7. Структура файлов (frontend)

```
frontend/src/
  components/sidebar/
    Sidebar.tsx              # shell + rail
    SidebarRail.tsx          # logo, mode icons, Settings, avatar
    SettingsDialog.tsx
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
| **v1 (MVP)** | Full GUI: Sidebar (Project + History) · Preview (Project + History diff) · Content Info · multi-repo · 3-panel resize · commit card ⋮ (full menu) |
| **v1 polish** | Thumbnails, virtual scroll, `+N` multiselect badge, changed-count on folders |
| **v2** | Tree collapse, fs watcher, rename `R` in diff, **branch merge** ([merge-dialog.md](./merge-dialog.md)) |

**Порядок:** backend (`api-contract.md` §7) → shell → panels.

**Окно:** enforce min size — [panel-layout.md §5](./panel-layout.md) (1435px Project / 1081px History).

---

## 9. Связанные документы

- [api-contract.md](./api-contract.md) — JSON API + UI events
- [paths.md](./paths.md) — пути (relative `/`, absolute native, macOS/Windows)
- [panel-layout.md](./panel-layout.md) — resize Sidebar / Preview / Info
- [multi-repo.md](./multi-repo.md) — multi-repo (`~/.dfm/setup.cfg`)
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
- [content-info-project-view.md](./content-info-project-view.md) — Content Info (Project)
- [info-file-preview-single.md](./info-file-preview-single.md) · [info-file-preview-multi.md](./info-file-preview-multi.md) · [info-metadata-section.md](./info-metadata-section.md) · [info-history-section.md](./info-history-section.md) · [create-commit-dialog.md](./create-commit-dialog.md) · [merge-dialog.md](./merge-dialog.md) · [settings-dialog.md](./settings-dialog.md)
- [plan.md](./plan.md) — исходное ТЗ
