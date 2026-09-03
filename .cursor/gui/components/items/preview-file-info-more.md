# Preview File Info — More Files

Мультивыбор: один квадрат 308 вместо четырёх type Image/Text/Blend/Binary.

Figma: [Item / Preview / File Info - More Files](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4402-10360) (`4402:10360`).  
Код: `FileInfoPreviewMulti`.

Размер **308×308** (рамка `radius-lg` 12 px, border `#e4e4e7` входят в экспорт).

---

## Файл, не коллаж

Канон — **один** экспорт node `4402:10360` (SVG): веер из трёх карточек + зелёный Grab снизу.

Код: `frontend/src/assets/{light,dark}/previews/more-files.svg` через `asset()`. Панель показывает SVG (`object-contain` / native 308).

Не собирать слот из `@icons/256/File-TEXT` / `File-IMG`. Не сетка миниатюр выбранных path. Не добавлять «3 files» на квадрат.

Панель: [select-more-files](../../panels/select-more-files.md).
