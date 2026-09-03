# Diff Text Unified (row)

Строка unified-diff. Не путать с [diff-text-split](./diff-text-split.md) (одна колонка номера) и с [commit-diff-text](../items/commit-diff-text.md) (весь viewer).

Figma: [Atom / Diff / Text / Unified](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4191-5901) (`4191:5901`).  
Код: `DiffTextUnifiedRow`. Property: `type`.

Атом **не** парсит unified diff. Панель отдаёт уже разобранную строку (`oldNo`, `newNo`, `text`).

---

## Варианты (`type`)

Типографика всех колонок: Inter Regular 16/24 (`text-base/regular`). Высота строки 24 px. Ширина номера **40 px**, padding горизонталь `Padding/padding-sm` 16 px. Префикс `+`/`-`/пробел — слот 12 px, затем текст. Разделители — `border-r`.

| `type` | Фон | Номер old | Номер new | Префикс | Цвет номеров и border |
|--------|-----|-----------|-----------|---------|------------------------|
| `added` | `Background/success/light` `rgba(5,150,105,0.1)` | пусто | число | `+` | `Foreground/success/default` `#047857`, border `#047857` |
| `deleted` | `Background/destructive/light` `rgba(220,38,38,0.1)` | число | пусто | `-` | `Foreground/destructive/default` `#ef4444`, border `#ef4444` |
| `default` | прозрачный | число | число | пробел | `Foreground/muted` `#71717a`, border `Border/default` `#e4e4e7` |

Текст строки: `Foreground/default` `#09090b`.

Нет `type` для hunk-header / context-meta. Не рисовать `@@` своим стилем, пока нет варианта в наборе.

---

## Состояния взаимодействия

Hover / selected у строки в наборe нет. Не подсвечивать строку по курсору.

---

## shadcn/ui

Не `Table`. Flex-ряд. Не подменять success/destructive токенами shadcn, если hex не совпадает.

---

## Запрещено

- Одна колонка номеров (это Split).
- Инвертировать +/- цвета.
- Word-wrap: в макете `whitespace-nowrap`; перенос — решение item-viewer, не атома.
