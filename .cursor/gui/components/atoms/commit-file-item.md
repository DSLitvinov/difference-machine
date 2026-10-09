# Commit File Item

Строка файла в списке изменений коммита (rel path + letter-бейдж). Не путать с [list-file](../items/list-file.md) (иконка файла + basename + lock).

Figma: [Atom / Commit / File Item](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4191-5777) (`4191:5777`).  
Код: `CommitFileItem`. Property: `state`. Boolean Figma `status` — показывать ли letter-бейдж.

---

## Состав

1. [FileStatusBadge](../badge-file-status.md) слева, если `status` — **icon only** (20×20, `p-1`, иконка 12).
2. Rel path: `/folder/folder/file_name`, Medium 14/20, `#18181b`, одна строка.

Высота 36 px, ширина — hug колонки (342). Padding: горизонталь 10 px, вертикаль 8 px. Gap 8 px. Радиус 10 px. Gap между строками в [Content / File list](../items/content-file-list.md) 2 px.

Путь с `/`, без `\`. Truncate CSS, не JS.

---

## Варианты (`state`)

| `state` | Фон | Интерактив |
|---------|-----|------------|
| `Default` | нет | `div` |
| `Hover` | `Background/primary/light-hover` `#f4f4f5` | button |
| `Selected` | `interactive/layer-secondary-hovered` `#e4e4e7` | button |

Не красить selected в accent-blue сетки (`#eff6ff`) — это другой item.

Disabled в наборе нет.

---

## Данные

Панель: path из `diff.name_status`; `type` бейджа — из status letter (`A`/`M`/`D`/`R` → `appended`/`modified`/`delete`/`rename`). Нет lock на этом атоме (lock — list/grid).

---

## Запрещено

- Иконка файла.
- `chevron-right` справа от path.
- Basename вместо rel path, если макет показывает path.
- Второй бейдж lock.
