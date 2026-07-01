# VCS / API — покрытие GUI

Аудит: какие методы Forester JSON API и Wails shell доступны из GUI, а какие остаются CLI-only.

**Источник методов:** `sources/forester/internal/jsonapi/dispatch.go`  
**Обёртки GUI:** `sources/gui/frontend/src/wails/forester.ts`, `bridge.ts`, `settings.ts`  
**Связанные:** [api-contract.md](./api-contract.md) · [architecture.md](./architecture.md) · [decisions.md](./decisions.md)

Обновлено: 2026-06-30.

---

## Легенда

| Статус | Значение |
|--------|----------|
| **Да** | Метод вызывается из UI; сценарий доступен пользователю |
| **Частично** | Есть UI, но не весь аналог CLI (одна операция из группы, auto-stash без stash UI и т.д.) |
| **Обёртка** | Функция в `forester.ts` / Wails bindings есть, **ни один экран не вызывает** |
| **Нет** | Метод в JSON API, GUI не использует |
| **Только CLI** | Нет handler в `dispatch.go`; только `forester` CLI |

---

## 1. JSON API (`ForesterCall`)

### 1.1 Repository & status

| Метод | CLI / Git-аналог | Статус | GUI |
|-------|------------------|--------|-----|
| `repo.init` | `forester init` | **Да** | Init wizard → `InitRepositoryWithOptions` (Wails) |
| `status.get` | `forester status` | **Да** | Polling (`useProjectStatusPolling`), badges, Changed, committable |
| `repo.switch` | `forester switch` | **Частично** | Checkout ветки / detached commit; dirty → **Stash & switch** only (`auto_stash`) |
| `repo.rebuild` | `forester rebuild` | **Нет** | — |
| `gc.run` | `forester gc` | **Нет** | — |

### 1.2 Index & commit

| Метод | CLI / Git-аналог | Статус | GUI |
|-------|------------------|--------|-----|
| `index.add` | `forester add` | **Да** | Create commit dialog (pre-step staging) |
| `index.drop` | `forester drop` | **Только CLI** | Нет в `dispatch.go`; unstage из GUI недоступен |
| `commit.create` | `forester commit` | **Частично** | Message + author; нет `--amend`, `--tag`, `-a` |
| `commit.get` | `forester show` (meta) | **Обёртка** | `fetchCommit()` в `forester.ts`; UI использует данные из `log.get` |
| `commit.revert` | `forester revert` | **Да** | Commit card ⋮ |
| `commit.reset` | `forester reset` | **Да** | Commit card ⋮ → soft / mixed / hard + confirm |

### 1.3 History & diff

| Метод | CLI / Git-аналог | Статус | GUI |
|-------|------------------|--------|-----|
| `log.get` | `forester log` | **Да** | History sidebar; `path` filter → File History, Info History |
| `diff.name_status` | `diff --name-status` | **Да** | History preview, File History, Merge dialog |
| `diff.stat` | `diff --stat` | **Да** | Commit cards (`commitStatsCache`), `PreviewCommitHeader` |
| `diff.text` | `diff --unified` | **Да** | History text diff, File History |
| `blob.get` | `show <commit>:<path>` | **Да** | Image diff в File History |
| `compare.extract` | `forester compare` | **Да** | Commit card Compare, File History tmp_review |
| `restore.file` | `restore --source=…` | **Да** | File History → Revert file |
| `restore.version` | `forester restore-version` | **Да** | Commit card ⋮ |

### 1.4 Branches

| Метод | CLI / Git-аналог | Статус | GUI |
|-------|------------------|--------|-----|
| `branch.list` | `forester branch` | **Да** | `BranchSelector`, File History branch filter |
| `branch.create` | `forester branch <name>` | **Да** | Create branch dialog |
| `branch.delete` | `forester branch -d` | **Да** | Delete branch confirm |
| `branch.rename` | `forester branch -m` | **Нет** | — |

### 1.5 Merge

| Метод | CLI / Git-аналог | Статус | GUI |
|-------|------------------|--------|-----|
| `merge.status` | read `MERGE_HEAD` | **Да** | History banner, Merge dialog |
| `merge.start` | `forester merge <branch>` | **Да** | Merge dialog |
| `merge.continue` | `forester merge --continue` | **Да** | Merge dialog |
| `merge.abort` | `forester merge --abort` | **Да** | History banner |

### 1.6 Locks

| Метод | CLI / Git-аналог | Статус | GUI |
|-------|------------------|--------|-----|
| `lock.list` | `forester lock list` | **Да** | Lock badges; check перед `restore.file` |
| `lock.acquire` | `forester lock` | **Да** | File context menu (Project grid) |
| `lock.release` | `forester lock unlock` | **Да** | File context menu |

> В [decisions.md §8.5](./decisions.md) для v1.0 указано read-only locks; в коде acquire/release уже в `FilePreviewGrid`.

### 1.7 Objects (Blender manifest)

| Метод | CLI / аналог | Статус | GUI |
|-------|--------------|--------|-----|
| `object.list_by_file` | manifest by file | **Да** | Merge dialog (object preview) |
| `objects.by_file` | alias → `object.list_by_file` | **Да** | То же |
| `object.list_by_commit` | objects in commit | **Нет** | — |
| `object.add` | — | **Нет** | Blender / CLI |
| `object.get` | — | **Нет** | — |
| `object.delete` | — | **Нет** | — |
| `object.delete_by_file` | — | **Нет** | — |
| `object.tag.add` | — | **Нет** | — |
| `object.tag.remove` | — | **Нет** | — |
| `object.metadata.set` | — | **Нет** | — |

### 1.8 Workdir (FS)

| Метод | Назначение | Статус | GUI |
|-------|------------|--------|-----|
| `workdir.tree` | Sidebar folders | **Да** | `FolderTree`, expand/collapse, `projectStore` |
| `workdir.entries` | Preview list | **Да** | Folders/files grid; `path: "*"` = All files |
| `workdir.entries_by_paths` | Changed flat list | **Да** | Changed ON → timestamps для sort |
| `workdir.search` | Global search | **Да** | Preview toolbar Search |
| `workdir.metadata` | File stat + mime | **Да** | Content Info; polling deleted files |
| `workdir.thumbnail` | Thumbnails | **Да** | `workdirPreviewCache`, grid + Info |
| `workdir.open` | OS / editor open | **Да** | Double-click, Edit in…, tmp_review |
| `workdir.rename` | Rename file | **Да** | File context menu |
| `workdir.delete` | OS Trash | **Да** | File context menu (не VCS `rm`) |

---

## 2. Wails shell (не `ForesterCall`)

| Метод | Статус | GUI |
|-------|--------|-----|
| `OpenRepo` | **Да** | Cold start, repo selector |
| `CloseRepository` | **Да** | Clear repo / settings empty list |
| `GetKnownRepos` | **Да** | Repo selector, Settings |
| `AddKnownRepo` | **Да** | Add repository flow |
| `RemoveKnownRepo` | **Обёртка** | Wails binding; список правится через `SaveSettingsRepos` |
| `IsForesterRepository` | **Да** | Add repo → init wizard gate |
| `InitRepository` / `InitRepositoryWithOptions` | **Да** | Init wizard (`repo.init`) |
| `GetCurrentRepoPath` | **Да** | App state |
| `PickRepositoryFolder` | **Да** | Folder picker |
| `GetRepoUser` | **Да** | Locks (`fetchRepoUser`) |
| `SetRepoUser` | **Обёртка** | Binding есть; профиль → `SaveSettingsProfile` |
| `GetSettings` | **Да** | Settings dialog load |
| `SaveSettingsProfile` | **Да** | Settings → Profile |
| `SaveSettingsRepos` | **Да** | Settings → Repositories |
| `SaveSettingsEditors` | **Да** | Settings → External editors |
| `SaveSettingsForester` | **Да** | CLI / Blender / addon paths |
| `SaveSettingsAppearance` | **Да** | Theme / font |
| `ForesterCall` | **Да** | Все JSON API выше |

---

## 3. CLI без JSON API (только терминал)

Команды из [forester_command_short.md](../../doc/forester_command_short.md), для которых **нет** handler в `dispatch.go` и **нет** эквивалента в GUI:

| CLI | Комментарий |
|-----|-------------|
| `forester drop` | Unstage; в GUI нет |
| `forester rm` | VCS remove; GUI: `workdir.delete` (корзина ОС), не то же самое |
| `forester mv` | VCS move; GUI: `workdir.rename` (FS only) |
| `forester stash` (list/pop/apply/…) | Только implicit stash при `repo.switch -a` |
| `forester cherry-pick` | — |
| `forester move-to` | — |
| `forester reflog` | — |
| `forester tag` | — |
| `forester clean` | — |
| `forester hook` | — |
| `forester config` | GUI: `~/.dfm/setup.cfg` через Settings, не `forester config` |
| `forester review` | — |
| `commit --amend`, `--tag`, `-a`, `--no-verify` | — |
| `restore --staged` | — |
| `diff --cached` / staged diff view | — |
| `forester lol` | — |

---

## 4. Сводка

| Категория | Всего в API | Да / частично | Нет / обёртка | Только CLI |
|-----------|-------------|---------------|---------------|------------|
| JSON API (`dispatch.go`) | 48 handlers¹ | **38** | **10** | **1** (`index.drop` отсутствует в API) |
| Wails shell | 17 | **15** | **2** (`RemoveKnownRepo`, `SetRepoUser`) | — |
| Расширенный CLI (без API) | ~20 команд | ~8 частичных аналогов | — | **остальное** |

¹ `objects.by_file` — alias `object.list_by_file`, в счётчике не дублируется.

### Покрытие по смыслу

| Вопрос | Ответ |
|--------|--------|
| Задокументированный desktop-workflow (v1/v2)? | **Да** — browse, commit, history, diff, branches, merge, init |
| Весь Forester JSON API? | **Нет** — ~79% методов с UI; gaps: `branch.rename`, `gc.run`, `repo.rebuild`, object CRUD |
| Весь Forester CLI? | **Нет** — maintenance, stash UI, tags, cherry-pick, unstage, hooks, review |

### Приоритетные пробелы (если расширять GUI)

1. **Unstage** — нужен `index.drop` в API + кнопка в Create commit / context menu  
2. **Branch rename** — API уже есть  
3. **`commit.get`** — обёртка есть; можно подключить screenshot в History header  
4. **Stash browser** — после `Stash & switch` нет просмотра stash  
5. **Object workflow** — намеренно Blender; GUI только merge preview  

---

## 5. Карта файлов GUI

| Слой | Путь |
|------|------|
| JSON обёртки | `sources/gui/frontend/src/wails/forester.ts` |
| Repo / init | `sources/gui/frontend/src/wails/bridge.ts` |
| Settings | `sources/gui/frontend/src/wails/settings.ts` |
| Project + commit | `ContentInfoPanel`, `CreateCommitDialog`, `ProjectPreviewPanel`, `FilePreviewGrid` |
| History + diff | `HistorySidebarPanel`, `HistoryPreviewPanel`, `CommitCardMenu` |
| File history | `FileHistoryView` |
| Merge | `MergeDialog`, merge banner в `HistorySidebarPanel` |
| Init | `InitRepositoryWizard`, `RepositoryAddProvider` |
