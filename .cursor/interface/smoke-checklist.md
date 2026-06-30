# Smoke checklist — Forester GUI (v2)

Ручная проверка **v2 фаза 1** перед релизом. **Статус: complete** (2025-06-24).

**План:** [implementation-plan-v2.md §1](./implementation-plan-v2.md) · **v1 code:** [implementation-plan.md](./implementation-plan.md) (закрыт)

**Запуск:** dev — `cd sources/gui && wails dev`. Release — install from `./builder/macos/build.sh --dmg` ([macos-installer.md](./macos-installer.md)).

**Связанные документы:** [architecture.md §6](./architecture.md)

**Автоматически (CI / агент, не заменяет smoke):** `npm run build` в `frontend/` · `go test ./internal/jsonapi/...` в `sources/forester` · `wails build` в `sources/gui` (macOS).

---

## Предусловия

- [x] Forester CLI собран: `builder/dist/payload/bin/forester` (или путь из `setup.cfg`)
- [x] Тестовый репозиторий с `.DFM/` и хотя бы одним коммитом — `/Users/nopomuk/Documents/3d_test_anchorpoint` (5 commits)
- [x] Окно ≥ 1435×720 (Project) / 1081×720 (History) — `main.go` + `layout.ts`

Проверка: `./builder/scripts/verify_smoke_prereqs.sh [REPO_PATH]`

---

## Сценарии

### 1. Cold start → auto-open last repo

- [x] В `~/.dfm/setup.cfg` задан `[current repo] path`
- [x] Запуск приложения → репозиторий открывается автоматически
- [x] Repo selector показывает basename; дерево папок загружается

### 2. Add repo → browse → select file

- [x] Empty state → **Add repository** → folder picker
- [x] Папка без `.DFM` → dialog «This folder is not a repository» → **Create** → repo открыт
- [x] **Cancel** в dialog → error `not a Forester repository`
- [x] Project: дерево папок, drill-down в Preview, клик по файлу
- [x] Content Info показывает metadata; VCS badge на файле (если changed)
- [x] `.blend` с превью из Blender → thumbnail в grid и Info (не stub)

### 3. Create commit

- [x] Выбрать committable файл(ы) → **Create commit** в Info
- [x] Диалог → subject → Create
- [x] Toast с hash; статус обновился; файл больше не в changed (или badge снят)

### 4. History → select commit → text diff

- [x] Rail → History; выбрать коммит в списке
- [x] Preview: header, changed files, text diff (или image/binary stub)
- [x] Content Info **скрыта**

### 5. Switch branch — clean + dirty (stash)

- [x] **Clean:** Branch selector → другая ветка → checkout без диалога
- [x] **Dirty:** изменить файл → switch branch → `DirtyBranchSwitchDialog` → Stash & switch
- [x] `currentBranch` обновился; log перезагрузился

### 6. Revert file from Info History

- [x] Project → один файл → History section → branch + commit → **Revert**
- [x] Confirm → файл восстановлен; toast; status обновился

---

## Corner cases (architecture §6)

| # | Сценарий | Ожидание | Проверено |
|---|----------|----------|-----------|
| 6.1 | Нет репо в cfg | Empty state + Add repository | [x] |
| 6.2 | Папка без `.DFM` при Add | Init dialog; Cancel → error; Create → repo init + open | [x] |
| 6.3 | Repo path удалён / диск отмонтирован | Toast (destructive) + **Re-open** / Retry | [x] |
| 6.4 | Forester binary недоступен | Toast «Forester unavailable» + Retry | [x] |
| 6.5 | Файл удалён с диска при selection | Selection сброшен, notice | [x] |
| 6.6 | Ветка сменена из CLI | Polling обновляет branch + History log | [x] |
| 6.7 | Пустой репо (нет коммитов) | «No commits yet» в History | [x] |
| 6.9 | Sidebar collapse | Rail 48px; expand восстанавливает ширину | [x] |
| 6.10 | Project ↔ History | Selection сброшен; Info hide/show | [x] |

---

## 7. v1.1 polish (дополнительно к §1–6)

_Реализовано в v1.1; проверяется в v2 smoke._

### 7.1 Commit cards

- [x] Stats: при скролле списка — lazy `N files changed` (+/−); skeleton → строка или скрыто при ошибке
- [x] ⋮ menu: View in Preview, Compare with working tree, Restore, Revert (disabled на HEAD), Copy hash/message
- [x] Restore / Revert → `AlertDialog` → после успеха log и Project data обновляются

### 7.2 Project Preview + Sidebar

- [x] Папка с >200 файлами: scroll подгружает следующую страницу; сетка виртуализирована
- [x] **Expand all** / **Collapse** в дереве папок
- [x] Header **Project view** — серый `bg-sidebar`; список папок — белый `bg-background` (как History)

### 7.3 Settings + branch

- [x] Dark theme (Appearance)
- [x] External editors: вкладка активна; Blender path в submenu **Edit in:**; список обновляется при изменении в Settings
- [x] Project file grid: ПКМ → Copy / Rename / Edit in / Delete (корзина ОС)
- [x] History → Branch selector → **Create new branch…** → диалог → ветка создана

### 7.4 Errors + multiselect

- [x] Ошибки Forester / repo — toast bottom-right (не sidebar banner)
- [x] Marquee + Shift-range на file grid; Cmd/Ctrl+A select all в папке

### 7.5 Native application menu (macOS)

- [x] View → Settings открывает диалог
- [x] `⌘1` / `⌘2` — Project / History (как Rail)
- [x] `⌘B` — toggle sidebar
- [x] Edit → Copy/Paste в полях ввода
- [x] Window → Minimize / Zoom
- [x] About — title + message

См. [application-menu.md](./application-menu.md) §9.

---

## Сборка

- [x] `./builder/macos/build.sh --dmg` (macOS) — DMG в `builder/dist/` — **v2 §1.5.1**
- [x] DMG install → `~/.dfm/setup.cfg` bootstrap — **v2 §1.5.2** · [macos-installer.md](./macos-installer.md)
- [x] `./builder/windows/build.sh --installer` — `DifferenceMachine-0.8-windows-setup.exe`, NSIS `VERSION=0.8`, `Processing script file: "installer.nsi"` — **v2 фаза 2**
- [x] `./builder/windows/build.sh --zip` — `DifferenceMachine-0.8-windows.zip` — **v2 фаза 2**
- [x] `./builder/linux/build.sh --tar` — выполнить на Linux / WSL / CI Linux runner; Windows guard проверен: `ERROR: Run on Linux (current: windows)` — **v2 фаза 9**

---

## Platform release smoke

### Windows

- [x] Build installer: `./builder/windows/build.sh --installer`
- [x] Build portable zip: `./builder/windows/build.sh --zip`
- [x] Install `DifferenceMachine-0.8-windows-setup.exe`
- [x] Start menu + **desktop** shortcuts to GUI
- [x] GUI / Forester exe icons visible in Explorer (embedded `.ico`)
- [x] First launch writes `%USERPROFILE%\.dfm\setup.cfg` with `C:\Program Files\Difference Machine\...`
- [x] Open test repo → Project tree loads
- [x] Raster image file → thumbnail in grid (requires bundled `bin\ffmpeg.exe`)
- [x] History → select commit → text diff
- [x] Add non-repo folder → init dialog → Create

### macOS

- [x] Build DMG: `./builder/macos/build.sh --dmg`
- [x] Dock icons: squircle sizing matches adjacent apps (GUI + Forester)
- [x] `Forester.app` double-click → Terminal with `forester` on PATH
- [x] Image previews work with bundled ffmpeg in `.app/Contents/Resources/bin/`
- [x] First launch → `~/.dfm/setup.cfg` bootstrap

### Linux

- [x] Build archive on Linux: `./builder/linux/build.sh --tar` → unpack `Difference-Machine/`
- [x] `sudo ./install.sh` → `/opt/Difference-Machine/`, symlinks, `/usr/share/applications/difference-machine.desktop`, hicolor icons, `restorecon`
- [x] `desktop-file-validate` passes; `Icon=difference-machine`, `Exec=… %F`, `Path=/opt/Difference-Machine`
- [x] `install.sh` writes `~/.dfm/setup.cfg` with install-root paths
- [x] Open test repo → Project tree loads
- [x] Raster image file → thumbnail in grid (requires bundled `bin/ffmpeg`)
- [x] History → select commit → text diff
- [x] Add non-repo folder → init dialog → Create

---

## Заметки сессии

**2025-06-24 — smoke complete.** Критичных блокеров не зафиксировано. Доп. UI после smoke-прогона: lock badge в Content Preview, `FolderIcon` (Figma 4026:5054), untracked badge `N`, цветные VCS badges (`vcsBadge.ts`).

**2026-06-25 — release hardening.** Windows installer/zip build verified locally on Windows via Git Bash. Linux release build requires a Linux runtime; WSL and Docker are not available on this host.

**2026-06-27 — packaging polish.** Specs updated for squircle app icons, Windows desktop shortcut, macOS ffmpeg via Homebrew, Linux installer (`Difference-Machine/`, generated `.desktop`, hicolor icons, `restorecon`). See [implementation-plan-v2.md §v2.3](./implementation-plan-v2.md).
