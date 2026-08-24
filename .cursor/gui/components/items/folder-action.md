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

Нет кнопки «grid/list» в этом item — вид сетки в другом хедере, если он есть в Folder Action header.

---

## Запрещено

- Подпись «showing N of M».
- Четвёртая кнопка без макета.
