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
| **Последнее обновление** | 2025-06-24 |
| **Активная фаза** | **1 — Manual smoke (macOS)** |
| **Следующий шаг** | **1.1** Предусловия — [smoke-checklist.md](./smoke-checklist.md) |
| **Заметки** | Smoke перенесён из v1 фазы 7; автотесты (`go test`, `npm build`, `wails build`) — по-прежнему в CI |

### Прогресс v2

| Фаза | Название | Статус |
|------|----------|--------|
| 1 | Manual smoke (macOS) | `[ ]` 0/5 |
| 2 | Windows build + smoke | `[—]` 0/2 |
| 3 | Merge UI | `[ ]` 0/3 |
| 4 | Fs watcher | `[ ]` 0/2 |
| 5 | Detached HEAD | `[ ]` 0/2 |
| 6 | Diff rename `R` | `[ ]` 0/2 |
| 7 | Branch delete (GUI) | `[ ]` 0/2 |
| 8 | Init repository wizard | `[—]` 0/3 |
| 9 | Linux build + QA | `[—]` 0/2 |

---

## Фаза 1 — Manual smoke (macOS)

Ручная проверка перед релизом v1.x на macOS. Детали сценариев — [smoke-checklist.md](./smoke-checklist.md).

### 1.1 Предусловия

- [ ] **1.1.1** Forester CLI: `~/dfm_distr/bin/forester` (или путь из `setup.cfg`)
- [ ] **1.1.2** Тестовый репозиторий с `.DFM/` и ≥1 коммитом
- [ ] **1.1.3** Окно ≥ 1435×720 (Project) / 1081×720 (History)

### 1.2 Core scenarios (§1–6)

- [ ] **1.2.1** Cold start → auto-open last repo
- [ ] **1.2.2** Add repo → browse → select file (включая init dialog, `.blend` thumbnail)
- [ ] **1.2.3** Create commit
- [ ] **1.2.4** History → select commit → text diff
- [ ] **1.2.5** Switch branch — clean + dirty (stash)
- [ ] **1.2.6** Revert file from Info History

### 1.3 Corner cases (architecture §6)

- [ ] **1.3.1** Таблица 6.1–6.10 — [smoke-checklist.md §Corner cases](./smoke-checklist.md)

### 1.4 v1.1 polish (§7)

- [ ] **1.4.1** Commit cards — stats + ⋮ menu (§7.1)
- [ ] **1.4.2** Project Preview + Sidebar — virtual scroll, expand/collapse, header styling (§7.2)
- [ ] **1.4.3** Settings + branch — dark theme, editors, create branch (§7.3)
- [ ] **1.4.4** Errors + multiselect — toast, marquee (§7.4)
- [ ] **1.4.5** Native application menu macOS (§7.5)

### 1.5 Сборка

- [ ] **1.5.1** `cd sources/gui && wails build` (macOS) — без ошибок
- [ ] **1.5.2** Заметки сессии заполнены при найденных багах — [smoke-checklist.md §Заметки](./smoke-checklist.md)

**Проверка:** все пункты [smoke-checklist.md](./smoke-checklist.md) отмечены `[x]`; критичные баги заведены или исправлены.

---

## Фаза 2 — Windows build + smoke

- [—] **2.1** `wails build` Windows — интеграция в `builder/` (аналог `--gui`)
- [—] **2.2** Smoke subset на Windows — core §1.2.1–1.2.4 + init dialog

**Проверка:** `.exe` из `dfm_distr`; open repo + diff на тестовом репо.

---

## Фаза 3 — Merge UI

Спека: [merge-dialog.md](./merge-dialog.md) · API: [api-contract.md §2.2](./api-contract.md)

- [ ] **3.1** Backend: `merge.*` jsonapi + тесты
- [ ] **3.2** `MergeDialog` — object preview, confirm
- [ ] **3.3** Entry point из History / branch UX

**Проверка:** merge commit с object preview; corner cases из merge-dialog §corner.

---

## Фаза 4 — Fs watcher

- [ ] **4.1** Wails / OS watcher → invalidate `status.get` / tree без full polling-only
- [ ] **4.2** Debounce + corner cases (external delete, rename)

---

## Фаза 5 — Detached HEAD

- [ ] **5.1** Indicator в Sidebar History (branch selector / banner)
- [ ] **5.2** Checkout UX при detached — [decisions.md §3](./decisions.md)

---

## Фаза 6 — Diff rename `R`

- [ ] **6.1** Badge `R` в History changed files + Project badges
- [ ] **6.2** `diff.name_status` rename pair в UI

---

## Фаза 7 — Branch delete (GUI)

- [ ] **7.1** Confirm dialog + `branch.delete` (или эквивалент CLI)
- [ ] **7.2** Disable на `currentBranch` / protected

---

## Фаза 8 — Init repository wizard

Перенесено из v1.1 backlog — [init-repository-dialog.md](./init-repository-dialog.md) (расширенный wizard).

- [—] **8.1** Wizard steps beyond AlertDialog
- [—] **8.2** `.dfmignore` template / author defaults
- [—] **8.3** Smoke: add non-repo folder end-to-end

---

## Фаза 9 — Linux build + QA

- [—] **9.1** `wails build` Linux + `builder/` staging
- [—] **9.2** Smoke subset Linux

---

## v2.1+ — backlog

- Tree collapse persistence improvements
- `commit.reset` submenu (destructive)
- Performance profiling large repos (>10k files)

---

## Журнал сессий (опционально)

| Дата | Фаза | Сделано | Следующий шаг |
|------|------|---------|---------------|
| 2025-06-24 | — | Создан v2 plan; smoke перенесён из v1 фазы 7 | **1.1** предусловия |
