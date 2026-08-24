# Panel / Select More Files

Figma: [Panel / Select More Files](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4383-9620) (`4383:9620`).  
Код: `SelectMoreFilesPanel`. 332×720.

Info при мультивыборе. Превью 308×308 — файл иллюстрации [preview-file-info-more](../components/items/preview-file-info-more.md), не коллаж type-иконок и не список имён «file1, file2» под заголовком.

---

## Слоты

1. [Header Right Side](../components/items/header-right-side.md) — свернуть info.
2. Превью 308×308.
3. Metadata: `Sum Sizes`, `Type` (как в node: `PNG, BLEND`).
4. Футер 308×80 (`6010:11435`):
   - Combobox 308×40 — **то же семейство действий**, что [Header File Action](../components/items/header-file-action.md) (добавить в index, убрать из index, …).
   - Кнопка 308×36 (слой `Create commit Button`) — **Apply**: выполнить выбранное действие для **всех** path в selection.

Apply не создаёт коммит. Copy кнопки — из node при вёрстке; смысл = Apply, как у файла.

Unstage по-прежнему ждёт `index.drop` в API.
