# Panel / Select More Files

Figma: [Panel / Select More Files](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4383-9620) (`4383:9620`).  
Код: `SelectMoreFilesPanel`. 332×720.

Info при мультивыборе. Превью 308×308 — файл иллюстрации [preview-file-info-more](../components/items/preview-file-info-more.md), не коллаж type-иконок и не список имён «file1, file2» под заголовком.

---

## Слоты

1. [Header Right Side](../components/items/header-right-side.md) — свернуть info.
2. Превью 308×308.
3. Metadata: `Sum Sizes`, `Type` (как в node: `PNG, BLEND`).
4. Футер: ряд `gap-1` (4px), как у [File Info](./file-info.md):
   - Primary **Create commit** (~264px, слой `Create commit Button`, `#18181b`).
   - Outline More 40×40 (`ellipsis`) — открывает [Popover (File Preview Item)](../components/popovers/file-preview-item.md) (`4272:6726`) для **всех** path в selection.

Create commit: `index.add` выбранных path, затем открыть composer (как Commit All, но только selection).

More: те же действия, что у файла. Rename disabled при `paths.length > 1`. Ignored / Delete in history — disabled, как в popover.

Combobox + Apply в этом футере **нет**.
