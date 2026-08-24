# Folder Action (toolbar)

Тулбар поиска/сортировки/фильтра папки. Живёт в [header-folder-action](./header-folder-action.md).

Figma: [Item / Folder Action](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4234-9656) (`4234:9656`).  
Код: `FolderActionBar`. Properties: `Property 2` = `Default` \| `Search`; boolean `sort`, `filters`.

Кнопки **40×40**, bg `#fafafa`, radius 8, иконка 16×16 (search / `arrow-up-a-z` / `filter` — экспорт). Gap кнопок 4 px.

---

## Default

Три icon-button: Search, Sort, Filter. Search переключает в `Search`.

## Search

shadcn `Input`: ширина 300, min-height 36, radius 6, border `#e4e4e7`, shadow-sm, иконка search 20 + placeholder `Search ` (с пробелом в макете). Справа Sort + Filter.

Sort открывает [popovers/sort](../popovers/sort.md). Filter — [popovers/filters](../popovers/filters.md).

Поиск: `workdir.search`. **В корне** (`folderPath` пустой) — по всем папкам. **Во вложенной папке** — только path с префиксом текущей папки (результаты search обрезать на frontend, у метода нет `path`). Пустой query — не звать API, вернуть обычную сетку.

Кнопок grid/list в 0.8.1 **нет** (будут позже). Не добавлять переключатель вида.

---

## Запрещено

- Подпись «showing N of M».
- Четвёртая кнопка без макета.
- Поиск «как git grep по содержимому», если query — имя/путь.
