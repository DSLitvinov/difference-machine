# List View Folder

Строка папки в list-view.

Figma: [Item / List View / Folder](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4334-15300) (`4334:15300`).  
Код: `FolderListRow`. Properties: `state`, `lock`, `status`.

Как [list-file](./list-file.md): 373.5 ширина, padding 16×8, hover/selected `#f4f4f5`, radius 4.

Отличия:

- Иконка **24×24** `Atom / Icons / 24 / Folder` (`4334:15294`), корпус `#a8a29e`, SVG union.
- Имя `folder` (не «Folder name»).
- Letter + lock **есть** (в отличие от grid-folder).

Счётчик «5 Files» в list-строке **нет**.

---

## Запрещено

- Иконка 48 px из grid.
- Подпись «5 Files» в этом item.
