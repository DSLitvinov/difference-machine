# Forester GUI — план реализации (v2)

QA, платформы и фичи после закрытия **v1.0 / v1.1** — [implementation-plan.md](./implementation-plan.md).

**Канон scope v2:** [decisions.md §1](./decisions.md) · **ручная проверка:** [smoke-checklist.md](./smoke-checklist.md)

---

## Как пользоваться

1. v1 code complete — не возвращайтесь к фазам 0–8 в [implementation-plan.md](./implementation-plan.md), кроме багфиксов по итогам smoke.
2. Перед паузой — отмечайте `[x]` здесь и обновляйте **«Сейчас»**.
3. Definition of done фазы — все `[x]` в секции + прохождение связанного раздела [smoke-checklist.md](./smoke-checklist.md) (для фазы 1).

### Легенда

| Маркер | Значение |
|--------|----------|
| `[ ]` | Не начато |
| `[~]` | В работе |
| `[x]` | Готово |
| `[—]` | Отложено (v2.1+) |

---

## Сейчас (обновляйте при каждой сессии)

| Поле | Значение |
|------|----------|
| **Последнее обновление** | 2026-06-25 |
| **Активная фаза** | **Release hardening — platform build + QA** |
| **Следующий шаг** | **9.1** `./builder/linux/build.sh --tar` на Linux / WSL / CI Linux runner |
| **Заметки** | Windows installer/zip build verified locally; Linux build blocked on this Windows host by platform guard |

### Прогресс v2

| Фаза | Название | Статус |
|------|----------|--------|
| 0 | macOS DMG packaging | `[x]` 4/4 |
| 1 | Manual smoke (macOS) | `[x]` |
| 2 | Windows build + smoke | `[~]` 1/2 |
| 3 | Merge UI | `[x]` 3/3 |
| 4 | Fs watcher | `[x]` 2/2 |
| 5 | Detached HEAD | `[x]` 2/2 |
| 6 | Diff rename `R` | `[x]` 2/2 |
| 7 | Branch delete (GUI) | `[x]` 2/2 |
| 8 | Init repository wizard | `[x]` 3/3 |
| 9 | Linux build + QA | `[~]` 0/2 |

---

## Фаза 0 — macOS DMG packaging

Спека: [macos-installer.md](./macos-installer.md)

- [x] **0.1** `Forester.app` wrapper (`wrap_forester_app.sh`)
- [x] **0.2** `builder/macos/package_dmg.sh` + `./builder/macos/build.sh --dmg`
- [x] **0.3** GUI bootstrap `~/.dfm/setup.cfg` (`internal/install/bootstrap.go`)
- [x] **0.4** Builder + spec docs

**Проверка:** `./builder/build.sh --dmg` → `builder/dist/DifferenceMachine-*-macos.dmg`; install → first launch writes `setup.cfg`.

---

## Фаза 1 — Manual smoke (macOS) `[x]`

Ручная проверка перед релизом v1.x на macOS. Детали сценариев — [smoke-checklist.md](./smoke-checklist.md). **Закрыта 2025-06-24.**

### 1.1 Предусловия

- [x] **1.1.1** Forester CLI: `builder/dist/payload/bin/forester` (или путь из `setup.cfg`)
- [x] **1.1.2** Тестовый репозиторий с `.DFM/` и ≥1 коммитом
- [x] **1.1.3** Окно ≥ 1435×720 (Project) / 1081×720 (History)

### 1.2 Core scenarios (§1–6)

- [x] **1.2.1** Cold start → auto-open last repo
- [x] **1.2.2** Add repo → browse → select file (включая init dialog, `.blend` thumbnail)
- [x] **1.2.3** Create commit
- [x] **1.2.4** History → select commit → text diff
- [x] **1.2.5** Switch branch — clean + dirty (stash)
- [x] **1.2.6** Revert file from Info History

### 1.3 Corner cases (architecture §6)

- [x] **1.3.1** Таблица 6.1–6.10 — [smoke-checklist.md §Corner cases](./smoke-checklist.md)

### 1.4 v1.1 polish (§7)

- [x] **1.4.1** Commit cards — stats + ⋮ menu (§7.1)
- [x] **1.4.2** Project Preview + Sidebar — virtual scroll, expand/collapse, header styling (§7.2)
- [x] **1.4.3** Settings + branch — dark theme, editors, create branch (§7.3)
- [x] **1.4.4** Errors + multiselect — toast, marquee (§7.4)
- [x] **1.4.5** Native application menu macOS (§7.5)

### 1.5 Сборка

- [x] **1.5.1** `./builder/build.sh --dmg` (macOS) — без ошибок; DMG открывается
- [x] **1.5.2** DMG install → first launch → `~/.dfm/setup.cfg` с путями `/Applications/Difference Machine/...`
- [x] **1.5.3** Заметки сессии — [smoke-checklist.md §Заметки](./smoke-checklist.md)

**Проверка:** все пункты [smoke-checklist.md](./smoke-checklist.md) отмечены `[x]`; критичные баги заведены или исправлены.

---

## Фаза 2 — Windows build + smoke

- [x] **2.1** `wails build` Windows + `builder/windows/build.sh --installer` / `--zip`
- [x] **2.2** Smoke subset на Windows — install, first launch bootstrap, core §1.2.1–1.2.4 + init dialog

**Проверка:** `builder/dist/DifferenceMachine-0.8-windows-setup.exe`, `builder/dist/DifferenceMachine-0.8-windows.zip`; install → first launch writes `%USERPROFILE%\.dfm\setup.cfg`; open repo + diff на тестовом репо.

---

## Фаза 3 — Merge UI

Спека: [merge-dialog.md](./merge-dialog.md) · API: [api-contract.md §2.2](./api-contract.md)

- [x] **3.1** Backend: `merge.*` jsonapi + тесты
- [x] **3.2** `MergeDialog` — object preview, confirm
- [x] **3.3** Entry point из History / branch UX

**Проверка:** merge commit с object preview; corner cases из merge-dialog §corner.

---

## Фаза 4 — Fs watcher

- [x] **4.1** Wails / OS watcher → invalidate `status.get` / tree без full polling-only
- [x] **4.2** Debounce + corner cases (external delete, rename)

---

## Фаза 5 — Detached HEAD

- [x] **5.1** Indicator в Sidebar History (branch selector / banner)
- [x] **5.2** Checkout UX при detached — [decisions.md §3](./decisions.md)

---

## Фаза 6 — Diff rename `R`

- [x] **6.1** Badge `R` в History changed files + Project badges
- [x] **6.2** `diff.name_status` rename pair в UI

---

## Фаза 7 — Branch delete (GUI)

- [x] **7.1** Confirm dialog + `branch.delete` (или эквивалент CLI)
- [x] **7.2** Disable на `currentBranch` / protected

---

## Фаза 8 — Init repository wizard

Перенесено из v1.1 backlog — [init-repository-dialog.md](./init-repository-dialog.md) (расширенный wizard).

- [x] **8.1** Wizard steps beyond AlertDialog
- [x] **8.2** `.dfmignore` template / author defaults
- [x] **8.3** Smoke: add non-repo folder end-to-end

---

## Фаза 9 — Linux build + QA

- [x] **9.1** `wails build` Linux + `builder/` staging + `DifferenceMachine-0.8-linux.tar.gz`
- [x] **9.2** Smoke subset Linux — unpack, first launch bootstrap, core §1.2.1–1.2.4 + init dialog

**Статус 2026-06-25:** Linux build must run on Linux / WSL / CI Linux runner. Windows host guard проверен: `ERROR: Run on Linux (current: windows)`.

---

## v2.1 — backlog polish

- [x] Tree collapse persistence improvements — per-repo expanded folder state + lazy hydration
- [x] `commit.reset` submenu (destructive) — soft/mixed/hard with confirm dialog
- [x] Performance profiling large repos (>10k files) — opt-in timings + large repo/folder guardrails

---

## v2.2 — GUI workdir actions + build cache

- [x] Settings: External editors tab enabled; Blender paths on External editors; optional Clear → Trash icon
- [x] Project file context menu: Copy, Rename (`workdir.rename`), Edit in (`workdir.open` + editor), Delete → OS Trash (`workdir.delete`)
- [x] `appStore.externalEditorPaths` — live sync from Settings
- [x] ffmpeg: persistent cache `builder/.cache/ffmpeg/` (survives `clean_build.sh`)

---

## v2.3 — App icons + platform shortcuts + ffmpeg (macOS)

- [x] GUI icons: squircle background, `npm run icons:generate` → Wails `appicon.png` + `windows/icon.ico`
- [x] Forester icons: `sources/forester/icons/` → PNG, `.ico`, `.icns`, Linux hicolor (`generate_forester_icons.sh`)
- [x] Windows NSIS: desktop shortcut to GUI (Start menu unchanged)
- [x] Linux `install.sh`: Forester hicolor icons → system/user share; GUI `.desktop` menu entry
- [x] macOS ffmpeg: stage from Homebrew / `DFM_FFMPEG_PATH` (no BtbN macOS builds); bundle into `.app` Resources
- [x] GUI startup: `EnsureFFmpegEnv`, `RefreshToolchainFFmpegPath` → `[forester] ffmpeg_path`
- [x] Specs: [macos-installer.md](./macos-installer.md), [windows-installer.md](./windows-installer.md), [linux-installer.md](./linux-installer.md), [api-contract.md §4.3.1](./api-contract.md)

---

## Журнал сессий (опционально)

| Дата | Фаза | Сделано | Следующий шаг |
|------|------|---------|---------------|
| 2025-06-24 | — | Создан v2 plan; smoke перенесён из v1 фазы 7 | **1.1** предусловия |
| 2025-06-24 | 1 | Smoke macOS complete (§1–7, corner cases, DMG) | **3.1** Merge UI backend |
| 2025-06-24 | 3 | Merge UI: `merge.*` jsonapi, `MergeDialog`, History banner + branch menu | **4.1** fs watcher |
| 2025-06-24 | 4 | Fs watcher: `internal/workdirwatch`, `workdir:changed`, debounced UI refresh | **5.1** detached HEAD |
| 2025-06-24 | 8 | Init wizard: 3-step dialog, `repo.init` author/dfmignore, `InitRepositoryWithOptions` | **9.1** Linux build |
| 2026-06-25 | Release hardening | Windows installer/zip build verified; Linux runner unavailable on host | **9.1** Linux build on Linux / WSL / CI |
| 2026-06-25 | v2.1 | Tree persistence, destructive reset submenu, large-repo perf hints/timings | Linux build + platform smoke |
| 2026-06-27 | v2.2 | File context menu, workdir rename/delete/trash, External editors live sync, ffmpeg build cache | Platform smoke |
| 2026-06-27 | v2.3 | App icons (squircle), Windows desktop shortcut, macOS ffmpeg/Homebrew, linux icon install | Platform smoke |
