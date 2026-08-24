# Popover Filters

Figma: [Popover (Filters)](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4272-6728) (`4272:6728`).  
Код: `FiltersMenu`. База: shadcn `DropdownMenu`. Ширина **200 px**, radius 8, border `#e4e4e7`, shadow-md, py 4.

---

## Пункты

Заголовок секции: `Filter by type`, Inter Semi Bold 14/20 `#09090b`, не кликабелен как фильтр.

| Иконка 16 | Copy |
|-----------|------|
| `file-image` | `.jpeg` |
| `file-text` | `.txt` |
| `file-digit` | `.blend` |

Текст пунктов: Regular 14/20 `#18181b`. Separator. Затем destructive: `trash-2` + `Clean filters`, цвет `#ef4444`.

Не добавлять `.png`, «All files», чекбоксы, если их нет в этом popover. Расширения — как в макете (`.jpeg` не `JPEG`).

Фильтр — UI панели `workdir.entries`, не API.
