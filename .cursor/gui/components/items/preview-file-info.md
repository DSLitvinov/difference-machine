# Preview File Info

Крупный квадрат файла в info-панели: [FilePreview](../atoms/file-preview.md) L-класса + бейджи + иконка типа.

Figma: [Item / Preview / File Info](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4191-6615) (`4191:6615`).  
Код: `FileInfoPreview`. Property: `type` (Image \| Text \| Blend \| Binary).

Размер **308×308**, radius **12 px**, border `#e4e4e7`.

---

## `type`

| `type` | Заливка превью | Иконка центра 20×20 |
|--------|----------------|---------------------|
| Image | bitmap cover | `image` (пейзаж) |
| Blend | bitmap cover (тот же слот, что image) | `image` |
| Text | white + точечный паттерн (как empty preview) | `file-text` |
| Binary | white | `binary` (01/10) |

Иконки — экспорт Figma, по центру (left/top 144 на 308).

---

## Бейджи

Как сетка Max+Lock: letter слева снизу, lock справа снизу (top 276, letter ~left 12, lock left 276). Оба — FileStatusBadge. Нет статуса — не рисовать letter.

---

## Запрещено

- Подпись имени файла на этом квадрате (имя — в панели рядом).
- Четвёртый `type` «folder».
- ObjectStatusBadge MERGE на этом item.
