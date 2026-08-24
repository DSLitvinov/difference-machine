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
| Select More Files | `4383:9620` | [select-more-files.md](./select-more-files.md) |
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
| **Settings** | пути, автор, внешний вид | `setup.cfg` (не JSON API) |

Баннеров merge/detached на кадрах `View /` нет — полосы по [states](../states/architecture.md), когда API так говорит, не выдумывать chrome.

---

## Контекст left-колонки

В макете нет отдельного окна History. Меняется **контекст сайдбара** внутри того же shell.

| Контекст | Left | Когда |
|----------|------|--------|
| Проект | [project-view](./project-view.md) | обзор папки, стейджи, композер, View Commit |
| Файл | [file-view](./file-view.md) | File View и History of File |

Вкладки **History / Stages** — внутри Project view, не смена контекста.

---

## Project preview

- Источник списка: по умолчанию `workdir.entries` текущей папки.
- Switch **Changed**: все dirty файлы проекта, не текущая папка.
- Status нужен для бейджей и фильтра Changed.
- Тулбар: search / sort / filter из макета. Grid/list — нет в 0.8.1.
- Open / rename / delete — `workdir.open` / `rename` / `delete`.
- Stage выбранных: combobox + Apply на File Action / Select More Files → `index.add` (unstage — когда появится `index.drop`).
- Commit All Files: все dirty path → `index.add` → композер.

Compare extract и restore файла — из History of File ([header-file-commit-action](../components/items/header-file-commit-action.md)), не из сетки workdir.

---

## History preview

- Список файлов: `diff.name_status` с `to` = выбранный коммит — один раз на hash, в memory.
- Статистика карточки: `diff.stat` по hash, **лениво** (visible карточки), кэш memory. Не после каждого `log.get` на всю страницу.
- Текстовый diff: `diff.text` выбранного path. Бинарный — stub из макета.
- Картинка из ревизии: `blob.get` выбранного path, memory (не `.DFM/cache/thumbs/`).
- Канон: [revision-cache.md](../gui_frontend/revision-cache.md).
- Restore file / restore version / revert **файла** (`restore.file`) / reset — соответствующие методы; destructive — через [диалог](../dialogs/architecture.md).
- Compare файла: `compare.extract`.

---

## Content info

Показывает выбор из preview. Не второй навигатор.

- Файл workdir: `workdir.metadata`, locks, `log.get` с `path`.
- Коммит: `commit.get` (сообщение, автор, screenshot).
- Кнопка «открыть во внешнем редакторе»: `Edit in` в File Info — список из Settings / External editors → `workdir.open` + `editor`.

---

## Баннеры

`merge.status.in_progress` и `status.get.is_detached` — отдельные полосы по макету, не пункт в дереве файлов. Пока merge in progress, опасные switch/reset режутся UI (API всё равно вернёт ошибку — баннер должен опережать).
