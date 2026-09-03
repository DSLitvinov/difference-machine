# Панели

Панель — **постоянная** область главного окна. Не модалка и не toast.  
Правила диалогов: [../dialogs/architecture.md](../dialogs/architecture.md).  
Frontend shell: [../gui_frontend/architecture.md](../gui_frontend/architecture.md).  
Сборка колонок в окно: [../views/architecture.md](../views/architecture.md).  
Кирпичи колонок: каталог ниже.

---

## Кирпичи Figma (`Panel /`)

Холст [DFM 0.8.1 component](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4191-5772). Какие `View / Project view / …` в каком состоянии — [../views](../views/architecture.md), не эта таблица.

| Figma | Node | Спека |
|-------|------|-------|
| Project view | `4246:5052` | [project-view.md](./project-view.md) |
| File view | `4309:7530` | [file-view.md](./file-view.md) |
| File Info | `4309:9390` | [file-info.md](./file-info.md) |
| File Info - single file create commit | `6075:13103` | [file-info.md](./file-info.md) |
| Select More Files | `4383:9620` | [select-more-files.md](./select-more-files.md) |
| File Info - more file create commit | `6075:13789` | [select-more-files.md](./select-more-files.md) |
| Content View (folder/file/history) | `4318:3286` и варианты | [content-view.md](./content-view.md) |

Empty-варианты перечислены в спеке канонической панели.

---

## Правила построения

1. Панель читает данные из Zustand-среза и JSON API, не из DOM соседней панели.
2. Одна панель — одна зона ответственности (навигация **или** превью **или** info).
3. Пустые и error-состояния — только те, что в макете панели.
4. Заголовок секции — копирайт из Figma. Не добавлять статусные строки под заголовок («3 files», «synced»).
5. Панель не знает про `Handle` и envelope: сервис/store уже отдал доменную модель.
6. Обновление после мутации — через общее VCS-состояние (`status.get`, `merge.status`), не через callback «перерисуй меня» из диалога напрямую в обход store.

---

## Каркас окна

Порядок и видимость колонок — только [views](../views/architecture.md). Ниже — какие данные обязательны, когда панель есть в макете.

| Панель | Роль | Основные методы |
|--------|------|-----------------|
| **Shell** | Header Window, toaster, First Start | cfg, смена repo |
| **Project view** | ветка, uncommitted, History/Stages | `branch.list`, `status.get`, `log.get` |
| **File view** | история выбранного path | `log.get` + `path` |
| **Content View** | сетка папки / превью файла / diff | `workdir.entries`, `diff.*`, `blob.get`; сетка — [virtual-scroll](../gui_frontend/virtual-scroll.md) |
| **File Info / Select More Files** | метаданные выбора | `workdir.metadata`, `lock.list` |
| **Merge banner** | Merge идёт / конфликты | `merge.status` |
| **Detached banner** | Detached HEAD | `status.get.is_detached` |
| **Settings** | пути, автор, язык | `setup.cfg` (не JSON API). Без темы |

Баннеров merge/detached на кадрах `View /` нет — оверлей поверх окна (как toaster Error), с кнопкой закрыть, по [states](../states/architecture.md#ошибки-и-уведомления). Не выталкивать колонки. Toast Error — тот же стек, не колонка.

---

## Контекст left-колонки

В макете нет отдельного окна History. Меняется **контекст сайдбара** внутри того же shell.

| Контекст | Left | Когда |
|----------|------|--------|
| Проект | [project-view](./project-view.md) | обзор папки, стейджи, композер, View Commit |
| Файл | [file-view](./file-view.md) | File View и History of File |

Вкладки **History / Stash** (Figma Stages) — внутри Project view. Пустой Stash — [Stashes Null](../views/project-browse.md), не смена на сетку рабочей папки.

---

## Project preview

- Источник списка: по умолчанию `workdir.entries` текущей папки.
- Фильтр **Only changed**: все dirty файлы проекта, не текущая папка.
- Фильтр **View ignored**: `include_ignored` на `workdir.entries` / `search`; бейдж **i** на файлах и папках.
- Status нужен для VCS-бейджей и фильтра Only changed. Бейдж **i** — `entry.ignored`, не status.
- Плотность сетки: default иконка/превью **48×48**, колонка min **106 px**. Масштаб — `gridTrack` (Ctrl/Cmd+wheel), без chrome. Не растягивать квадрат на `1fr`. Канон: [content-view](./content-view.md), [architecture.md](../architecture.md#сетка-рабочей-копии).
- Тулбар: search / sort / filter из макета. Grid/list — нет в 0.8.1.
- Клик по папке — selection; двойной клик — зайти (`folderPath`). Open файла — `workdir.open` / rename / delete.
- Append выбранных: меню File Action / More → `index.add`. Композер не открывать.
- **Create commit** в том же popover: `index.add` path меню → композер. На Select More Files то же для всех выбранных.
- Unstage: тот же popover, пункт **Undo append** → `index.drop`. Disabled вне `staged_*`.
- Ignored: один пункт в popover файла и [Folder Preview Item](../components/popovers/folder-preview-item.md). Не ignored → `workdir.ignore`; already ignored — copy **Don't ignore** / **Не игнорировать** → `workdir.unignore`.
- Commit All Files: все dirty path → `index.add` → композер.

Compare extract и restore файла — из шапки diff в History of File и View Commit ([commit-diff-text](../components/items/commit-diff-text.md) / [commit-diff-image](../components/items/commit-diff-image.md) / [commit-diff-binary](../components/items/commit-diff-binary.md)), не из сетки workdir.

---

## History preview

- Список файлов: `diff.name_status` с `to` = выбранный коммит — один раз на hash, в memory.
- Статистика карточки: `diff.stat` по hash, **лениво** (visible карточки), кэш memory. Не после каждого `log.get` на всю страницу.
- Текстовый diff: `diff.text` выбранного path. Бинарный — stub из макета.
- Картинка из ревизии: `blob.get` выбранного path, memory (не `.DFM/cache/thumbs/`).
- Канон: [revision-cache.md](../gui_frontend/revision-cache.md).
- Restore file / restore version / revert **файла** (`restore.file`) / reset / **Delete in history** (`commit.delete_file`) — соответствующие методы; destructive — через [диалог](../dialogs/architecture.md).
- Compare / Revert выбранного path: шапка [commit-diff-*](../components/items/commit-diff-text.md) (View Commit и History of File). `compare.extract` без `open`, затем `workdir.open` tmp_review; `restore.file`.

---

## Content info

Показывает выбор из preview. Не второй навигатор.

- Файл workdir: `workdir.metadata`, locks, `log.get` с `path`.
- Коммит: `commit.get` (сообщение, автор, screenshot).
- Кнопка «открыть во внешнем редакторе»: **Edit** в File Info — список из Settings / External editors → `workdir.open` + `editor`. More — [Popover (File Preview Item)](../components/popovers/file-preview-item.md). Мультивыбор: **Create commit** + тот же More. Пока открыт композер **selection** — футер заменяется [CreateCommitCard](../components/atoms/card-create-commit.md). Композер **all files** живёт слева, правая колонка — File Info Null.

---

## Баннеры

`merge.status.in_progress` и `status.get.is_detached` — отдельные полосы по макету, не пункт в дереве файлов. Пока merge in progress, опасные switch/reset режутся UI (API всё равно вернёт ошибку — баннер должен опережать).
