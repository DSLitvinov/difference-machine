# Multi-repo — `setup.cfg`

Управление списком репозиториев и **последним открытым** репо.

**Пути (macOS / Windows):** [paths.md](./paths.md) — канон abs/relative, канонизация, примеры INI.  
**Поведение multi-repo** — этот документ; [architecture.md](./architecture.md) и [sidebar-project-view.md](./sidebar-project-view.md) ссылаются сюда.

**Файл:** `~/.dfm/setup.cfg` ([paths.md §2](./paths.md) — на Windows `%USERPROFILE%\.dfm\setup.cfg`).

---

## 1. Секции конфига

### 1.1 `[current repo]` — последний выбранный репозиторий

Читается **при запуске** приложения; по `path` открывается репо без диалога.

| Key | Значение |
|-----|----------|
| `path` | Абсолютный путь к корню Forester-репозитория ([paths.md §3](./paths.md)) |

### 1.2 `[repo]` — список добавленных репозиториев

Все репозитории, которые пользователь **добавил** в GUI (кнопка **+** / Add repository).

| Key | Формат |
|-----|--------|
| `path_N` | `N` = целое ≥ 1; значение = абсолютный путь (нативный ОС) |

**Порядок в UI:** сортировка по числовому суффиксу `N` (`path_1`, `path_2`, …).

**Новый ключ:** при добавлении — `max(N) + 1` (если секция пуста → `path_1`).

---

## 2. Примеры `setup.cfg`

Полные правила путей: [paths.md §9](./paths.md).

### 2.1 macOS

```ini
[current repo]
path = /Users/me/projects/scene-a

[repo]
path_1 = /Users/me/projects/scene-a
path_2 = /Users/me/projects/scene-b

[forester]
path = /opt/DiffMachine/bin/forester

[user]
name = Artist
```

### 2.2 Windows

```ini
[current repo]
path = C:\Users\me\projects\scene-a

[repo]
path_1 = C:\Users\me\projects\scene-a
path_2 = "C:\Users\me\My Projects\scene-b"

[forester]
path = C:\DiffMachine\bin\forester.exe

[user]
name = Artist
```

Секции `[forester]`, `[user]`, … **не трогает** логика multi-repo — только читает/пишет `[current repo]` и `[repo]`.

---

## 3. UI (Repo selector)

Компонент: `RepoSelector` в [sidebar-project-view.md §2.2](./sidebar-project-view.md).

```
┌─────────────────────────────────────┐
│ [📁] scene-a                   [▼]  │  ← trigger: basename(current path)
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ ✓ scene-a                           │  ← path_1
│   scene-b                           │  ← path_2
│ ─────────────────────────────────   │
│ + Add repository…                   │
└─────────────────────────────────────┘
```

| Действие | Поведение |
|----------|-----------|
| **Запуск приложения** | Прочитать `[current repo] path` → `CanonicalAbsPath` → `OpenRepo` если валидный |
| **Клик по репо в списке** | `OpenRepo(path)`; записать канонический `path` в `[current repo]` |
| **+ Add repository…** | Native folder picker → `CanonicalAbsPath` → валидация Forester repo → append `path_N` в `[repo]` (dedupe `SamePath`) → `[current repo]` → `OpenRepo` |
| **Trigger label** | `basename(repoPath)` |
| **Tooltip** | полный **нативный** abs path ([paths.md §8](./paths.md)) |

Дубликат пути в `[repo]`: **не добавлять** второй ключ (`SamePath`); переключиться на существующий и обновить `[current repo]`.

---

## 4. Правила записи

| Событие | Запись в `setup.cfg` |
|---------|----------------------|
| Успешное открытие / переключение репо | `[current repo] path = <canonical abs>` |
| Add repository (новый путь) | новый `path_N` в `[repo]` + `[current repo]` |
| Add repository (уже в списке) | только `[current repo]` |

- Канонизация и кавычки: [paths.md §3](./paths.md).
- Запись **атомарная** (temp file + rename) — не ломать существующие секции.
- При отсутствии файла — создать `~/.dfm/` и минимальный `setup.cfg` с нужными секциями.

---

## 5. Wails API (новые методы)

| Метод | Назначение |
|-------|------------|
| `GetKnownRepos()` | `[]string` — пути из `[repo]`, порядок по `path_N`, каждый после `CanonicalAbsPath` |
| `GetCurrentRepoPath()` | `string` из `[current repo] path` или `""` |
| `SetCurrentRepoPath(path)` | Канонизировать → обновить `[current repo]` |
| `AddKnownRepo(path)` | Dedupe `SamePath` → append `path_N` + `SetCurrentRepoPath` |
| `OpenRepo(path)` | `CanonicalAbsPath` → валидация `.DFM` / `GetStatus` → app state + `[current repo]` |

`OpenRepo` вызывается из startup, dropdown и Add repository.

---

## 6. Corner cases

| Ситуация | Поведение |
|----------|-----------|
| Нет `setup.cfg` | Empty state «Open repository»; после Add — создать файл |
| `[current repo] path` пустой / отсутствует | Empty state; dropdown показывает только **+ Add repository** |
| `path` не существует на диске | Empty state + toast «Repository not found»; **не** перезаписывать cfg |
| Путь не Forester repo | Toast `not a Forester repository`; не добавлять в `[repo]` |
| `path` в `[current repo]`, но нет в `[repo]` | **Открыть** при старте; dedupe при Add |
| Два `path_N` с `SamePath` после нормализации | v1.1: merge; v1: первый wins в UI |
| Все `path_N` битые | Empty state; список в dropdown с warning (v1.1) |
| Переименование папки на диске | Старый путь невалиден до Re-open / Add; v2: «Locate repository…» |
| Concurrent edit cfg (CLI + GUI) | v1.1: re-read-merge; v1: last-write-wins |
| Только `[repo]`, нет `[current repo]` | Старт: empty state; выбрать из dropdown |
| UNC / пробелы / mixed slashes | [paths.md §11](./paths.md) |
| Удаление репо из списка | **v2** — не в v1 |

---

## 7. Связь с localStorage

Per-repo UI prefs (`dfm.sidebar.showChangedOnly`, `selectedFolderPath`, …) — **localStorage**, ключ = канонический `repoPath` ([paths.md §10](./paths.md)).

Список репо и last-opened — только **`setup.cfg`**.

---

## 8. Решения (закрытые)

| # | Тема | Решение |
|---|------|---------|
| 1 | Хранилище списка | `setup.cfg` `[repo]` |
| 2 | Last opened | `[current repo] path` |
| 3 | Старт | Авто-open из `[current repo]` |
| 4 | Добавление | **+** → folder picker → `path_N` |
| 5 | Переключение | Dropdown по `[repo]` |
| 6 | Ключи | `path_1`, `path_2`, … sequential |
| 7 | Формат путей | [paths.md](./paths.md) |
