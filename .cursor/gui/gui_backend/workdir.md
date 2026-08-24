# Workdir API

Сканирование рабочей копии для панелей Project / preview / Content Info.  
Реализация: `internal/jsonapi/handlers_workdir.go`, `workdir_scan.go`.  
Превью содержимого: [thumbnails.md](./thumbnails.md).

---

## Границы видимости

`workdir.tree`, `workdir.entries`, `workdir.search`, `workdir.metadata`, `workdir.thumbnail`, `workdir.rename`, `workdir.delete` **не показывают** и не принимают:

- `.DFM/` и всё внутри
- `.dfmignore`
- пути, попавшие в `.dfmignore`

Исключение: **`workdir.open`** может открыть `.DFM/tmp_review` и файлы внутри (extract коммита). Другие workdir-методы по-прежнему скрывают `.DFM/`.

Path traversal (`..`) и выход за корень репо — ошибка.

---

## Запись `dirEntry`

Элементы `workdir.entries` / `search` / `entries_by_paths`:

| Поле | Тип | |
|------|-----|--|
| `name` | string | Имя |
| `path` | string | Относительный путь `/` |
| `is_dir` | bool | |
| `item_count` | int | Для папки — число файлов рекурсивно |
| `size` | int64 | Для файла |
| `modified` | int64 | Unix, файлы |
| `created` | int64 | Unix, если ОС отдаёт |

Сортировка entries: сначала папки, затем файлы, по имени без учёта регистра.

---

## `workdir.tree`

Дерево папок для sidebar.

- `path` — корень поддерева (пусто = корень репо).
- `depth` — глубина; `<= 0` → `1`.

Не подменять дерево собственной рекурсией по FS в GUI.

---

## `workdir.entries`

Страница содержимого папки (сетка превью).

| Args | Default |
|------|---------|
| `path` | папка; `"*"` — плоский список **всех файлов** репо |
| `offset` | 0 |
| `limit` | 200 |

Результат: `{entries, total, has_more}`.

Пагинация — backend-поведение. **Не** выводить в UI счётчики вроде «showing 2 of 3», если их нет в макете. Догрузка — следующий `offset`, без видимой подписи.

`entries_by_paths` — точечный refresh известных путей (после rename/status), без полного list.

---

## `workdir.metadata`

Для Content Info: `path` обязателен.

| Поле | |
|------|--|
| `path` | канонический rel |
| `size`, `modified`, `created?` | |
| `mime` | грубый guess по расширению |
| `is_dir` | |
| `width`, `height` | если файл — изображение и размеры читаются |

---

## `workdir.search`

Поиск по имени/пути. `limit` по умолчанию 200, `capped: true` если обрезали. Пустой query не изобретать на frontend — либо не звать API, либо следовать спеке поля поиска.

---

## Мутации FS

### `workdir.rename`

`new_name` — только имя (без разделителей, не `.` / `..`). Результат содержит `new_path`. После успеха обновить selection и status.

### `workdir.delete`

Перенос в корзину ОС (Trash / Recycle Bin), не безвозвратное удаление. GUI не вызывает `os.Remove`.

### `workdir.open`

- `path` — rel.
- `editor` пустой — приложение по умолчанию (`open` / `xdg-open` / Windows handler).
- `editor` задан — executable + абсолютный путь файла (`EvalSymlinks`).

Для tmp_review передавать rel вида `.DFM/tmp_review/…`.

---

## Связь со status

`status.get` даёт dirty-классификацию (staged / unstaged / untracked / renamed).  
`workdir.entries` даёт полный каталог папки.

Бейджи VCS на тайлах — пересечение path из entries со списками status. Не вычислять хеши файлов на frontend.
