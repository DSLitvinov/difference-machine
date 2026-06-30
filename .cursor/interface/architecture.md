# Forester GUI — архитектура

Документация для разработчиков. Три панели: **Sidebar**, **Content Preview**, **Content Info**.

**Стек:** Wails (Go backend) + React + shadcn/ui  
**Дизайн:** [design-tokens.md](./design-tokens.md) (канон цветов и item states) · Sidebar Project [4026:4812](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4026-4812) · All files [4090:4628](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4090-4628) · History [4026:4547](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4026-4547)

**Канон:** события §3.1 · API [api-contract.md](./api-contract.md) · решения [decisions.md](./decisions.md) · пути [paths.md](./paths.md) · multi-repo [multi-repo.md](./multi-repo.md) · resize [panel-layout.md](./panel-layout.md) · план реализации [implementation-plan-v2.md](./implementation-plan-v2.md)

---

## 1. Назначение

Интерфейс разделён на три секции. **Sidebar** управляет режимом просмотра: структура папок рабочей директории (**Project view**) или история веток и коммитов (**History**). В зависимости от режима Content Preview и Content Info меняют layout.

Sidebar управляет выбором **All files / папки**, **ветки/коммита**. Выбор **файла** — в Content Preview, не в Sidebar.

Два режима основной панели:

| Режим | Документ | Кратко |
|-------|----------|--------|
| **Project view** | [sidebar-project-view.md](./sidebar-project-view.md) | **All files** + дерево папок (lazy expand); Changed — в Preview |
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

| # | Элемент | Иконка | Действие |
|---|---------|--------|----------|
| 1 | App / home | `32.svg` app icon (`SidebarRail`) | Зарезервировано (About — [application-menu.md](./application-menu.md) §2.1) |
| 2 | Project view | `FolderGit2` | `sidebarMode = 'project'` |
| 3 | History | `GitFork` | `sidebarMode = 'history'` |
| — | *(spacer)* | — | `flex-1` между **header** (home + modes) и **footer** |
| 4 | **Settings** | `Settings` | Открыть [settings-dialog.md](./settings-dialog.md) |
| 5 | User avatar | image 32×32 | Зарезервировано (профиль — вне scope v1) |

**Header (верх):** Home → Project view → History — один stack `flex flex-col gap-1 p-2` под логотипом.  
**Footer (низ):** Settings → avatar — `flex flex-col gap-1 p-2`. Между ними `flex-1` spacer.

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
| **List Container** (scroll) | `background/default` | `bg-background` (без side border) |
| **Sidebar shell edge** | `border/default` | `border-r border-sidebar-border` на колонке Sidebar в AppShell |
| **Header** | — | `border-b border-border` |
| **Context selector** | `background/default` | `bg-background border-border` |
| **Search input** | `background/default` | `bg-background border-input` |
| **Selected folder row** | `background/accent` | см. [design-tokens.md §4](./design-tokens.md) — `treeRowStateClasses.selected` (`bg-accent rounded-md`) |
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
| Dropdowns | v1.0: `DropdownSelector` / `RepoSelector` — [design-tokens.md §4.5](./design-tokens.md); v1.1: `Popover` + `Command` |
| Search | `Input` |
| Changed toggle | `Switch` + `Label` — **Content Preview toolbar** ([content-preview-project-view.md §2.1](./content-preview-project-view.md)) |
| Folder tree rows | `FolderTreeRow` + virtual scroll |
| Commit cards | `Card` + `Badge` + `Tooltip` + `DropdownMenu` |
| Scroll area | `ScrollArea` |
| Empty / loading | `Skeleton` |

### 2.7 Application menu (macOS)

Нативное меню Wails в строке меню ОС — **не** in-app dropdowns.

Полная спека: **[application-menu.md](./application-menu.md)**.

| Подменю | Кратко |
|---------|--------|
| **Difference Machine** | `menu.AppMenu()` — About, Quit |
| **View** | Settings `⌘,`, Project `⌘1`, History `⌘2`, Toggle Sidebar `⌘B` |
| **Edit** | `menu.EditMenu()` — Cut/Copy/Paste в WebView |
| **Window** | Minimize `⌘M`, Zoom `⌃⌘F` |

События `gui:open-settings`, `gui:switch-mode`, `gui:toggle-sidebar` → `AppShell` ([api-contract.md §6](./api-contract.md)).

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
  selectedFolderPath: string | null   // relative; '*' = All files; folder path otherwise
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
  selectedFolderPath: string   // '*' = All files; folder rel path otherwise
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
  /** Project: folder (Sidebar/Preview) + Changed (Preview toolbar) */
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
| per-repo `dfm.sidebar.selectedFolderPath` | string (`'*'` = All files default) |
| per-repo `dfm.sidebar.expandedPaths` | JSON string array, capped at 512 expanded folder paths |
| `localStorage` `dfm.debug.performance` | `"true"` enables `[dfm:perf]` console timings |

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
| **Workdir** | `workdir.tree`, `workdir.entries`, `workdir.entries_by_paths`, `workdir.search`, `workdir.metadata`, `workdir.thumbnail`, `workdir.open`, `workdir.rename`, `workdir.delete` |
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

Исключения при сканировании (`.DFM`, файл `.dfmignore`, паттерны ignore): [api-contract.md §4.0](./api-contract.md).

---

## 5. VCS-статусы и toggle «Changed»

Toggle **Changed** — UI в **Content Preview toolbar** ([content-preview-project-view.md §2.1](./content-preview-project-view.md)). State `showChangedOnly` в project store; persist per-repo (`dfm.sidebar.showChangedOnly` — legacy key).

### 5.1 Committable files

Файлы, которые можно поместить в коммит — объединение всех непустых списков `status.get` (см. [sidebar-project-view.md](./sidebar-project-view.md) §3.2).

### 5.2 Двойной эффект `showChangedOnly`

| Панель | `false` | `true` |
|--------|---------|--------|
| **Sidebar** | Полное дерево папок | Только папки с committable в поддереве |
| **Content Preview** | All files (`'*'`) или immediate files в папке | Committable в scope (весь репо или поддерево папки) |

Сигнал: `onProjectViewContextChange({ selectedFolderPath, showChangedOnly })`.

### 5.3 Статусы для badge в Preview

| Статус | Badge | Источник |
|--------|-------|----------|
| `staged-new` | `A` | `staged_new_files` |
| `staged-modified` | `M` | `staged_modified_files` |
| `staged-deleted` | `D` | `staged_deleted_files` |
| `modified` | `M` | `unstaged_modified_files` |
| `deleted` | `D` | `unstaged_deleted_files` |
| `untracked` | `N` | `untracked_files` |

Цвета: `vcsStatusBadgeClass` — [design-tokens.md §3.5](./design-tokens.md). Lock badge (`lock`) — отдельно, `lock.list`.

---

## 6. Общие corner cases (оба режима)

### 6.1 Репозиторий не открыт

- Старт: прочитать `[current repo] path` из `~/.dfm/setup.cfg` → `OpenRepo` ([multi-repo.md §3](./multi-repo.md)).
- Если путь пустой / невалидный: Rail виден, main panel — empty state «Open repository» + **+ Add repository**.
- Selection = `{ kind: 'none' }`.
- Repo selector: dropdown с **+ Add repository** (список пуст).

### 6.2 Путь не является Forester repo

- При **Add repository** / folder picker: [init-repository-dialog.md](./init-repository-dialog.md).
- **Cancel** → `not a Forester repository` в `appStore.error`; toast destructive (`AppToast`), **не** в Sidebar.
- **Create** → `repo.init` + добавление в список.
- При открытии уже добавленного битого пути: `status.get` → error `not a Forester repository`; toast + **Re-open…**.

### 6.3 Repo root недоступен

- Диск отмонтирован / нет прав / path deleted.
- `error` в state; список пуст; toast + **Re-open…**.

### 6.4 Forester API / Wails binding недоступен

- `foresterError` → toast «Forester unavailable» + **Re-open** / **Retry** (`AppToast`).
- Retry по кнопке.

### 6.5 Конкурентные изменения на диске

- **Fs watcher:** OS `fsnotify` на workdir → Wails event `workdir:changed` → debounced refresh `status.get` + `workdir.tree` / entries (Project mode). Реализация: `sources/gui/internal/workdirwatch/`.
- **Polling fallback:** `status.get` каждые 5s + window focus ([decisions.md §8.6](./decisions.md)).
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

**Project → History**

1. Сброс **PreviewSelection** (файлы Project view).
2. Загрузка `log.get` для `currentBranch`.
3. **Auto-select коммит:** saved `dfm.history.selectedCommitHash` (если в log) или **первый** в списке — [sidebar-history-view.md §4.1](./sidebar-history-view.md).
4. Content Preview: **auto-select первый changed file** + diff — [content-preview-history-view.md §4.1](./content-preview-history-view.md).
5. Content Info **скрыта**.

**History → Project**

1. Сброс `selectedCommitHash` и file selection.
2. **Persist per-repo:** `selectedFolderPath`, `showChangedOnly`.
3. Content Info **видна**.

---

## 7. Структура файлов (frontend)

Wails app: **`sources/gui/`** ([decisions.md §2](./decisions.md)).

```
sources/gui/
  main.go
  menu.go                    # native application menu — application-menu.md
  app.go
  frontend/src/
    components/shell/
      AppShell.tsx           # EventsOn: gui:open-settings, gui:switch-mode, …
      SidebarRail.tsx
    lib/
      sidebarModeSwitch.ts
    components/sidebar/
      ProjectSidebarPanel.tsx
      HistorySidebarPanel.tsx
      …
    wails/
      forester.ts
```

---

## 8. Статус реализации

Канон активного статуса: [implementation-plan-v2.md](./implementation-plan-v2.md). Этот раздел фиксирует, какие крупные блоки уже реализованы, а не будущий roadmap.

| Scope | Status |
|-------|--------|
| v1.0/v1.1 shell, Project, History, diff, Content Info, Settings, commit flow | Реализовано |
| Commit card stats + full menu | Реализовано |
| Merge UI | Реализовано — [merge-dialog.md](./merge-dialog.md) |
| Fs watcher | Реализовано — `sources/gui/internal/workdirwatch/` |
| Detached HEAD banner | Реализовано |
| Rename `R` in diff | Реализовано |
| Branch delete and init repository wizard | Реализовано |
| Sidebar **All files** + expand/collapse toggle | Реализовано — [sidebar-project-view.md](./sidebar-project-view.md) |
| Changed toggle в Preview toolbar | Реализовано — [content-preview-project-view.md §2.1](./content-preview-project-view.md) |
| Platform hardening | Windows QA and Linux build remain tracked in [implementation-plan-v2.md](./implementation-plan-v2.md) |

---

## 9. Карта документации (GUI)

Atom-спеки и инфраструктура. При конфликте — [decisions.md](./decisions.md).

| Область | Документы |
|---------|-----------|
| Токены / цвета | [design-tokens.md](./design-tokens.md) |
| API + UI events | [api-contract.md](./api-contract.md) |
| Пути | [paths.md](./paths.md) |
| Multi-repo | [multi-repo.md](./multi-repo.md) |
| Resize панелей | [panel-layout.md](./panel-layout.md) |
| Settings | [settings-dialog.md](./settings-dialog.md) |
| Application menu | [application-menu.md](./application-menu.md) |
| Installers | [macos-installer.md](./macos-installer.md) · [windows-installer.md](./windows-installer.md) · [linux-installer.md](./linux-installer.md) |
| **Sidebar** | [sidebar-project-view.md](./sidebar-project-view.md) · [sidebar-history-view.md](./sidebar-history-view.md) · [commit-card.md](./commit-card.md) |
| **Content Preview (Project)** | [content-preview-project-view.md](./content-preview-project-view.md) · [file-viewer.md](./file-viewer.md) · [file-history-view.md](./file-history-view.md) · [folder-preview-item.md](./folder-preview-item.md) · [file-preview-item.md](./file-preview-item.md) |
| **Content Preview (History)** | [content-preview-history-view.md](./content-preview-history-view.md) · [preview-commit-header.md](./preview-commit-header.md) · [history-changed-file-item.md](./history-changed-file-item.md) · [diff-view.md](./diff-view.md) · [text-diff-panel.md](./text-diff-panel.md) · [image-diff-panel.md](./image-diff-panel.md) · [binary-diff-stub.md](./binary-diff-stub.md) · [deleted-diff-stub.md](./deleted-diff-stub.md) |
| **Content Info** | [content-info-project-view.md](./content-info-project-view.md) · [info-file-preview-single.md](./info-file-preview-single.md) · [info-file-preview-multi.md](./info-file-preview-multi.md) · [info-file-preview-tile.md](./info-file-preview-tile.md) · [info-metadata-section.md](./info-metadata-section.md) · [info-history-section.md](./info-history-section.md) |
| **Dialogs** | [create-commit-dialog.md](./create-commit-dialog.md) · [dirty-branch-switch-dialog.md](./dirty-branch-switch-dialog.md) · [create-branch-dialog.md](./create-branch-dialog.md) · [init-repository-dialog.md](./init-repository-dialog.md) · [merge-dialog.md](./merge-dialog.md) |

**MVP (shipped):** Shell + multi-repo + 3-panel resize · Sidebar (Project + History) · Content Preview · Content Info · Create commit · dirty branch dialog. **Branch UX:** GitHub Desktop — `currentBranch`; History dropdown = checkout on select.

**План реализации:** [implementation-plan.md](./implementation-plan.md) (v1, закрыт) · [implementation-plan-v2.md](./implementation-plan-v2.md) (активный).
