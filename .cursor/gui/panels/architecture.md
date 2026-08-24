# Панели

Панель — **постоянная** область главного окна. Не модалка и не toast.  
Правила диалогов: [../dialogs/architecture.md](../dialogs/architecture.md).  
Frontend shell: [../gui_frontend/architecture.md](../gui_frontend/architecture.md).  
Кирпичи колонок (без `View /`): каталог ниже.

---

## Кирпичи Figma (`Panel /`)

Холст [DFM 0.8.1 component](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4191-5772). Не специфицировать здесь `View / Project view / …`.

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

Логические панели, выводимые из API Forester и типичного VCS-клиента. Имена в коде — по макету.

| Панель | Роль | Основные методы |
|--------|------|-----------------|
| **Shell** | Окно, rail режимов, toaster | cfg, смена repo |
| **Repo / branch** | Текущий репозиторий и ветка | `branch.list`, `repo.switch` |
| **Project sidebar** | Дерево папок workdir | `workdir.tree` |
| **Project preview** | Сетка/список файлов текущей папки | `workdir.entries`, `workdir.thumbnail`, `status.get` |
| **History sidebar** | Список коммитов выбранной ветки | `log.get`, `diff.stat` |
| **History preview** | Файлы ревизии, diff, blob | `diff.name_status`, `diff.text`, `blob.get` |
| **Content info** | Метаданные выбора, история файла | `workdir.metadata`, `log.get` + `path`, `lock.list` |
| **Merge banner** | Merge идёт / конфликты | `merge.status` |
| **Detached banner** | Detached HEAD | `status.get.is_detached` |
| **Settings** | Пути, автор, внешний вид | `setup.cfg` (не JSON API) |

Наличие, порядок и chrome — **только Figma**. Таблица задаёт, какие данные обязательны, когда панель есть в макете.

---

## Режимы Project и History

Один sidebar + один preview, содержимое зависит от режима.

| Режим | Sidebar | Preview | Info |
|-------|---------|---------|------|
| Project | дерево workdir | entries текущей папки, dirty-бейджи | файл/папка workdir |
| History | карточки коммитов | изменение файлов коммита | коммит / файл в ревизии |

Переключение режима не закрывает репозиторий и не должно сбрасывать ветку. Selection path можно шарить, если макет это делает.

---

## Project preview

- Источник списка: `workdir.entries`, не `status.get`.
- Status нужен для бейджей и фильтра «только изменённые», если фильтр есть в тулбаре макета.
- Тулбар (вид сетки/списка, фильтр расширений, scale) — из макета; значения вида не уходят в Forester.
- Open / rename / delete — `workdir.open` / `rename` / `delete`.
- Stage: `index.add` по выбранным path.

Compare extract и restore — действия над коммитом, обычно из History, не из сетки workdir.

---

## History preview

- Список файлов: `diff.name_status` с `to` = выбранный коммит.
- Статистика карточки: `diff.stat` (кэшировать по hash).
- Текстовый diff: `diff.text`. Бинарный — stub из макета.
- Картинка из ревизии: `blob.get`.
- Restore file / restore version / revert / reset — соответствующие методы; destructive — через [диалог](../dialogs/architecture.md).

---

## Content info

Показывает выбор из preview. Не второй навигатор.

- Файл workdir: `workdir.metadata`, locks, `log.get` с `path`.
- Коммит: `commit.get` (сообщение, автор, screenshot).
- Кнопка «открыть во внешнем редакторе»: `workdir.open`.

---

## Баннеры

`merge.status.in_progress` и `status.get.is_detached` — отдельные полосы по макету, не пункт в дереве файлов. Пока merge in progress, опасные switch/reset режутся UI (API всё равно вернёт ошибку — баннер должен опережать).
