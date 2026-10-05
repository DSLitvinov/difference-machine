# Preview File Info — More Files

Мультивыбор: один квадрат 308 вместо четырёх type Image/Text/Blend/Binary.

Figma: [Item / Preview / File Info - More Files](https://www.figma.com/design/UdzVpYkngLCGzVXFWwq8TJ/Difference-MAchine?node-id=4402-10360) (`4402:10360`).  
Код: `FileInfoPreviewMulti`.

Размер **308×308** (рамка `radius-lg` 12 px, border `#e4e4e7` входят в экспорт).

---

## Файл, не коллаж

Канон — **один** экспорт node `4402:10360` (SVG): веер из трёх карточек + зелёный Grab снизу.

Код: `frontend/src/assets/{light,dark}/previews/more-files.svg` через `asset()`. Панель показывает SVG (`object-contain` / native 308). Зелёный круг 48×48 внизу по центру (центр 154, 243) — число выбранных файлов, Inter Semi Bold 16/24, белый. Цифра не запечена в SVG: `count` = длина selection файлов.

Не собирать слот из `@icons/256/File-TEXT` / `File-IMG`. Не сетка миниатюр выбранных path. Не добавлять подпись «3 files» рядом с кругом.

Панель: [select-more-files](../../panels/select-more-files.md).
