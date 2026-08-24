# Panel / Content View

Центральная колонка превью (788×720). **Не** `View / Project view / File View - …`.

Figma-канон: [Folder - Expanded](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4318-3286) (`4318:3286`).

Код: `ContentViewPanel`.

---

## Слоты (Folder Expanded)

1. [Header Folder Action](../components/items/header-folder-action.md) 772×60, offset x=8.
2. Content 772×648: сетка gap 8 px между тайлами 106, padding 16.

Порядок: сначала [FolderGridTile](../components/items/grid-folder.md), затем [FileGridTile](../components/items/grid-file.md) рядами. Данные: `workdir.entries` текущей папки.

---

## Варианты (отдельные symbols)

| Figma | Node | Отличие |
|-------|------|---------|
| Folder - Expanded | `4318:3286` | сетка |
| Folder - Collapse | `4318:3476` | Collapse=yes у хедера |
| Folder - Empty | `4382:8708` | [folder-null](../components/placeholders/folder-null.md) |
| File - Expanded | `4318:3980` | [Header File Action](../components/items/header-file-action.md) + [content-view](../components/items/content-view.md) |
| File - Collapse | `4318:4013` | |
| History of File | `4318:4176`, `4322:4561` | история + diff items |

List-view тайлы — если хедер переключает вид; не смешивать grid и list в одном кадре без макета.
