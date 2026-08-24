# Dialog / Merge

Figma: [Dialog / Merge](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4158-7621) (`4158:7621`).  
Код: `MergeDialog`. Property: `step`.

| step | Node | |
|------|------|--|
| select branch | `4039:1093` | 796×232 |
| view objects | `4158:7622` | 796×374 |

Заготовки: `Components / Dialog / Merge` (`4039:1041`) — внутренние states `View Objects` / `Select Branch`, не отдельный продукт.

На view objects: [ObjectStatusBadge](../components/badge-object-status.md). Методы: `merge.start` / `continue` / `abort`, `object.*`. Один merge за раз (`merge.status.in_progress`).
