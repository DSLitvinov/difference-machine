# Commit File Item

Строка файла в списке изменений коммита (rel path + letter-бейдж). Не путать с [list-file](../items/list-file.md) (иконка файла + basename + lock).

Figma: [Atom / Commit / File Item](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4191-5777) (`4191:5777`).  
Код: `CommitFileItem`. Property: `state`. Boolean Figma `status` — показывать ли letter-бейдж.

---

## Состав

1. [FileStatusBadge](../badge-file-status.md) слева, если `status`.
2. Rel path: `/folder/folder/file_name`, Inter Regular 16/24, `Foreground/default` `#09090b`, одна строка.

Ширина в наборе 373.5 px — hug колонки. Padding: горизонталь 16 px, вертикаль 8 px. Gap 8 px. Радиус 4 px.

Путь с `/`, без `\`. Truncate CSS, не JS.

---

## Варианты (`state`)

| `state` | Фон | Интерактив |
|---------|-----|------------|
| `Default` | нет | `div` |
| `Hover` | `Background/primary/light-hover` `#f4f4f5` | button |
| `Selected` | `Background/accent` `#f4f4f5` | button |

Hover и Selected в макете визуально оба `#f4f4f5`. Не красить selected в accent-blue сетки (`#eff6ff`) — это другой item.

Disabled в наборе нет.

---

## Данные

Панель: path из `diff.name_status`; `type` бейджа — из status letter (`A`/`M`/`D`/`R` → `appended`/`modified`/`delete`/`rename`). Нет lock на этом атоме (lock — list/grid).

---

## Запрещено

- Иконка файла.
- Basename вместо rel path, если макет показывает path.
- Второй бейдж lock.
