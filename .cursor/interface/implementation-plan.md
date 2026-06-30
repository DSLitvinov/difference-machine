# Forester GUI — план реализации (v1.0 / v1.1)

Живой чеклист **закрытого** scope v1.0 и v1.1. QA и v2 — [implementation-plan-v2.md](./implementation-plan-v2.md).

**Канон scope:** [decisions.md](./decisions.md) · **API:** [api-contract.md](./api-contract.md) · **архитектура:** [architecture.md](./architecture.md)

---

## Как пользоваться

1. Перед паузой — отметьте `[x]` выполненные шаги и обновите блок **«Сейчас»** ниже.
2. После возврата — читайте **«Сейчас»** → первый незакрытый `[ ]` в активной фазе.
3. Definition of done фазы — все `[x]` в секции фазы + краткая проверка в **«Проверка»**.
4. Не отмечайте родительский шаг `[x]`, пока не закрыты все вложенные подпункты (если есть).

### Легенда

| Маркер | Значение |
|--------|----------|
| `[ ]` | Не начато |
| `[~]` | В работе (замените на `[x]` по завершении) |
| `[x]` | Готово |
| `[—]` | Отложено (v1.1 / v2) |

---

## Prerequisites (окружение)

Установить **до фазы 0**. Проверка: `wails doctor` → SUCCESS.

| Компонент | Версия | macOS | Windows |
|-----------|--------|-------|---------|
| **Go** | 1.22+; 1.23.3+ на macOS 15+ | `brew install go` | [go.dev/dl](https://go.dev/dl/) |
| **Node.js** | 20 или 22 LTS | `brew install node` | [nodejs.org](https://nodejs.org/) |
| **Wails v2 CLI** | latest | `go install github.com/wailsapp/wails/v2/cmd/wails@latest` | то же |
| **Xcode CLT** | — | `xcode-select --install` | — |
| **WebView2** | — | встроено | `wails doctor` |

`PATH` += `$(go env GOPATH)/bin`.

**Forester runtime:** `./builder/macos/build.sh --write-local-config` → `builder/dist/payload/bin/forester`. Blender не нужен.

**Сборка GUI:** `./builder/macos/build.sh --gui` → `builder/dist/payload/apps/`. **Release DMG:** `./builder/macos/build.sh --dmg` → `builder/dist/DifferenceMachine-*-macos.dmg` — [macos-installer.md](./macos-installer.md).

---

## Сейчас (обновляйте при каждой сессии)

| Поле | Значение |
|------|----------|
| **Последнее обновление** | 2026-06-25 |
| **Статус** | **v1.0 / v1.1 archived** · v2 feature scope complete |
| **Дальше** | [implementation-plan-v2.md](./implementation-plan-v2.md) — release hardening: Windows QA + Linux build |
| **Заметки** | Historical checklist; do not use as active next-step source |

### Прогресс v1.0

| Фаза | Название | Статус |
|------|----------|--------|
| 0 | Подготовка | `[x]` 6/6 |
| 1 | Backend API | `[x]` 17/17 |
| 2 | Slice 1 — Shell + OpenRepo | `[x]` 12/12 |
| 3 | Slice 2 — Project browse | `[x]` 15/15 |
| 4 | Slice 3 — Create commit | `[x]` 10/10 |
| 5 | Slice 4 — History + diff | `[x]` 17/17 |
| 6 | Slice 5 — Polish + Settings | `[x]` 9/9 |
| 7 | Сборка (macOS) | `[x]` 3/3 |
| 8 | v1.1 polish | `[x]` 10/10 |

---

## Фаза 0 — Подготовка

- [x] **0.1** Создать Wails-проект `sources/gui/` (`main.go`, `wails.json`, `frontend/`)
- [x] **0.2** React + TypeScript + Vite + Tailwind + shadcn/ui (Zinc light)
- [x] **0.3** Подключить `design-tokens.md` → `globals.css` / `tailwind.config`
- [x] **0.4** Go-модуль GUI: `forester/pkg/jsonapi` (обёртка над `internal/jsonapi`)
- [x] **0.5** Чтение `~/.dfm/setup.cfg`: путь к forester binary (`[forester].path`)
- [x] **0.6** Утилиты путей: `CanonicalAbsPath`, `SamePath` — `internal/paths/`

**Проверка:** `wails build` — OK (`build/bin/difference-machine-gui.app`).

---

## Фаза 1 — Backend API (`jsonapi`)

Регистрация в `dispatch.go` + тесты в `integration_test.go`.

### 1.1 Workdir

- [x] **1.1.1** `workdir.tree` — lazy `{ path, depth }` — [api-contract.md §4.1](./api-contract.md)
- [x] **1.1.2** `workdir.entries` — pagination `{ path, offset, limit }`; файлы: `modified`, `created`
- [x] **1.1.2a** `workdir.entries_by_paths` — `DirEntry[]` по списку paths (Changed ON)
- [x] **1.1.3** `workdir.metadata` — stat + mime
- [x] **1.1.4** `workdir.open` — OS default app (macOS / Windows)
- [x] **1.1.5** `workdir.search` — global search по репо
- [x] **1.1.6** `workdir.thumbnail` — images, text snippet, `.blend` (OS cache + embedded) — [api-contract.md §4.3](./api-contract.md)

### 1.2 Diff / blob

- [x] **1.2.1** `diff.name_status` — `from: null` для initial commit
- [x] **1.2.2** `diff.text` — unified; error `file_too_large` > 5 MB
- [x] **1.2.3** `diff.stat` — для PreviewCommitHeader (одиночный вызов)
- [x] **1.2.4** `blob.get` — base64 + mime; лимит 5 MB

### 1.3 Log / restore

- [x] **1.3.1** `log.get` + filter `path` (file history)
- [x] **1.3.2** `restore.file` — single/multi path

### 1.4 App shell (Wails, не jsonapi)

- [x] **1.4.1** `GetKnownRepos` / `GetCurrentRepoPath`
- [x] **1.4.2** `AddKnownRepo` / `RemoveKnownRepo` — [multi-repo.md](./multi-repo.md)
- [x] **1.4.2a** `IsForesterRepository` / `InitRepository` — [init-repository-dialog.md](./init-repository-dialog.md)
- [x] **1.4.3** `OpenRepo` — validate `.DFM` + `status.get`
- [x] **1.4.4** `SetCurrentRepoPath` — atomic write `setup.cfg`
- [x] **1.4.5** `GetRepoUser` / `SetRepoUser` — `[user].name`
- [x] **1.4.6** `settings.get` / `settings.save` (partial cfg)
- [~] **1.4.7** (optional) `commit.get` + `screenshot_base64` для `.blend` stub

**Проверка:** `go test ./internal/jsonapi/...` зелёный; ручной вызов новых методов из тестового handler.

---

## Фаза 2 — Slice 1: Shell + OpenRepo

Спеки: [architecture.md §2](./architecture.md) · [multi-repo.md](./multi-repo.md) · [panel-layout.md](./panel-layout.md)

### 2.1 Layout shell

- [x] **2.1.1** `AppShell`: Rail 48px + 3-column layout (без resize handles)
- [x] **2.1.2** `SidebarRail` — mode icons (Project / History), Settings, avatar placeholder
- [x] **2.1.3** `SetMinSize` — 1435×720
- [x] **2.1.4** localStorage: `dfm.layout.*`, `dfm.sidebar.collapsed`, `dfm.sidebar.mode`
- [x] **2.1.5** Sidebar collapse → Rail only (+ expand button)

### 2.2 Multi-repo

- [x] **2.2.1** Startup: read `[current repo]` → `OpenRepo`
- [x] **2.2.2** Empty state: «Open repository» + **+ Add repository**
- [x] **2.2.3** `RepoSelector` dropdown — [multi-repo.md §3](./multi-repo.md)
- [x] **2.2.4** Native folder picker → `AddKnownRepo`
- [x] **2.2.5** `InitRepositoryDialog` — [init-repository-dialog.md](./init-repository-dialog.md)
- [x] **2.2.6** Corner cases: invalid path; not a repo → dialog или error

### 2.3 State foundation

- [x] **2.3.1** `appStore` (zustand): `mode`, `repoPath`, `collapsed`, loading, error
- [x] **2.3.2** Wails bindings + `wails/bridge.ts`
- [x] **2.3.3** Error banner «Forester unavailable» + Retry

**Проверка:** добавить репо → виден basename; перезапуск → авто-open; пустой cfg → empty state.

---

## Фаза 3 — Slice 2: Project browse

Спеки: [sidebar-project-view.md](./sidebar-project-view.md) · [content-preview-project-view.md](./content-preview-project-view.md)

### 3.1 Sidebar — Project view

- [x] **3.1.1** `ProjectViewPanel` — header, Changed toggle, repo selector
- [x] **3.1.2** Read-only `currentBranch` под repo name
- [x] **3.1.3** `FolderTree` — lazy expand — [decisions.md §5](./decisions.md)
- [x] **3.1.4** `FolderTreeRow` — states — [design-tokens.md §4](./design-tokens.md)
- [x] **3.1.5** Toggle Changed → filter tree + emit `onProjectViewContextChange`
- [x] **3.1.6** per-repo persist: `selectedFolderPath`, `showChangedOnly`

### 3.2 Content Preview — Project view

- [x] **3.2.1** Toolbar: breadcrumb drill-down, search, sort (name + date), extension filter, size slider
- [x] **3.2.2** Folders section + Files grid — `workdir.entries` (pagination, load more)
- [x] **3.2.3** `FolderPreviewItem` / `FilePreviewItem` — [folder-preview-item.md](./folder-preview-item.md) · [file-preview-item.md](./file-preview-item.md)
- [x] **3.2.4** VCS badges из `status.get` only
- [x] **3.2.5** Changed ON → hide Folders section; recursive committable flat list
- [x] **3.2.6** Double-click file → `workdir.open`
- [x] **3.2.7** `onPreviewSelectionChange` — single file select (multiselect в фазе 6)
- [x] **3.2.8** Смена папки → сброс file selection

### 3.3 Content Info — stub

- [x] **3.3.1** Панель видна в Project mode; empty state при `selection: none`
- [x] **3.3.2** Resize Info column — [panel-layout.md](./panel-layout.md)

### 3.4 Polling

- [x] **3.4.1** `status.get` каждые 5s в Project mode + on window focus
- [x] **3.4.2** Файл удалён → сброс selection + toast

**Проверка:** дерево lazy; клик папки → файлы; badges; Changed filter; drill-down.

---

## Фаза 4 — Slice 3: Create commit

Спеки: [content-info-project-view.md](./content-info-project-view.md) · [create-commit-dialog.md](./create-commit-dialog.md)

### 4.1 Content Info — single file

- [x] **4.1.1** `InfoFilePreviewSingle` — [info-file-preview-single.md](./info-file-preview-single.md)
- [x] **4.1.2** `InfoMetadataSection` — FS metadata, hide empty — [info-metadata-section.md](./info-metadata-section.md)
- [x] **4.1.3** Lock badge read-only — `lock.list`
- [x] **4.1.4** `InfoHistorySection` — **Views History** или Alert «нет истории»; branch/commit/Revert/Compare перенесены в File History View — [info-history-section.md](./info-history-section.md)
- [x] **4.1.5** `restore.file` + AlertDialog; `compare.extract` + toast

### 4.2 Create commit

- [x] **4.2.1** Footer button → pre-step `index.add` (selected committable only)
- [x] **4.2.2** `CreateCommitDialog` — [create-commit-dialog.md](./create-commit-dialog.md)
- [x] **4.2.3** Author read-only from `setup.cfg`
- [x] **4.2.4** Success → toast, refresh status; остаться в Project view

**Проверка:** select file → metadata; create commit из selection; hook error → toast.

---

## Фаза 5 — Slice 4: History + diff

Спеки: [sidebar-history-view.md](./sidebar-history-view.md) · [content-preview-history-view.md](./content-preview-history-view.md)

### 5.1 Sidebar — History view

- [x] **5.1.1** `HistoryViewPanel` — header, branch selector, search
- [x] **5.1.2** `BranchSelector` — checkout on select — [sidebar-history-view.md §2.6](./sidebar-history-view.md)
- [x] **5.1.3** `DirtyBranchSwitchDialog` — [dirty-branch-switch-dialog.md](./dirty-branch-switch-dialog.md)
- [x] **5.1.4** `CommitList` + `CommitCard` — [commit-card.md](./commit-card.md)
- [x] **5.1.5** Historical v1.0: без files-changed row; later scope shipped full menu — [decisions.md §6](./decisions.md)
- [x] **5.1.6** `log.get` cap 100 + hint
- [x] **5.1.7** persist `selectedCommitHash` per repo; auto-select first commit on History enter (saved or newest)
- [x] **5.1.8** Rail → History: скрыть Content Info

### 5.2 Content Preview — History view

- [x] **5.2.1** `PreviewCommitHeader` + `diff.stat` — [preview-commit-header.md](./preview-commit-header.md)
- [x] **5.2.2** Changed files list — resizable ~373px — [history-changed-file-item.md](./history-changed-file-item.md)
- [x] **5.2.3** Auto-select first file A→Z on commit select
- [x] **5.2.4** `DiffView` routing — [diff-view.md](./diff-view.md)
- [x] **5.2.5** `TextDiffPanel` — Unified default, Split client-side — [text-diff-panel.md](./text-diff-panel.md)
- [x] **5.2.6** `ImageDiffPanel` — Split / Overlay — [image-diff-panel.md](./image-diff-panel.md)
- [x] **5.2.7** `BinaryDiffStub` — `.blend` screenshot — [binary-diff-stub.md](./binary-diff-stub.md)
- [x] **5.2.8** `DeletedDiffStub` — [deleted-diff-stub.md](./deleted-diff-stub.md)
- [x] **5.2.9** Abort stale diff requests; `file_too_large` stub

**Проверка:** branch switch + dirty dialog; commit → diff text/image/binary; initial commit all-added.

---

## Фаза 6 — Slice 5: Polish + Settings

### 6.1 Multiselect + Info multi

- [x] **6.1.1** Ctrl/Cmd toggle multiselect — [decisions.md §5](./decisions.md)
- [x] **6.1.2** `InfoFilePreviewMulti` + tiles — [info-file-preview-multi.md](./info-file-preview-multi.md)
- [x] **6.1.3** History section скрыта при multiselect

### 6.2 Settings

- [x] **6.2.1** `SettingsDialog` — large modal — [settings-dialog.md](./settings-dialog.md)
- [x] **6.2.2** Tab Profile — author name
- [x] **6.2.3** Tab Repositories — add/remove list
- [x] **6.2.4** Tab Forester — paths (CLI, Blender, addon)
- [x] **6.2.5** Appearance + External editors — [settings-dialog.md](./settings-dialog.md) (перенесено из v1.1 backlog)

### 6.3 Доработки

- [x] **6.3.1** History ↔ Project mode switch — сброс selection по [architecture.md §3.1](./architecture.md)
- [x] **6.3.2** Corner cases §6 из [architecture.md](./architecture.md) — код; ручной прогон → [implementation-plan-v2.md §1.3](./implementation-plan-v2.md)
- [x] **6.3.3** Keyboard a11y на commit list (roving tabindex)

**Проверка:** multiselect → multi Info; Settings save author; resize persist после restart.

---

## Фаза 7 — Сборка (macOS v1.0)

- [x] **7.1** `wails build` macOS
- [—] **7.2** `wails build` Windows — **v2** [implementation-plan-v2.md §2](./implementation-plan-v2.md)
- [x] **7.3** Интеграция GUI в `builder/` — `./builder/build.sh --gui` (macOS)

Ручной QA → **v2 фаза 1** — [implementation-plan-v2.md](./implementation-plan-v2.md)

---

## Фаза 8 — v1.1 polish

Спеки: [architecture.md §9](./architecture.md) · [decisions.md §3](./decisions.md)

### 8.1 Commit card stats

- [x] **8.1.1** Lazy `diff.stat` per commit — `IntersectionObserver` + cache (`commitStatsCache.ts`)
- [x] **8.1.2** `CommitCardStats` — строка `N files changed` +/− — [commit-card.md §2.4](./commit-card.md)
- [x] **8.1.3** Skeleton / hide on error

### 8.2 Commit card ⋮ menu (full)

- [x] **8.2.1** Compare, Restore version, Revert — [commit-card.md §6](./commit-card.md)
- [x] **8.2.2** `AlertDialog` для destructive actions
- [x] **8.2.3** Disable Revert на HEAD

### 8.3 Project Preview UX

- [x] **8.3.1** Virtual scroll для file grid — [decisions.md §7.5](./decisions.md)
- [x] **8.3.2** Folder tree expand/collapse toggle + lazy по умолчанию

### 8.4 Прочее v1.1

- [x] **8.4.1** Dark theme + Appearance tab
- [x] **8.4.2** External editors tab + macOS `.app` resolve
- [x] **8.4.3** Marquee + Shift-range multiselect (базово)
- [x] **8.4.4** Create branch dialog — [create-branch-dialog.md](./create-branch-dialog.md)
- [x] **8.4.5** Global errors → Toast (`AppToast`)
- [x] **8.4.6** Project sidebar header `bg-sidebar` (как History)
- [x] **8.4.7** Native application menu (macOS) — [application-menu.md](./application-menu.md)
- [x] **8.4.8** Init repository wizard — shipped in v2 feature scope
- [—] **8.4.9** Linux build + QA — active in [implementation-plan-v2.md §9](./implementation-plan-v2.md)

**Проверка:** код и автосборка; ручной QA — [implementation-plan-v2.md §1](./implementation-plan-v2.md).

---

## v1.1 — backlog (сводка)

Уже в фазе 8 или закрыто досрочно:

- [x] Real thumbnails (images + `.blend` workdir cache)
- [x] Dark theme + Appearance tab
- [x] External editors tab
- [x] Marquee + Shift-range multiselect (базово)
- [x] Create branch (GUI)
- [x] `diff.stat` на commit cards → **8.1**
- [x] Commit card full ⋮ menu → **8.2**
- [x] Virtual scroll + expanded tree → **8.3**
- [—] Init repository wizard
- [—] Linux build + QA

---

## v2

Полный план и backlog: **[implementation-plan-v2.md](./implementation-plan-v2.md)**

---

## Журнал сессий (опционально)

| Дата | Фаза | Сделано | Следующий шаг |
|------|------|---------|---------------|
| 2025-06-23 | 0 + 2 | Wails bootstrap, pkg/jsonapi, shell, OpenRepo, Rail | `workdir.tree` или RepoSelector dropdown |
| 2025-06-23 | 5–6 | Slice 4 History+diff; Slice 5 Settings+multiselect | Smoke / Windows build |
| 2025-06-23 | 7 | shadcn migration; 3-panel resize + persist | Smoke checklist · toolbar polish |
| 2025-06-23 | 3 + 7 | Project toolbar; `workdir.search` API | Smoke checklist |
| 2025-06-23 | 6 + 7 | Corner cases; wails build | Ручной QA |
| 2025-06-24 | 7→8 | Windows/Linux build отложены; v1.0 macOS scope закрыт | **8.1** commit card stats |
| 2025-06-24 | 8 | v1.1 code complete; QA → v2 | [implementation-plan-v2.md](./implementation-plan-v2.md) фаза 1 |
| 2025-06-24 | v2·1 | Smoke macOS complete | **3.1** Merge UI |
