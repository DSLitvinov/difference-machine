# Состояния GUI

Источник истины по репозиторию — Forester (`status.get`, `merge.status`, `branch.list`).  
Frontend хранит **снимок** этих ответов плюс UI-state (selection, mode, open dialog).

Обзор: [../architecture.md](../architecture.md).

---

## Режимы репозитория

Вычислять в одном месте (селектор store), панели только читают.

| Состояние | Как узнать | UI |
|-----------|------------|-----|
| **No repo** | Нет `[current repo]` / список пуст | Селектор / empty из макета, не вызывать workdir API |
| **Not a repository** | `Call` → `not a Forester repository` | Предложить init |
| **Ready / clean** | `status.get` без staged/unstaged/untracked/renamed | Обычный Project |
| **Dirty** | Любой из списков status непустой | Бейджи, ограничения switch без диалога |
| **Detached HEAD** | `is_detached: true` | Баннер; switch на ветку возвращает attached |
| **Merge in progress** | `merge.status.in_progress` | Баннер + диалог merge; не стартовать второй merge |
| **Merge conflicts** | `has_conflicts` | Список conflicts, continue заблокирован пока не разрешено (по макету) |

`.DFM/` отсутствует и path выбран — это **Not a repository**, не ошибка сети.

---

## Состояния загрузки

| Что | Пока ждём | После ошибки |
|-----|-----------|--------------|
| Первая загрузка репо | Skeleton/empty панели по макету | Toast + остаться на empty |
| `log.get` / `workdir.entries` | Не чистить предыдущий список без нужды; догрузка тихая | Список остаётся, ошибка в toast |
| Thumbnail тайла | Место превью в состоянии loading | `placeholder` |
| Мутация (commit, switch) | Submit disabled | Диалог открыт |

Не показывать глобальный полноэкранный spinner, если его нет в Figma.

---

## Режимы окна (UI-state)

Не путать с VCS:

| State | Значения | Persist |
|-------|----------|---------|
| Sidebar mode | Project \| History | да, если в спеке |
| Current folder path | rel string | на сессию |
| File / commit selection | paths, commit hash | на сессию |
| Preview layout | grid \| list, scale, filters | local, если в макете |
| Open dialog | id или null | нет |
| Theme | light \| dark \| system | cfg/local |

Смена repo сбрасывает folder/selection/commit. Тема и layout могут сохраняться.

---

## Выбор и фокус

- Пустой selection: info показывает состояние empty из макета (не «выберите файл» если такой копирайт не нарисован).
- Многофайловый selection: info/multi-preview только если есть в макете; иначе действия тулбара над множеством без смены info.
- После `workdir.rename` selection переезжает на `new_path`.
- После `workdir.delete` path исчезает из selection.

---

## Согласованность панелей

Один снимок `status` на всё окно. Запрещено:

- Sidebar считает dirty по своему запросу, preview — по другому, старше чем N секунд без причины.
- History показывает ветку A, branch selector — B.

После любого успешного `repo.switch`, `commit.*`, `merge.*`, `index.add`, `restore.*` — обязательный refresh `status.get` и инвалидация зависимых запросов (tree, log, entries).

Watcher workdir: тот же путь, с дебаунсом; не плодить параллельные `status.get`.

---

## Блокировки кнопок (производные)

| Действие | Недоступно когда |
|----------|------------------|
| Commit | нет изменений для add/index (по макету) или пустое сообщение |
| Switch без диалога | dirty и нет auto_stash |
| Delete branch | `is_current` |
| Merge start | merge already in progress; target = current |
| Restore version | нет выбранного коммита |
| Workdir API | no repo / not initialized |

Дублировать блокировку в UI даже если API вернёт ошибку — меньше мигания toast.
