# Header Right Side

Figma: [Item / Panel / Header / Right Side](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4309-9246) (`4309:9246`).  
Код: `HeaderRightSide`. 308×60 (в панели 332).

Шапка [Panel / File Info](../../panels/file-info.md) и [Select More Files](../../panels/select-more-files.md). Не дублировать Select Branch.

---

## Слот

Справа icon-button 40×40, `panel-right-close`, Variant Secondary.

Клик: свернуть правую колонку (`infoCollapsed = true`), center 1120. Парная кнопка открытия — `panel-right-open` в [header-folder-action](./header-folder-action.md) / [header-file-action](./header-file-action.md) при Collapse=yes.

Не закрывать репозиторий и не сбрасывать selection.
