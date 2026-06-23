# Smoke checklist — Forester GUI v1.0

Ручная проверка перед релизом. Отмечайте `[x]` после прохождения.

**Запуск:** `cd sources/gui && wails dev` (или собранный `.app`).

**Связанные документы:** [implementation-plan.md](./implementation-plan.md) · [architecture.md §6](./architecture.md)

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
- [ ] Project: дерево папок, drill-down в Preview, клик по файлу
- [ ] Content Info показывает metadata; VCS badge на файле (если changed)

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
| 6.2 | Путь не Forester repo | Inline error, не crash | [ ] |
| 6.3 | Repo path удалён / диск отмонтирован | Error banner + **Re-open** / Retry | [ ] |
| 6.4 | Forester binary недоступен | Banner «Forester unavailable» + Retry | [ ] |
| 6.5 | Файл удалён с диска при selection | Selection сброшен, notice | [ ] |
| 6.6 | Ветка сменена из CLI | Polling обновляет branch + History log | [ ] |
| 6.7 | Пустой репо (нет коммитов) | «No commits yet» в History | [ ] |
| 6.9 | Sidebar collapse | Rail 48px; expand восстанавливает ширину | [ ] |
| 6.10 | Project ↔ History | Selection сброшен; Info hide/show | [ ] |

---

## Сборка

- [ ] `cd sources/gui && wails build` (macOS) — без ошибок
- [ ] `wails build` Windows (если доступна машина / CI)

---

## Заметки сессии

_Запишите сюда найденные баги и отклонения от спеки._
