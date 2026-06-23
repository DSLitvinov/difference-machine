# Forester GUI — план реализации (v1.0)

Живой чеклист для возобновления работы после прерывания.

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

**Forester runtime:** `./builder/build.sh --write-local-config` → `~/dfm_distr/bin/forester`. Blender не нужен.

**Запуск:** `cd sources/gui && wails dev` · **сборка:** `wails build`

---

## Сейчас (обновляйте при каждой сессии)

| Поле | Значение |
|------|----------|
| **Последнее обновление** | 2025-06-23 |
| **Активная фаза** | **7 — Сборка и smoke** |
| **Следующий шаг** | `7.4` smoke checklist · `3.2.1` toolbar (back/forward, search, slider) |
| **Заметки** | 3-panel resize + persist; shadcn dropdown fixes |

### Прогресс v1.0

| Фаза | Название | Статус |
|------|----------|--------|
| 0 | Подготовка | `[x]` 6/6 |
| 1 | Backend API | `[~]` 10/17 |
| 2 | Slice 1 — Shell + OpenRepo | `[~]` 12/12 |
| 3 | Slice 2 — Project browse | `[x]` 15/15 |
| 4 | Slice 3 — Create commit | `[x]` 10/10 |
| 5 | Slice 4 — History + diff | `[x]` 17/17 |
| 6 | Slice 5 — Polish + Settings | `[x]` 8/9 |
| 7 | Сборка и smoke | `[ ]` 1/4 |

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
- [x] **1.1.2** `workdir.entries` — pagination `{ path, offset, limit }`
- [x] **1.1.3** `workdir.metadata` — stat + mime
- [x] **1.1.4** `workdir.open` — OS default app (macOS / Windows)
- [ ] **1.1.5** `workdir.search` — global search по репо
- [ ] **1.1.6** `workdir.thumbnail` — placeholder (icon по mime)

### 1.2 Diff / blob

- [x] **1.2.1** `diff.name_status` — `from: null` для initial commit
- [x] **1.2.2** `diff.text` — unified; error `file_too_large` > 5 MB
- [x] **1.2.3** `diff.stat` — для PreviewCommitHeader (одиночный вызов)
- [x] **1.2.4** `blob.get` — base64 + mime; лимит 5 MB

### 1.3 Log / restore

- [x] **1.3.1** `log.get` + filter `path` (file history)
- [x] **1.3.2** `restore.file` — single/multi path

### 1.4 App shell (Wails, не jsonapi)

- [ ] **1.4.1** `GetKnownRepos` / `GetCurrentRepoPath`
- [ ] **1.4.2** `AddKnownRepo` / `RemoveKnownRepo` — [multi-repo.md](./multi-repo.md)
- [ ] **1.4.3** `OpenRepo` — validate `.DFM` + `status.get`
- [ ] **1.4.4** `SetCurrentRepoPath` — atomic write `setup.cfg`
- [ ] **1.4.5** `GetRepoUser` / `SetRepoUser` — `[user].name`
- [ ] **1.4.6** `settings.get` / `settings.save` (partial cfg)
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
- [x] **2.2.5** Corner cases: invalid path, not a repo (toast via error state)

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

- [~] **3.2.1** Toolbar: breadcrumb drill-down, search, sort, size slider
- [x] **3.2.2** Folders section + Files grid — `workdir.entries` (pagination, load more)
- [x] **3.2.3** `FolderPreviewItem` / `FilePreviewItem` — [folder-preview-item.md](./folder-preview-item.md) · [file-preview-item.md](./file-preview-item.md)
- [x] **3.2.4** VCS badges из `status.get` only
- [x] **3.2.5** Changed ON → hide Folders section; filter committable files
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
- [x] **4.1.4** `InfoHistorySection` — branch/commit combobox, Revert, Compare — [info-history-section.md](./info-history-section.md)
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
- [x] **5.1.5** v1.0: **без** files-changed row; ⋮ menu урезанное — [decisions.md §6](./decisions.md)
- [x] **5.1.6** `log.get` cap 100 + hint
- [x] **5.1.7** persist `selectedCommitHash` per repo; no auto-select on enter
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
- [x] **6.2.4** Tab Forester — read-only paths
- [—] **6.2.5** `[—]` Appearance / External editors → v1.1

### 6.3 Доработки

- [x] **6.3.1** History ↔ Project mode switch — сброс selection по [architecture.md §3.1](./architecture.md)
- [~] **6.3.2** Corner cases §6 из [architecture.md](./architecture.md) — пройти чеклист
- [x] **6.3.3** Keyboard a11y на commit list (roving tabindex)

**Проверка:** multiselect → multi Info; Settings save author; resize persist после restart.

---

## Фаза 7 — Сборка и smoke

- [ ] **7.1** `wails build` macOS — **done once** 2025-06-23
- [ ] **7.2** `wails build` Windows (CI или ручная машина)
- [ ] **7.3** Интеграция в `builder/` (опционально v1.0)
- [ ] **7.4** Smoke script / чеклист E2E вручную:

| # | Сценарий |
|---|----------|
| 1 | Cold start → auto-open last repo |
| 2 | Add repo → browse → select file |
| 3 | Create commit |
| 4 | History → select commit → text diff |
| 5 | Switch branch clean + dirty (stash) |
| 6 | Revert file from Info History |

---

## v1.1 — backlog (не блокирует v1.0)

Отмечать `[x]` только после явного старта v1.1.

- [—] Fully expanded folder tree + virtual scroll
- [—] Marquee + Shift-range multiselect
- [—] Real thumbnails
- [—] Dark theme + Appearance tab
- [—] External editors tab
- [—] `diff.stat` на commit cards
- [—] Commit card full ⋮ menu (destructive)
- [—] Init repository wizard
- [—] Linux build + QA

---

## v2 — backlog

- [—] [merge-dialog.md](./merge-dialog.md) + `merge.*` API
- [—] Fs watcher
- [—] Rename `R` в diff
- [—] Detached HEAD UI
- [—] Branch create/delete в GUI

---

## Журнал сессий (опционально)

| Дата | Фаза | Сделано | Следующий шаг |
|------|------|---------|---------------|
| 2025-06-23 | 0 + 2 | Wails bootstrap, pkg/jsonapi, shell, OpenRepo, Rail | `workdir.tree` или RepoSelector dropdown |
| 2025-06-23 | 5–6 | Slice 4 History+diff; Slice 5 Settings+multiselect | Smoke / Windows build |
| 2025-06-23 | 7 | shadcn migration; 3-panel resize + persist | Smoke checklist · toolbar polish |
