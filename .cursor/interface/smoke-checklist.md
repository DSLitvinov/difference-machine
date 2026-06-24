# Smoke checklist — Forester GUI (v2)

Ручная проверка **v2 фаза 1** перед релизом. Отмечайте `[x]` после прохождения.

**План:** [implementation-plan-v2.md §1](./implementation-plan-v2.md) · **v1 code:** [implementation-plan.md](./implementation-plan.md) (закрыт)

**Запуск:** `cd sources/gui && wails dev` (или собранный `.app` из `./builder/build.sh --gui`).

**Связанные документы:** [architecture.md §6](./architecture.md)

**Автоматически (CI / агент, не заменяет smoke):** `npm run build` в `frontend/` · `go test ./internal/jsonapi/...` в `sources/forester` · `wails build` в `sources/gui` (macOS).

---

## Предусловия

- [ ] Forester CLI собран: `~/dfm_distr/bin/forester` (или путь из `setup.cfg`)
- [ ] Тестовый репозиторий с `.DFM/` и хотя бы одним коммитом
- [ ] Окно ≥ 1435×720 (Project) / 1081×720 (History)

---

## Сценарии

### 1. Cold start → auto-open last repo

- [ ] В `~/.dfm/setup.cfg` задан `[current repo] path`
- [ ] Запуск приложения → репозиторий открывается автоматически
- [ ] Repo selector показывает basename; дерево папок загружается

### 2. Add repo → browse → select file

- [ ] Empty state → **Add repository** → folder picker
- [ ] Папка без `.DFM` → dialog «This folder is not a repository» → **Create** → repo открыт
- [ ] **Cancel** в dialog → error `not a Forester repository`
- [ ] Project: дерево папок, drill-down в Preview, клик по файлу
- [ ] Content Info показывает metadata; VCS badge на файле (если changed)
- [ ] `.blend` с превью из Blender → thumbnail в grid и Info (не stub)

### 3. Create commit

- [ ] Выбрать committable файл(ы) → **Create commit** в Info
- [ ] Диалог → subject → Create
- [ ] Toast с hash; статус обновился; файл больше не в changed (или badge снят)

### 4. History → select commit → text diff

- [ ] Rail → History; выбрать коммит в списке
- [ ] Preview: header, changed files, text diff (или image/binary stub)
- [ ] Content Info **скрыта**

### 5. Switch branch — clean + dirty (stash)

- [ ] **Clean:** Branch selector → другая ветка → checkout без диалога
- [ ] **Dirty:** изменить файл → switch branch → `DirtyBranchSwitchDialog` → Stash & switch
- [ ] `currentBranch` обновился; log перезагрузился

### 6. Revert file from Info History

- [ ] Project → один файл → History section → branch + commit → **Revert**
- [ ] Confirm → файл восстановлен; toast; status обновился

---

## Corner cases (architecture §6)

| # | Сценарий | Ожидание | Проверено |
|---|----------|----------|-----------|
| 6.1 | Нет репо в cfg | Empty state + Add repository | [ ] |
| 6.2 | Папка без `.DFM` при Add | Init dialog; Cancel → error; Create → repo init + open | [ ] |
| 6.3 | Repo path удалён / диск отмонтирован | Toast (destructive) + **Re-open** / Retry | [ ] |
| 6.4 | Forester binary недоступен | Toast «Forester unavailable» + Retry | [ ] |
| 6.5 | Файл удалён с диска при selection | Selection сброшен, notice | [ ] |
| 6.6 | Ветка сменена из CLI | Polling обновляет branch + History log | [ ] |
| 6.7 | Пустой репо (нет коммитов) | «No commits yet» в History | [ ] |
| 6.9 | Sidebar collapse | Rail 48px; expand восстанавливает ширину | [ ] |
| 6.10 | Project ↔ History | Selection сброшен; Info hide/show | [ ] |

---

## 7. v1.1 polish (дополнительно к §1–6)

_Реализовано в v1.1; проверяется в v2 smoke._

### 7.1 Commit cards

- [ ] Stats: при скролле списка — lazy `N files changed` (+/−); skeleton → строка или скрыто при ошибке
- [ ] ⋮ menu: View in Preview, Compare with working tree, Restore, Revert (disabled на HEAD), Copy hash/message
- [ ] Restore / Revert → `AlertDialog` → после успеха log и Project data обновляются

### 7.2 Project Preview + Sidebar

- [ ] Папка с >200 файлами: scroll подгружает следующую страницу; сетка виртуализирована
- [ ] **Expand all** / **Collapse** в дереве папок
- [ ] Header **Project view** — серый `bg-sidebar`; список папок — белый `bg-background` (как History)

### 7.3 Settings + branch

- [ ] Dark theme (Appearance)
- [ ] External editors: путь к `.app` на macOS резолвится в binary
- [ ] History → Branch selector → **Create new branch…** → диалог → ветка создана

### 7.4 Errors + multiselect

- [ ] Ошибки Forester / repo — toast bottom-right (не sidebar banner)
- [ ] Marquee + Shift-range на file grid; Cmd/Ctrl+A select all в папке

### 7.5 Native application menu (macOS)

- [ ] View → Settings открывает диалог
- [ ] `⌘1` / `⌘2` — Project / History (как Rail)
- [ ] `⌘B` — toggle sidebar
- [ ] Edit → Copy/Paste в полях ввода
- [ ] Window → Minimize / Zoom
- [ ] About — title + message

См. [application-menu.md](./application-menu.md) §9.

---

## Сборка

- [ ] `cd sources/gui && wails build` (macOS) — без ошибок — **v2 §1.5.1**
- [—] `wails build` Windows — **v2 фаза 2** — [implementation-plan-v2.md §2](./implementation-plan-v2.md)

---

## Заметки сессии

_Запишите сюда найденные баги и отклонения от спеки._
