# Grid View Folder

Тайл папки в сетке. Не путать с [grid-file](./grid-file.md) и [list-folder](./list-folder.md).

Figma: [Item / Grid View / Folder](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4191-6599) (`4191:6599`).  
Код: `FolderGridTile`. Property: `state` (Default \| Hover \| Selected).

В наборе Figma ширина **106 px**. В Content View тайл заполняет трек отзывчивой сетки (`minmax(106px, 1fr)`, [content-view](../../panels/content-view.md)): `width: 100%`, `min-width: 0`. По умолчанию иконка **48×48** `Atom / Icons / 48 / Folder` (`4234:9143`), по центру: корпус `#a8a29e`, union-глиф — экспорт SVG, не Lucide `Folder`. Ctrl/Cmd+wheel растит иконку вместе с превью файла; не растягивать её на всю ширину трека при default.

---

## Слоты

| Слот | Стиль |
|------|--------|
| Имя | `Folder name`, 12/16 `#09090b`, center, ellipsis |
| Счёт | `5 Files`, 12/16 `#71717a`, center. Формат и plural — как в макете (`5 Files`), не «5 files» / «5» |
| Ignored | [FileStatusBadge](../badge-file-status.md) `type=ignored` (**i**), если `entry.ignored`. Слева внизу иконки папки, как letter на [grid-file](./grid-file.md). Нет — не рендерить |

Gap иконка↔тексты: 2 px. Padding: Default `space-100` 4 px; Hover/Selected горизонталь `spacing-xs` 4 px.

Клик — selection (`state=Selected`), как у [grid-file](./grid-file.md). Двойной клик — зайти в папку: `folderPath` = path тайла, selection сброс. Не `workdir.open` (это «Open in folder» у файла).

Правый клик открывает [Popover Folder Preview Item](../popovers/folder-preview-item.md). Папка не вызывает `workdir.thumbnail` — иконка SVG из атома.

---

## State

Как у file grid: Hover `#eff6ff` radius 8; Selected + border `#60a5fa`. Default без фона.

---

## Запрещено

- Бейдж A/M/N/D/R на папке в сетке — только `ignored`.
- Size Min/Max — у папки один размер.
