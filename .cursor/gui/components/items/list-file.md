# List View File

Строка файла в list-view. Не путать с [commit-file-item](../atoms/commit-file-item.md) (path, без иконки file) и [grid-file](./grid-file.md).

Figma: [Item / List View / File](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4334-15450) (`4334:15450`).  
Код: `FileListRow`. Properties: `state`, boolean `lock`, `status`.

Ширина в наборе 373.5 px. Высота ряда ~40. Padding 16×8. Gap 8. Радиус 4.

---

## Слоты слева направо

1. Иконка **20×20** `file` (экспорт).
2. Basename `File.txt`, Inter Regular 16/24 `#09090b`, flex-1, nowrap.
3. Letter [FileStatusBadge](../badge-file-status.md) если `status`.
4. Lock badge если `lock`.

---

## State

| `state` | Фон |
|---------|-----|
| Default | нет |
| Hover | `Background/primary/light-hover` `#f4f4f5` |
| Selected | `Background/accent` `#f4f4f5` |

**Не** `#eff6ff` / blue border — это сетка.

---

## Запрещено

- Rel path вместо basename.
- Превью 48 px в list.
