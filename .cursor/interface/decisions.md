# Forester GUI — decision log

Канон продуктовых и технических решений **до и во время реализации**. При конфликте со спекой atom-компонента — **этот документ главнее**, если в спеке нет явной ссылки сюда.

**Связанные:** [plan.md](./plan.md) · [architecture.md](./architecture.md) · [api-contract.md](./api-contract.md)

**Статус:** historical decision log, refreshed against shipped v1.1/v2 scope on 2026-06-25. Active release hardening is tracked in [implementation-plan-v2.md](./implementation-plan-v2.md).

---

## 1. Версии и текущий статус

| Scope | Status |
|-------|--------|
| **v1.0** | Закрыто: open repo → browse → commit → history → diff |
| **v1.1** | Закрыто: polish, settings, commit card stats/menu, native menu |
| **v2 feature scope** | Закрыто: Merge UI, fs watcher, detached HEAD, rename `R`, branch delete, init wizard |
| **Release hardening** | Активно: Windows smoke and Linux build/QA |

---

## 2. Scope v1.0 (IN)

| Область | Входит |
|---------|--------|
| Shell | Rail, 3-panel resize, multi-repo, min window |
| Project | Sidebar folder tree (lazy), Preview grid, Info **single file** |
| History | Branch switch, commit list, diff (text / image / binary stub) |
| Dialogs | Create commit, create branch, dirty branch switch |
| Commit card | Select + full ⋮ menu (§6) |
| Backend | Новые `jsonapi` обёртки — [api-contract.md §7](./api-contract.md) |
| Settings | Profile (author), Repositories, Forester (read-only paths) |
| Polling | `status.get` каждые 5s в Project mode + window focus |

### Платформы v1.0

- **macOS**, **Windows**
- Linux — v1.1 (нет blocker в коде путей, но нет CI/QA)

### Расположение Wails-проекта

```
sources/gui/
  main.go
  frontend/
  wails.json
```

Forester CLI — **не bundle** в v1.0; путь из `~/.dfm/setup.cfg` `[forester].path`.

---

## 3. Shipped / Backlog Matrix

| Фича | Status | Примечание |
|------|--------|------------|
| [merge-dialog.md](./merge-dialog.md) | Shipped | API `merge.*` in [api-contract.md §2.2](./api-contract.md) |
| Marquee multiselect | Shipped | [content-preview-project-view.md §9.3](./content-preview-project-view.md) |
| Virtual scroll / large repo handling | Shipped with backlog polish | Pagination remains the backend guard |
| Real `workdir.thumbnail` | Shipped | Images + `.blend` preview fallback |
| External editors / OS open | Shipped | `workdir.open` |
| Init repository wizard | Shipped | [init-repository-dialog.md](./init-repository-dialog.md) |
| Dark theme | Shipped | Settings |
| Detached HEAD indicator | Shipped | `status.is_detached` + banner |
| Branch create/delete (GUI) | Shipped | History dropdown/actions |
| `commit.reset` submenu | Shipped | Destructive confirmation |
| Commit card full ⋮ | Shipped | Compare, restore, revert, reset, copy |
| `diff.stat` на каждой commit card | Shipped | `CommitCardStats` |
| Native app menu (macOS) | Shipped | [application-menu.md](./application-menu.md) |
| Fs watcher | Shipped | `sources/gui/internal/workdirwatch` |
| Rename `R` в diff | Shipped | History changed-file badge |
| Windows smoke | Active | [implementation-plan-v2.md](./implementation-plan-v2.md) |
| Linux build + QA | Active | [implementation-plan-v2.md](./implementation-plan-v2.md) |

---

## 4. Vertical slices (порядок PR)

| # | Slice | Definition of done |
|---|-------|-------------------|
| 1 | Shell + `OpenRepo` | Окно, Rail, repo picker, empty state |
| 2 | Project browse | Lazy tree + file grid + status badges |
| 3 | Create commit | Single Info + dialog |
| 4 | History + diff | Commit list + text/image/binary diff |
| 5 | Polish slice | Multiselect (click + Ctrl), resize persist, Settings |

Backend для slice 2–4 — **до или вместе** с UI по [api-contract.md §7](./api-contract.md). Slice 1 может стартовать параллельно с `workdir.tree` / `workdir.entries`.

---

## 5. Отступления v1.0 от atom-спек

| Спека | Было | v1.0 |
|-------|------|------|
| [sidebar-project-view.md §2.3](./sidebar-project-view.md) | Always expanded tree | **Lazy expand:** первый уровень при open; дети по клику chevron |
| [commit-card.md §2.4](./commit-card.md) | Files changed row | **Скрыта** (нет `diff.stat` per card) |
| [content-preview-project-view.md §9](./content-preview-project-view.md) | Full multiselect + marquee | **Click + Ctrl/Cmd toggle**; Shift-range — v1.1 |
| [settings-dialog.md](./settings-dialog.md) | 5 вкладок | **3 вкладки:** Profile, Repositories, Forester |
| [architecture.md §2.0](./architecture.md) | History min 1081 | Без изменений |

---

## 6. Commit card ⋮ menu

| Item | Status |
|------|--------|
| View in Preview | Shipped |
| Compare with working tree | Shipped |
| Restore this version | Shipped |
| Revert commit | Shipped |
| Reset to this commit | Shipped |
| Copy hash | Shipped |
| Copy message | Shipped |

Compare для файла — только Content Info History ([info-history-section.md](./info-history-section.md)).

---

## 7. API и backend

### 7.1 Имена методов

| Документ (старое) | Канон в коде |
|-------------------|--------------|
| old object-by-file alias | **`object.list_by_file`** — `dispatch.go` |

### 7.2 `diff.name_status` — initial commit

```json
{ "from": null, "to": "<commit_hash>" }
```

`from: null` → пустое дерево baseline (все файлы `A`). Строка `""` **не** использовать.

### 7.3 `log.get`

- Default `max_count`: **100** (уже в `handlers_query.go`).
- UI hint: «Showing latest 100 commits».
- Filter `path` — v1.0 для Content Info History.

### 7.4 `diff.stat`

- Shipped for commit cards and preview header.

### 7.5 `workdir.entries` — пагинация (v1.0)

```json
{ "path": "assets", "offset": 0, "limit": 200 }
→ { "entries": [...], "total": 4521, "has_more": true }
```

Default `limit`: 200. Альтернатива virtual scroll в v1.1.

### 7.6 `workdir.tree` — lazy (v1.0)

```json
{ "path": "", "depth": 1 }
```

Только immediate children; `depth` optional, default 1. Полное дерево — v1.1 или expand-on-demand.

### 7.6.1 Workdir exclusions в GUI

- Файл **`.dfmignore`** в корне репозитория **никогда не отображается** в Project view (tree, entries, search) — это служебный конфиг, не контент проекта.
- Паттерны из `.dfmignore` по-прежнему применяются к остальным путям.
- Канон: [api-contract.md §4.0](./api-contract.md); реализация: `workdir_scan.go` → `shouldSkipName`.

### 7.7 `diff.text` / `blob.get` — лимиты

- Ответ > **5 MB** → error `file_too_large`; UI — stub «File too large to display».
- Abort stale requests при быстром переключении файлов.

### 7.8 Screenshot для `.blend`

- Источник: `commit.get.screenshot_path` (один на коммит).
- Wails: Go читает PNG с диска → `screenshot_base64` в ответе `commit.get` или отдельный shell method v1.0.
- Нет скриншота → generic [binary-diff-stub.md](./binary-diff-stub.md).

### 7.9 Workdir thumbnail для `.blend`

- **Не** запускать Blender из GUI для grid/Info preview.
- Источник: кэш Blender в папках thumbnails ОС ([api-contract.md §4.3.2](./api-contract.md)), затем embedded `TEST` chunk в `.blend`.
- Пути кэша по платформе совпадают с `get_thumb_dir` в Blender (`~/.thumbnails` на Win/macOS; `$XDG_CACHE_HOME/thumbnails` на Linux).
- History diff для `.blend` — по-прежнему `commit.get` screenshot ([§7.8](#78-screenshot-для-blend)), не `workdir.thumbnail`.

---

## 8. UX — зафиксированные правила

### 8.1 History selection

| Уровень | Поведение |
|---------|-----------|
| Вход в History (Rail) | Auto-select коммит: saved `dfm.history.selectedCommitHash` если в log, иначе **первый** (новейший); карточка **Selected** |
| Выбор / активация коммита | Content Preview: auto-select **первый changed file** A→Z + загрузка diff |
| Saved commit отсутствует в log | Fallback на **первый** коммит в log; если log пуст — empty Preview |
| Уход History → Project | Clear `selectedCommitHash` |

### 8.2 Dirty branch switch

- v1.0: только **Cancel** + **Stash & switch** ([dirty-branch-switch-dialog.md](./dirty-branch-switch-dialog.md)).
- **Try anyway** / **Discard** — не показывать в v1.0.
- После stash+switch: toast «Switched branch (changes stashed)»; stash list UI — нет.

### 8.3 Add repository без `.DFM`

- [init-repository-dialog.md](./init-repository-dialog.md): init wizard for folders without `.DFM`.
- **Cancel** → error `not a Forester repository` (inline / toast).
- **Create** → `repo.init` → add known repo / append in Settings list.
- CLI `forester init` remains the non-GUI alternative.

### 8.4 После `commit.create`

- Остаться в **Project view**; refresh status + badges.
- Toast с short hash; auto-switch в History — v1.1.

### 8.5 Locks

- v1.0: **read-only** badge из `lock.list`.
- Acquire/release — Blender / CLI only.

### 8.6 Конкурентность

- GUI + Blender + CLI: **fs watcher** (`workdir:changed`, debounce 300ms) + polling `status.get` (5s, window focus) + refresh on window focus.
- `setup.cfg`: last-write-wins в v1.0.

### 8.7 Язык UI

- v1.0: **English** only (`[gui].language = en`).

---

## 9. Противоречия — как закрыты

| # | Было | Решение | Секция |
|---|------|---------|--------|
| 1 | Merge dialog в plan vs old v2 architecture | **Shipped** | §3 |
| 2 | Try anyway в flowchart `sidebar-history-view` | Удалено из flowchart | §8.2 |
| 3 | v1 full scope vs v1 polish | **v1.0 + v1.1** | §1 |
| 4 | Old object-by-file alias vs canonical method | **`object.list_by_file`** | §7.1 |
| 5 | Index metadata storage | **JSON** `.DFM/index` (SQLite removed) | — |
| 6 | Fully expanded tree vs performance | **Lazy v1.0** | §5 |

---

## 10. Связанные документы (обновлены под этот log)

- [plan.md](./plan.md) — original doc map plus current scope summary
- [api-contract.md](./api-contract.md) — API дополнения
- [sidebar-history-view.md](./sidebar-history-view.md) — branch flowchart
- [sidebar-project-view.md](./sidebar-project-view.md) — lazy tree v1.0
- [architecture.md](./architecture.md) — фазы реализации
- [implementation-plan.md](./implementation-plan.md) — v1.0 / v1.1 (закрыт)
- [implementation-plan-v2.md](./implementation-plan-v2.md) — active platform QA and release hardening
