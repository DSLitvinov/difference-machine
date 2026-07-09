# GUI — пользовательские сценарии, backlog и gap-анализ

Системный анализ GUI Difference Machine: карта сценариев, user stories с acceptance criteria, пробелы «документация ↔ код», приоритизированный backlog.

**Источники:** `.cursor/interface/*.md` · `doc/usage_guide.md` · `sources/gui/frontend/src/` · `sources/forester/internal/jsonapi/dispatch.go`

**Связанные:** [architecture.md](./architecture.md) · [vcs-gui-coverage.md](./vcs-gui-coverage.md) · [decisions.md](./decisions.md) · [implementation-plan-v2.md](./implementation-plan-v2.md)

Обновлено: 2026-07-09.

---

## 1. Резюме

| Область | Статус |
|---------|--------|
| Core desktop workflow (browse → commit → history → diff → branches → merge) | **Реализован** (v1/v2) |
| Покрытие Forester JSON API | ~81% ([vcs-gui-coverage.md](./vcs-gui-coverage.md)) |
| 3D object workflow (Mark To, sync manifests) | **Blender only** — осознанно |
| Критичные UX-дыры | Unstage, stash UI, commit-all, staged preview, GUI↔Blender hints |

GUI сильен в **визуальной навигации** (All files, thumbnails, Changed filter, File History). Слабее в **полном цикле staging** и **восстановлении после stash**, а также в **связке с Blender** до/после merge.

---

## 2. Персоны и цели

| Персона | Цель | Основной режим GUI |
|---------|------|-------------------|
| **3D Artist** | Найти asset, открыть в Blender, закоммитить `.blend` | Project view |
| **Lead / TD** | Review diff, branch/merge, revert/reset, locks | History + File History |
| **Pipeline (power user)** | gc, hooks, cherry-pick, tags, review | CLI (+ GUI для browse/diff) |

---

## 3. Карта сценариев (as-is)

### 3.1 Онбординг и репозитории

| ID | Сценарий | Триггер | API / компонент | Статус |
|----|----------|---------|-----------------|--------|
| R1 | Cold start → last repo | Запуск app | `OpenRepo`, `[current repo]` | ✅ |
| R2 | Add repository | Repo selector → picker | `AddKnownRepo`, `IsForesterRepository` | ✅ |
| R3 | Init non-repo folder | Нет `.DFM` | `InitRepositoryWizard` → `repo.init` | ✅ |
| R4 | Switch repository | Dropdown | `OpenRepo`, `SaveSettingsRepos` | ✅ |
| R5 | Remove repository from list | Settings → Repositories | `SaveSettingsRepos` (не `RemoveKnownRepo`) | ✅ частично |
| R6 | Configure Forester / Blender / editors | Settings | `SaveSettings*` | ✅ |

### 3.2 Project view — обзор и файлы

| ID | Сценарий | Триггер | Компонент | Статус |
|----|----------|---------|-----------|--------|
| P1 | Browse all files | Sidebar → All files | `FolderTree`, `ProjectPreviewPanel` | ✅ |
| P2 | Navigate folders | Tree + drill-down | `selectedFolderPath` sync | ✅ |
| P3 | Filter committable | Changed toggle | `showChangedOnly`, `committable` | ✅ |
| P4 | Global search | Preview toolbar | `workdir.search` | ✅ |
| P5 | Select file(s) | Click / Ctrl / Shift / marquee | `FilePreviewGrid`, `ContentInfoPanel` | ✅ |
| P6 | View file in-app | Double-click | `FileViewer` | ✅ |
| P7 | Open in external editor | Context menu / Edit in | `workdir.open` | ✅ |
| P8 | Rename / delete file | Context menu | `workdir.rename`, `workdir.delete` (FS) | ✅ |
| P9 | Acquire / release lock | Context menu | `lock.acquire` / `lock.release` в `FilePreviewGrid` | ✅ |
| P10 | File history | Content Info → Views History | `FileHistoryView` | ✅ |
| P11 | Create commit (selected) | Content Info → Create commit | `index.add` → `commit.create` | ✅ |

### 3.3 History view — ветки и коммиты

| ID | Сценарий | Триггер | Компонент | Статус |
|----|----------|---------|-----------|--------|
| H1 | View branch log | Rail → History | `HistorySidebarPanel`, `log.get` | ✅ |
| H2 | Commit diff | Select commit card | `HistoryPreviewPanel`, `diff.*` | ✅ |
| H3 | Switch branch | Branch dropdown | `repo.switch`, `DirtyBranchSwitchDialog` | ✅ |
| H4 | Stash & switch (dirty) | Dirty dialog | `repo.switch({ auto_stash: true })` | ✅ |
| H5 | Create / rename / delete branch | Branch dropdown | `branch.*` | ✅ |
| H6 | Commit operations | Commit card ⋮ | revert, reset, restore-version, compare | ✅ |
| H7 | Merge | Merge into current… | `MergeDialog`, `merge.*` | ✅ |
| H8 | Detached HEAD | Banner | `status.is_detached` | ✅ |

### 3.4 Blender / object workflow (вне GUI)

| ID | Сценарий | Инструмент | GUI-роль |
|----|----------|------------|----------|
| B1 | Mark To (MERGE/DELETE/RENAME) | Blender addon | Нет entry point |
| B2 | Sync manifests → commit | Blender addon | Только file-level commit в GUI |
| B3 | Object-level merge apply | Blender background script | Merge dialog — preview only |
| B4 | Commit from Blender | Save Version panel | Параллельный путь с GUI |

---

## 4. Gap-анализ: документация ↔ код

Проверка по коду на 2026-07-09. Легенда: **Doc** = спека в `.cursor/interface/`; **Code** = `sources/gui/frontend/src/`.

### 4.1 Противоречия doc ↔ code

| Тема | Документ | Код | Вердикт |
|------|----------|-----|---------|
| **Locks acquire/release** | [decisions.md §8.5](./decisions.md): read-only badge | `FilePreviewGrid.tsx` → `acquireLock` / `releaseLock` | **Doc устарел** — GUI поддерживает locks |
| **Create commit pre-step** | [create-commit-dialog.md §1](./create-commit-dialog.md): `index.add` в pre-step | `ContentInfoPanel.openCreateCommit` → `indexAddFiles` до открытия dialog; `CreateCommitDialog` только `commit.create` | **Соответствует** (staging вне dialog) |
| **index.drop / unstage** | [vcs-gui-coverage.md](./vcs-gui-coverage.md): нет в API | `dispatch.go` — handler **отсутствует**; только `api/README.md` упоминает | **Gap подтверждён** — нужен backend + UI |
| **commit.get + screenshot** | [decisions.md §7.8](./decisions.md), [vcs-gui-coverage.md](./vcs-gui-coverage.md): обёртка без UI | `forester.ts` → `fetchCommit()`; **ни один компонент не импортирует** | **Обёртка без UI** |
| **RemoveKnownRepo** | [vcs-gui-coverage.md](./vcs-gui-coverage.md): обёртка | Wails binding есть; UI использует `SaveSettingsRepos` | **Обёртка без прямого вызова** (эквивалент через Settings) |
| **SetRepoUser** | [vcs-gui-coverage.md](./vcs-gui-coverage.md): обёртка | Profile → `SaveSettingsProfile` | **Эквивалент через Settings** |

### 4.2 Задокументированные gaps — подтверждение в коде

| Gap | Doc | Code evidence | Severity |
|-----|-----|---------------|----------|
| Unstage | vcs-gui-coverage §3 | Нет `index.drop` в dispatch; нет UI | **High** |
| Stash browser | decisions §8.2 | Только toast после stash; нет list/apply/pop | **High** |
| Commit all changed | content-info §1.3 | `openCreateCommit` требует `selectedPaths` | **Medium** |
| Staged diff preview | vcs-gui-coverage §3 | Нет `diff --cached` UI | **Medium** |
| Post-commit → History | decisions §8.4 | Остаёмся в Project; toast only | **Low** |
| Log pagination | decisions §7.3 | `CommitList`: hint «Showing latest 100 commits»; `capped` flag, **нет Load more** | **Medium** |
| Branch checkout из Project | sidebar-project §2.2 | `currentBranch` read-only в Project mode | **By design** |
| Create branch + checkout | sidebar-history §2.6 | `createBranch(name)` без switch | **Medium** |
| Status summary (N modified) | architecture §5 | Только per-file badges + dirty dialog | **Medium** |
| VCS rm/mv vs FS ops | vcs-gui-coverage §3 | `workdir.rename` / `workdir.delete` only | **Medium** (ожидаемо) |
| gc.run, repo.rebuild | vcs-gui-coverage §1.1 | Нет вызовов в frontend | **Low** (CLI) |
| Object CRUD API | vcs-gui-coverage §1.7 | Нет GUI | **By design** (Blender) |
| Pre-merge Blender checklist | merge-dialog, usage_guide §6 | Merge dialog после `merge.start` | **Medium** (3D teams) |

### 4.3 Реализовано, но неочевидно из doc

| Фича | Где в коде |
|------|------------|
| Block commit if staged outside selection | `ContentInfoPanel.stagedOutsideSelection` |
| i18n EN + RU | `lib/i18n.ts` (decisions §8.7: EN only — **doc устарел**) |
| Fs watcher soft refresh | `workdirwatch`, `useProjectStatusPolling` |
| Preview cache per-path | `workdirPreviewCache.ts` |

---

## 5. Backlog — user stories и acceptance criteria

Приоритеты: **P0** — блокер ежедневного VCS; **P1** — сильное улучшение UX; **P2** — 3D/pipeline; **P3** — power-user / CLI parity.

Формат story: *Как \<персона\>, я хочу \<действие\>, чтобы \<ценность\>*.

---

### P0 — Staging loop

#### US-P0-1: Unstage файла

**Story:** Как Lead, я хочу снять файл с индекса после ошибочного stage, чтобы не коммитить лишнее.

**Зависимости:** `index.drop` в `dispatch.go` + `forester.ts` wrapper.

**Acceptance criteria:**

- [ ] API `index.drop { files: string[] }` в jsonapi с тестами
- [ ] Context menu на файле со статусом staged-* → **Unstage**
- [ ] После unstage badge обновляется через `status.get` (polling / watcher)
- [ ] Create commit dialog: список staged файлов с кнопкой remove per file (опционально в той же US)
- [ ] Ошибки — toast destructive ([toast.md](./toast.md))

**Файлы (ориентир):** `dispatch.go`, `forester.ts`, `FilePreviewGrid.tsx`, `CreateCommitDialog.tsx` или staging panel.

---

#### US-P0-2: Stash browser

**Story:** Как Artist, я хочу видеть и восстановить изменения после Stash & switch, чтобы не терять работу.

**Зависимости:** JSON API для stash (сейчас только implicit `auto_stash` в `repo.switch`).

**Acceptance criteria:**

- [ ] API: `stash.list`, `stash.apply`, `stash.pop` (или эквивалент Forester CLI) в jsonapi
- [ ] Entry point: Settings или History sidebar footer — **Stashes**
- [ ] Список stash entries: message, date, branch context
- [ ] Actions: Apply, Pop (с confirm)
- [ ] После Stash & switch toast содержит ссылку «View stash»
- [ ] Dirty tree / merge in progress — stash actions disabled с понятным copy

---

#### US-P0-3: Commit all changed

**Story:** Как Artist, я хочу закоммитить все изменённые файлы одной кнопкой, без ручного multiselect.

**Acceptance criteria:**

- [ ] Кнопка **Commit all changed** в Content Info footer (видна при `committable.length > 0` и selection empty или всегда рядом с Create commit)
- [ ] Click → `index.add(committable)` → открыть Create commit dialog
- [ ] Confirm если `committable.length > N` (N=50?) — optional
- [ ] Тот же dialog message/author flow что US-P11
- [ ] Не ломает сценарий «commit selected only»

**Файлы:** `ContentInfoPanel.tsx`, `CreateCommitDialog.tsx`.

---

### P1 — Прозрачность VCS-состояния

#### US-P1-1: Status summary в Project

**Story:** Как Lead, я хочу видеть сводку «3 modified, 1 untracked» в Project view, чтобы не включать Changed только ради подсчёта.

**Acceptance criteria:**

- [ ] Компактная строка под repo selector или в Preview toolbar (без лишнего chrome — [figma-gui-parity](../rules/figma-gui-parity.mdc))
- [ ] Данные только из `status.get` (не отдельный API)
- [ ] Клик → toggle Changed ON (optional shortcut)
- [ ] Обновление на watcher + polling без flicker grid

---

#### US-P1-2: Staged changes preview перед коммитом

**Story:** Как Lead, я хочу увидеть diff staged файлов перед Create, чтобы проверить содержимое коммита.

**Acceptance criteria:**

- [ ] В Create commit dialog (или pre-dialog step): список staged paths
- [ ] Выбор файла → unified diff staged vs HEAD (`diff.text` staged baseline — уточнить API)
- [ ] Файлы > 5 MB — stub «too large» ([decisions.md §7.7](./decisions.md))
- [ ] Работает для single-file stage из US-P0-1 / US-P0-3

**Зависимости:** возможно `diff --cached` в jsonapi ([vcs-gui-coverage.md §3](./vcs-gui-coverage.md)).

---

#### US-P1-3: Load more commits в History

**Story:** Как Lead, я хочу просматривать историю старше 100 коммитов, чтобы расследовать старые изменения.

**Acceptance criteria:**

- [ ] `log.get` с offset/cursor или увеличенным `max_count` + пагинация
- [ ] Footer в commit list: **Load more** когда `capped === true`
- [ ] Skeleton при подгрузке; selection не сбрасывается
- [ ] Hint «Showing latest N commits» остаётся accurate

**Файлы:** `HistorySidebarPanel.tsx`, `CommitList.tsx`, `forester.ts`.

---

#### US-P1-4: Create branch + checkout (optional)

**Story:** Как Artist, я хочу при создании ветки сразу на неё переключиться, чтобы начать работу без второго шага.

**Acceptance criteria:**

- [ ] Checkbox в `CreateBranchDialog`: «Checkout after create» (default OFF — сохранить текущее поведение)
- [ ] ON → `branch.create` → `repo.switch` (dirty → dirty dialog)
- [ ] Toast с именем ветки

---

#### US-P1-5: Post-commit navigation (optional)

**Story:** Как Lead, я хочу после коммита сразу увидеть его в History, чтобы проверить diff.

**Acceptance criteria:**

- [ ] Toast action **View in History** → switch `sidebarMode = 'history'`, select new `head_commit`
- [ ] Default: остаться в Project ([decisions.md §8.4](./decisions.md)) — action optional, не auto-switch

---

#### US-P1-6: Подключить commit.get screenshot в History header

**Story:** Как Artist, я хочу видеть preview `.blend` коммита в History header, не открывая diff pane.

**Acceptance criteria:**

- [ ] `PreviewCommitHeader` вызывает `fetchCommit(hash)` для `.blend`-heavy commits или по наличию `screenshot_path`
- [ ] Нет скриншота → текущий stub без регрессии
- [ ] Кэш per commit hash; abort stale requests

**Файлы:** `preview-commit-header.md`, `HistoryPreviewPanel`.

---

### P2 — GUI ↔ Blender (3D workflow)

#### US-P2-1: Pre-merge checklist

**Story:** Как Lead, я хочу перед merge увидеть, какие `.blend` требуют object tags в Blender, чтобы не сломать merge.

**Acceptance criteria:**

- [ ] Перед `merge.start`: scan changed `.blend` в target branch
- [ ] Dialog step или inline warning: «N blend files may need Mark To in Blender»
- [ ] CTA **Open Blender** (если `blender.path` в cfg) — `workdir.open` или OS handler
- [ ] Не блокирует merge (informative); блокировка только при `merge.status` conflicts

---

#### US-P2-2: Unsynced object tags hint

**Story:** Как Artist, я хочу знать, что `.blend` изменён, но manifests не синхронизированы, чтобы не забыть Mark To.

**Acceptance criteria:**

- [ ] Требует API или heuristic (сравнение manifest mtime vs `.blend` mtime — уточнить с backend)
- [ ] Badge или Content Info callout только для `.blend` в Changed
- [ ] Copy ссылается на Blender Mark To panel (не дублировать object CRUD в GUI)

---

#### US-P2-3: Deep link Open in Blender

**Story:** Как Artist, я хочу открыть `.blend` в Blender из File Viewer одним кликом.

**Acceptance criteria:**

- [ ] Если Blender в `externalEditorPaths` или `[blender].path` — пункт **Open in Blender** в context menu и File Viewer toolbar
- [ ] `workdir.open` с blender executable
- [ ] Disabled для deleted / foreign lock

---

### P3 — Power user / doc hygiene

#### US-P3-1: CLI operations map в Settings

**Story:** Как Pipeline TD, я хочу видеть в GUI, какие операции доступны только в CLI, чтобы не искать в документации.

**Acceptance criteria:**

- [ ] Settings → Forester tab: collapsible «CLI-only operations» (ссылка на `doc/forester_command_short.md`)
- [ ] Список: cherry-pick, tags, gc, hooks, review — без реализации в GUI
- [ ] sr-only / minimal UI per [figma-gui-parity](../rules/figma-gui-parity.mdc)

---

#### US-P3-2: Синхронизация документации

**Story:** Как разработчик, я хочу чтобы decisions и coverage отражали код, чтобы анализ и onboarding не вводили в заблуждение.

**Acceptance criteria:**

- [ ] [decisions.md §8.5](./decisions.md): locks — GUI acquire/release shipped
- [ ] [decisions.md §8.7](./decisions.md): i18n RU shipped или scope EN-only уточнён
- [ ] [vcs-gui-coverage.md](./vcs-gui-coverage.md): дата и статус `commit.get`, locks обновлены

---

## 6. Предлагаемые изменения пользовательских потоков

### 6.1 «Review before commit» (целевой flow)

```
Changed ON → обзор committable
  → [optional] stage subset / unstage mistakes
  → Staged summary + diff preview
  → Create commit → toast [View in History]
```

Заменяет текущий узкий путь «select files → stage on open dialog → commit».

### 6.2 «Merge preparation» (3D)

```
History → Merge into current
  → Pre-check .blend + object manifests
  → [Open Blender] Mark To → sync
  → merge.start → Merge dialog (objects preview)
  → merge.continue
```

Документировать в [merge-dialog.md](./merge-dialog.md) как § «Pre-merge» при реализации US-P2-1.

### 6.3 Единый VCS context indicator

Persistent (repo selector area):

- `currentBranch` (+ detached)
- merge banner if in progress
- optional stash count (после US-P0-2)

Связывает Project и History без дублирования branch selector в Project mode.

---

## 7. Матрица трассировки: сценарий → story → спека

| Сценарий ID | Backlog | Спека |
|-------------|---------|-------|
| P11 Create commit | US-P0-3, US-P1-2 | create-commit-dialog.md |
| H4 Stash & switch | US-P0-2 | dirty-branch-switch-dialog.md |
| P3 Changed | US-P1-1 | content-preview-project-view.md §8 |
| H1 Log >100 | US-P1-3 | sidebar-history-view.md |
| H7 Merge | US-P2-1 | merge-dialog.md |
| P9 Locks | US-P3-2 (doc) | file-preview-item.md §2.3 |
| B1–B3 Blender | US-P2-1, US-P2-2, US-P2-3 | usage_guide.md §5–6 |

---

## 8. Рекомендуемый порядок реализации

| Sprint | Stories | Rationale |
|--------|---------|-----------|
| 1 | US-P3-2, US-P0-3 | Doc fix + быстрая ценность без backend |
| 2 | US-P0-1 | Backend `index.drop` + unstage UI |
| 3 | US-P0-2 | Stash API + panel — разблокирует branch switch anxiety |
| 4 | US-P1-1, US-P1-3 | Visibility + long history |
| 5 | US-P1-2, US-P1-6 | Staged diff + blend screenshot |
| 6 | US-P2-* | 3D team workflows |

---

## 9. Out of scope (оставить CLI / Blender)

Не включать в GUI backlog без отдельного product decision:

- `cherry-pick`, `reflog`, `tag`, `hook`, `forester review`
- `gc.run`, `repo.rebuild`
- Object CRUD (`object.add`, `object.tag.*`) — Blender addon
- Full Git parity (`commit --amend`, `diff --cached` без явного API design)

---

## 10. QA — smoke scenarios (регрессия)

Из [implementation-plan-v2.md §1.2](./implementation-plan-v2.md); расширить при закрытии backlog:

| # | Scenario | Pass criteria |
|---|----------|---------------|
| Q1 | Cold start → auto-open | Repo loads, All files default |
| Q2 | Changed ON → commit selected | Badges clear after commit |
| Q3 | Stash & switch → stash UI (US-P0-2) | Stash visible and recoverable |
| Q4 | Unstage (US-P0-1) | Staged badge removed |
| Q5 | Commit all (US-P0-3) | All committable in one commit |
| Q6 | History load more (US-P1-3) | Commits >100 accessible |
| Q7 | Merge + object preview | Merge dialog shows blend objects |
| Q8 | File History Revert | Working tree file restored |
| Q9 | Scroll thumbnails | No flicker after scroll away/back ([virtual-scroll-preview-ux](../rules/virtual-scroll-preview-ux.mdc)) |
