# Popover Filters

Figma: [Popover (Filters)](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4272-6728) (`4272:6728`).  
Код: `FiltersMenu`. База: shadcn `DropdownMenu` + `DropdownMenuCheckboxItem`. Ширина **200 px**, radius 8, border `#e4e4e7`, shadow-md, py 4.

---

## Пункты

Заголовок секции: `Filter by type`, Inter Semi Bold 14/20 `#09090b`, не кликабелен как фильтр.

Список расширений — **файлы текущей папки** (`workdir.entries` / результаты search в этой папке), не фиксированный набор из макета. Copy: `.ext` в нижнем регистре (как в Figma `.jpeg`, не `JPEG`). Иконка 16: image / text / blend / binary по типу файла. Несколько пунктов можно включить сразу; выбранные — галочка shadcn `ItemIndicator`.

Separator. Затем destructive: `trash-2` + `Clean filters`, цвет `#ef4444` — снимает все галочки.

Не добавлять «All files». Не звать API: фильтр UI панели.

Фильтр — UI панели `workdir.entries`, не API.
