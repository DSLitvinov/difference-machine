# Состояния GUI

Источник истины по репозиторию — Forester (`status.get`, `merge.status`, `branch.list`).  
Frontend хранит **снимок** этих ответов плюс UI-state (selection, contentContext, open dialog).

Обзор: [../architecture.md](../architecture.md).  
Какой кадр `View /` собрать: [../views/architecture.md](../views/architecture.md).

---

## Режимы репозитория

Вычислять в одном месте (селектор store), панели только читают.

| Состояние | Как узнать | UI |
|-----------|------------|-----|
| **No repo** | Нет `[current repo]` / список пуст | [First Start](../views/first-start.md); не вызывать workdir API |
| **Not a repository** | `Call` → `not a Forester repository` | First Start или toast + Open; не app shell с сеткой |
| **Ready / clean** | `status.get` без staged/unstaged/untracked/renamed | обзор папки / файл / коммит по UI-измерениям |
| **Dirty** | Любой из списков status непустой | бейджи на сетке; композер Create Commit; ограничения switch |
| **Detached HEAD** | `is_detached: true` | баннер поверх текущего View, кнопка закрыть; switch на ветку возвращает attached |
| **Merge in progress** | `merge.status.in_progress` | баннер поверх View + диалог merge; закрытие баннера не abort; отдельного `View / Merge` нет |
| **Merge conflicts** | `has_conflicts` | список conflicts в диалоге; continue заблокирован пока не разрешено |

`.DFM/` отсутствует и path выбран — это **Not a repository**, не ошибка сети.

---

## Состояния загрузки

| Что | Пока ждём | После ошибки |
|-----|-----------|--------------|
| Первая загрузка репо | Skeleton/empty панели по макету | Toast + остаться на empty |
| `log.get` / `workdir.entries` | Не чистить предыдущий список без нужды; догрузка тихая | Список остаётся, ошибка в toast |
| `diff.stat` карточки | Слот Stats пустой (без «…»); title/date из `log.get` уже видны | Карточка без stats, toast |
| `diff.text` / `blob.get` | Превью path по макету (пустой кадр / stub); не спиннер на весь commit inspect | Toast; список path остаётся |
| Thumbnail тайла | Пустой квадрат `FilePreview` (атом без spinner); грузить только viewport + overscan | `placeholder` в кэше, без ретрая того же ключа |
| Мутация (commit, switch) | Submit disabled | Диалог открыт |

Не показывать глобальный полноэкранный spinner, если его нет в Figma. Эскизы: [virtual-scroll.md](../gui_frontend/virtual-scroll.md). Ревизии: [revision-cache.md](../gui_frontend/revision-cache.md).

---

## Режимы окна (UI-state)

Не путать с VCS. Имя `View /` **не** класть в store: его вычисляет селектор из этих полей. Каталог: [../views/architecture.md](../views/architecture.md).

| State | Значения | Persist |
|-------|----------|---------|
| shell | first-start \| app | нет |
| folderPath | rel string (`""` = корень) | на сессию |
| selectedCommit | hash или null | на сессию |
| selection | none \| paths[] | на сессию |
| contentContext | folder \| file \| file-revision \| commit | на сессию |
| fileKind | image \| text \| binary | на сессию, от выбранного path |
| infoCollapsed | bool | local, если в макете |
| changedOnly | bool (фильтр Only changed) | нет |
| sidebarTab | history \| stages | на сессию |
| commitComposer | closed \| open | нет |
| gridTrack | 106…360 px; default **106** → превью **48×48** | сессия процесса (не cfg). List-view **нет** в 0.8.1 |
| Open dialog | id или null | нет |

Нет измерения «режим окна Project vs History». Вкладки History/Stash — `sidebarTab` внутри Project view. Контекст файла — `contentContext`, left становится File view.

`gridTrack` не входит в селектор `View /`: плотность сетки не меняет кадр, только `nCols` и `previewSize`. Канон: [architecture.md](../architecture.md#сетка-рабочей-копии).

Смена repo сбрасывает folder/selection/commit/composer. `gridTrack` сессии может сохраняться. Рестарт приложения возвращает default 106 / 48. Тема Light/Dark из `[ui] theme` (`html.dark`).

### Производный экран (кратко)

| Условие | Семейство View |
|---------|----------------|
| `shell = first-start` | [First Start](../views/first-start.md) |
| папка пустая, нет коммитов, вкладка History | Empty DFM Project |
| файлы есть, нет истории репо в сайдбаре | Empty DFM Folder |
| корень, selection none | Root Folder (± Collapse) |
| вложенный path | SubFolder |
| один файл в сетке | File Info |
| несколько файлов в сетке | File More Info |
| `sidebarTab = stages`, есть stash | Stash (сетка папки) |
| `sidebarTab = stages`, `stash.list` пуст | [Stashes Null](../views/project-browse.md): Folder Empty + File Info Null, не сетка workdir |
| `commitComposer = open`, один файл | [Create Commit single file](../views/project-browse.md) `6036:14491`: справа File Info |
| `commitComposer = open`, иначе | Create Commit: справа Select More Files |
| `contentContext = file` | [file-preview](../views/file-preview.md) |
| `contentContext = file-revision` | [file-history](../views/file-history.md) |
| `contentContext = commit` | [commit](../views/commit.md) |

Полные слоты колонок — в спеках семейств, не дублировать здесь.

---

## Выбор и фокус

- Пустой selection: info — File Info Null / empty из макета ([not-select-file](../components/placeholders/not-select-file.md)), не произвольный «выберите файл».
- Многофайловый selection: только [Select More Files](../panels/select-more-files.md) ([File More Info](../views/project-browse.md)).
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
