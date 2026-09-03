# Workdir API

Сканирование рабочей копии для панелей Project / preview / Content Info.  
Реализация: `internal/jsonapi/handlers_workdir.go`, `workdir_scan.go`.  
Превью содержимого: [thumbnails.md](./thumbnails.md).

---

## Границы видимости

`workdir.tree`, `workdir.entries`, `workdir.search`, `workdir.metadata`, `workdir.thumbnail`, `workdir.file`, `workdir.rename`, `workdir.delete` **не показывают** и не принимают:

- `.DFM/` и всё внутри
- `.dfmignore` (сам файл)

Пути, попавшие в `.dfmignore`, скрыты в `workdir.entries` / `search` / `tree` **по умолчанию**. С `include_ignored: true` entries и search возвращают их с `ignored: true`. Metadata / thumbnail / open / rename / delete по такому path разрешены (чтобы View ignored мог открыть файл). `.DFM/` по-прежнему закрыт.

Исключение: **`workdir.open`** может открыть `.DFM/tmp_review` и файлы внутри (extract коммита). Другие workdir-методы по-прежнему скрывают `.DFM/` — в том числе `.DFM/cache/thumbs/` (диск-кэш эскизов, [thumbnails.md](./thumbnails.md)).

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
| `ignored` | bool | `true`, если path матчит `.dfmignore`; только при `include_ignored` |

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
| `include_ignored` | false; `true` — включить пути из `.dfmignore` с `ignored: true` |

Результат: `{entries, total, has_more}`.

Пагинация — backend-поведение. **Не** выводить в UI счётчики вроде «showing 2 of 3», если их нет в макете. Догрузка — следующий `offset`, без видимой подписи. Virtualizer и ленивые thumbs: [../gui_frontend/virtual-scroll.md](../gui_frontend/virtual-scroll.md).

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

## `workdir.file`

Полный кадр для [Content View Img](../components/items/content-view.md) на экране файла. Не эскиз: оригинальные байты (PNG/JPEG/SVG/…) или полный кадр через ffmpeg для EXR/TIFF. Лимит 64 MiB.

Не для сетки и не для File Info — там `workdir.thumbnail` (картинки, кадр видео, blend, текст).

---

## `workdir.search`

Поиск по имени/пути. `limit` по умолчанию 200, `capped: true` если обрезали. Пустой query не изобретать на frontend — либо не звать API, либо следовать спеке поля поиска. `include_ignored` — как у `workdir.entries`.

---

## Мутации FS

### `workdir.rename`

`new_name` — только имя (без разделителей, не `.` / `..`). Результат содержит `new_path`. После успеха обновить selection и status.

### `workdir.delete`

Перенос в корзину ОС (Trash / Recycle Bin), не безвозвратное удаление. GUI не вызывает `os.Remove`.

### `workdir.open`

- `path` — rel.
- `editor` пустой — приложение по умолчанию (`open` / `xdg-open` / Windows handler).
- `editor` задан — executable + абсолютный путь файла (`EvalSymlinks`). На macOS `.app` bundle открывается через `open -a`, не через `exec` (bundle — каталог).

Для tmp_review передавать rel вида `.DFM/tmp_review/…`.  
Compare with working tree открывает саму папку: `compare.extract` `{open: true}`, не этот метод.

### `workdir.ignore`

GUI: один пункт меню **Ignored** / **Don't ignore** (файл и папка). `paths` — rel файлов и/или папок. Дописывает строки в корневой `.dfmignore` (файл — `path`, папка — `path/`). Уже покрытые паттерном строки не дублирует. `.DFM/` и сам `.dfmignore` — ошибка.

После успеха GUI обновляет `workdir.entries` (с тем же `include_ignored`, что у View ignored). Если View ignored выкл., path пропадает из сетки — снять его с selection; открытый файл — вернуться в сетку папки.

### `workdir.unignore`

Тот же пункт меню, когда path уже ignored: copy **Don't ignore** / **Не игнорировать**. `paths` — как у `workdir.ignore`. Удаляет соответствующие строки из корневого `.dfmignore` (`path` и `path/`). Не трогает другие паттерны (например `*.tmp`). `.DFM/` и сам `.dfmignore` — ошибка.

### `workdir.dfmignore.get` / `workdir.dfmignore.set`

Settings → **Ignored files and folders**: весь файл, не точечный path. Get: `{content}` (нет файла → пустая строка). Set: `{content}` пишет корневой `.dfmignore` (переводы строк → `\n`). GUI: текстовое поле с номерами строк; Save disabled без сессии. После set обновить `workdir.entries`. `workdir.ignore` / `unignore` по-прежнему дописывают и снимают отдельные path.

---

## Связь со status

`status.get` даёт dirty-классификацию (staged / unstaged / untracked / renamed).  
`workdir.entries` даёт полный каталог папки.

Бейджи VCS на тайлах — пересечение path из entries со списками status (`appended` / `new` / `modified` / `delete` / `rename`). Бейдж **i** — поле `ignored` у entry, не status. Не вычислять хеши файлов на frontend.

Пропавшие файлы (`staged_deleted_files` / `unstaged_deleted_files`) **нет** в `workdir.entries` (их нет на диске). GUI подмешивает их в сетку текущей папки и в **Only changed** со стабом [File Missing](../components/items/grid-file.md). `entries_by_paths` по-прежнему пропускает not found.
