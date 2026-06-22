# Sidebar — History view

Режим просмотра **веток и коммитов**.  
**Figma:** [node 7301:17611](https://www.figma.com/design/GTu6s7FMr4Tn1NWrYeGpIF/?node-id=7301-17611)

---

## 1. Назначение

Пользователь выбирает **ветку**, просматривает **линейный список коммитов**, фильтрует поиском и выбирает коммит для просмотра в Content Preview / Info.

**Не в scope v1 Sidebar:** checkout (`repo.switch`), создание/удаление веток, merge — только навигация и selection.

---

## 2. Анатомия UI

```
┌─────────────────────────────────────┐
│ History                             │  ← Header (без Switch)
├─────────────────────────────────────┤
│ [⑂] Branch name              [⇕]    │  ← Branch selector
│ [ Type to search...           ]     │  ← Search input
├─────────────────────────────────────┤
│ Author              1 week ago      │
│ Comment message                     │
│ Description                         │
│─────────────────────────────────────│
│ Author              2 weeks ago     │
│ ...                                 │
└─────────────────────────────────────┘
```

### 2.1 Header

- Только заголовок `History` (semibold 16px).
- Без toggle «Changed» — он относится только к Project view.

### 2.2 Branch selector

- Icon `GitBranch`, label = имя **просматриваемой** ветки (`historyBranch`).
- Dropdown — два типа действий (см. §2.5).

**Важно:** `historyBranch` (что смотрим в log) и `currentBranch` (на какой ветке рабочая копия) — **разные поля**. Они совпадают после checkout, но могут расходиться при «browse without checkout».

### 2.5 Branch selector: browse vs checkout

В Git-клиентах два разных намерения:

| Намерение | Пример | Меняет рабочую капию? |
|-----------|--------|------------------------|
| **Browse** | «Покажи коммиты `feature/ui`» | Нет |
| **Checkout** | «Переключи проект на `feature/ui`» | Да (`forester switch`) |

#### Рекомендуемая модель для v1

**Dropdown = только browse.** Выбор ветки в списке:

1. Устанавливает `historyBranch`.
2. Загружает `log.get` для этой ветки.
3. **Не** вызывает `repo.switch`.
4. Индикатор в dropdown: `is_current` → иконка/check «это текущая ветка WC».

**Checkout — отдельное явное действие**, чтобы не перезаписать несохранённые изменения случайным кликом.

#### Где делать checkout

| Место | UX |
|-------|-----|
| **Строка ветки в dropdown** | Secondary action: иконка `GitBranch` + «Checkout» справа, или submenu |
| **Контекстное меню** | Right-click на ветке в dropdown → «Checkout branch» |
| **Кнопка в header** (v1.1) | Если `historyBranch !== currentBranch` → outlined button «Checkout this branch» |

#### Flow checkout

```mermaid
flowchart TD
  A[User: Checkout branch X] --> B{status.get: dirty?}
  B -->|clean| C[repo.switch X]
  B -->|dirty| D[Dialog: Stash / Discard / Cancel]
  D -->|Stash| E[stash.save + switch -a]
  D -->|Discard| F[Dialog confirm + switch]
  D -->|Cancel| G[Abort]
  C --> H[Refresh status + branches + log]
  E --> H
  F --> H
  H --> I[currentBranch = X, historyBranch = X]
```

**Dirty** = любой непустой массив в `status.get` (staged/unstaged/untracked) или merge in progress.

#### Диалог при dirty tree

```
Switch branch to "feature/ui"?

You have uncommitted changes:
• 3 modified
• 1 untracked

[ Cancel ]  [ Stash & switch ]  [ Switch anyway ]
```

- **Stash & switch** → `repo.switch` с `auto_stash: true` (Forester `-a`).
- **Switch anyway** → обычный `repo.switch` (может fail — показать error от Forester).
- После успеха: обновить Project view + History; `historyBranch` = новая current.

#### Когда browse без checkout полезен

- Сравнить историю `main` и `feature`, оставаясь на feature.
- Посмотреть коммиты релизной ветки, не переключая рабочую копию.
- Code review: листать чужую ветку.

#### Визуальные индикаторы

| Состояние | UI |
|-----------|-----|
| `historyBranch === currentBranch` | Branch label normal; check в dropdown |
| `historyBranch !== currentBranch` | Muted subtitle под selector: «Viewing · not checked out» или dot badge |
| Merge in progress | Banner над list: «Merge in progress»; checkout disabled |
| Detached HEAD (v2) | «(detached)» в label |

#### Corner cases checkout

| Ситуация | Поведение |
|----------|-----------|
| Checkout на ту же ветку | No-op + toast «Already on branch X» |
| Checkout при merge in progress | Block; suggest `merge --continue` / `--abort` |
| Switch fail (Forester error) | Toast + не менять `currentBranch` |
| После checkout log другой ветки | Опционально: auto-set `historyBranch = currentBranch` (настраиваемо) |
| User browsed branch B, then checkout B | `historyBranch` уже B — без скачка списка |

#### Альтернатива (не рекомендуется для v1)

**Dropdown сразу делает checkout** — как в простых GUI. Минус: каждый просмотр log другой ветки перезаписывает WC; нужен confirm на каждый клик → раздражает. Имеет смысл только если History = «список веток проекта», а не «просмотр истории».

### 2.3 Search

- Placeholder: `Type to search...`
- Фильтрация **клиентская** по уже загруженному log.
- Поля поиска: `message`, `author`, `hash` (prefix), `description` если появится в API.

Debounce: 150ms.

### 2.4 Commit list item

| Зона | Поле | Источник |
|------|------|----------|
| Top left | Author | `commit.author` |
| Top right | Relative time | `commit.timestamp` → `formatDistanceToNow` |
| Middle | Message | `commit.message` (medium weight) |
| Bottom | Description | v1: нет в API → скрыть или дублировать truncated message |

**Figma** показывает отдельное поле Description — в Forester commit model есть только `message`. В v1:
- `description` = вторая строка = first line of message after `\n\n`, или omitted.
- v2: расширить commit model / парсить conventional commits.

Клик по item → `{ kind: 'commit', hash, branch: historyBranch }`.

Selected state: `bg-accent` border-l или ring.

---

## 3. Data flow

```mermaid
sequenceDiagram
  participant UI as HistoryViewPanel
  participant W as Wails Go
  participant F as Forester jsonapi

  UI->>W: ListBranches(repoPath)
  W->>F: branch.list
  F-->>W: branches[]
  W-->>UI: branches

  UI->>UI: historyBranch ||= current from is_current

  UI->>W: GetLog(repoPath, historyBranch, maxCount)
  W->>F: log.get
  F-->>W: commits[]
  W-->>UI: commits

  Note over UI: client filter by search

  UI->>W: GetCommit(repoPath, hash) [on select, optional]
  W->>F: commit.get
```

### 3.1 API payloads

**`branch.list`**

```json
{
  "branches": [
    { "name": "main", "commit_hash": "abc…", "created_at": 0, "is_current": true }
  ]
}
```

**`log.get`** args: `{ "branch": "main", "max_count": 100 }`

```json
{
  "commits": [
    {
      "hash": "…",
      "parent_hash": "…",
      "parent_hashes": ["…"],
      "author": "Name",
      "message": "Comment message",
      "timestamp": 1710000000,
      "screenshot_path": ".DFM/screenshots/….png"
    }
  ]
}
```

Default `max_count`: 100. v2: «Load more» pagination.

---

## 4. Состояние History view

```ts
interface HistoryViewState {
  branches: Branch[]
  historyBranch: string
  commits: Commit[]
  filteredCommits: Commit[]
  searchQuery: string
  selectedCommitHash: string | null
  loadingBranches: boolean
  loadingLog: boolean
  error: string | null
}
```

### 4.1 Инициализация

1. Load branches.
2. `historyBranch` = saved per-repo OR branch where `is_current === true` OR `"main"`.
3. Load log for `historyBranch`.
4. Select first commit **не** автоматически (избегаем лишних preview loads) — только если был saved selection.

---

## 5. Corner cases

### 5.1 Нет веток (не должно случиться)

- Forester всегда создаёт `main` при init.
- Fallback: empty + error «No branches».

### 5.2 Ветка без коммитов

- `commit_hash === ""` в branch.list.
- Log → `commits: []`.
- Empty: «No commits on this branch».

### 5.3 `historyBranch` удалена извне

- После refresh branch отсутствует в list.
- Fallback на `is_current` branch + toast.

### 5.4 Detached HEAD

- `branch.list`: одна ветка `is_current`, но HEAD может не совпадать с branch tip (если Forester такое поддерживает).
- Показать indicator в branch selector «detached» — если API отдаёт; иначе v2.

### 5.5 Merge commit (2+ parents)

- В списке отображать как обычный коммит.
- Optional icon `GitMerge` если `len(parent_hashes) > 1`.
- Preview/Info покажут merge details.

### 5.6 Очень длинное message

- Item: 1 строка title + line-clamp 2 для body.
- Full text в Content Info после select.

### 5.7 Поиск без результатов

- Inline empty: «No commits match "query"».
- Clear search button в Input (shadcn `X`).

### 5.8 Timestamp

- `timestamp` — unix seconds (проверить при интеграции).
- Invalid / 0 → показывать «—».
- Future skew → «in …» или absolute date.

### 5.9 Screenshot path

- Sidebar **не** показывает thumbnail в v1 (только text).
- v2: optional avatar/thumbnail слева если `screenshot_path` exists и file readable.

### 5.10 Log loading при быстрой смене ветки

- Cancel / ignore stale responses (request id или AbortController pattern в Wails wrapper).
- Показывать skeleton на list при `loadingLog`.

### 5.11 Selected commit исчез из log

- После refresh / смены branch: если hash не в list → clear selection.

### 5.12 Тысячи коммитов

- v1: cap 100 + hint «Showing latest 100 commits».
- v2: infinite scroll + `log.get` offset/cursor (требует API).

### 5.13 Unicode / emoji в message

- Normal UTF-8 display; search case-insensitive locale-aware.

### 5.14 Concurrent new commit

- Polling log при focus (optional, реже чем status).
- Новый commit появляется сверху; selection не меняется.

### 5.15 Branch selector: только одна ветка

- Dropdown всё равно кликабелен (для future create branch).

---

## 6. Компоненты (React)

| Component | Responsibility |
|-----------|----------------|
| `HistoryViewPanel` | Orchestration |
| `HistoryHeader` | Title |
| `BranchSelector` | Dropdown + load branches |
| `CommitSearch` | Controlled Input |
| `CommitList` | ScrollArea + map |
| `CommitListItem` | Row layout from Figma |

### Keyboard

- `↑` / `↓` — move selection in filtered list.
- `Enter` — confirm selection.
- `/` — focus search (optional).

---

## 7. Отличия от Project view

| | Project view | History view |
|---|-------------|--------------|
| Rail icon active | `FolderGit2` | `GitFork` |
| Header extra | Changed Switch | — |
| Context dropdown | Repo name | Branch name |
| List content | Folders / changed files | Commits |
| Primary API | `status.get`, `ListWorkdirFolders` | `branch.list`, `log.get` |
| Selection type | `folder` / `file` | `commit` |

При переключении rail Project ↔ History: **сброс selection** (см. [architecture.md](./architecture.md) §6.10).

---

## 8. Решения и открытые вопросы

| # | Тема | Решение |
|---|------|---------|
| 1 | Branch dropdown | **Browse log only** — `historyBranch` + `log.get`; checkout отдельно (§2.5) |
| 2 | Description в commit row | v1: вторая строка = первая строка после `\n\n` в `message`, иначе скрыть |
| 3 | Auto-select первого коммита | **Нет** — selection пустой до клика пользователя |
| 4 | Graph view (`lol`) | Вне Sidebar v1; отдельная панель / v2 |
