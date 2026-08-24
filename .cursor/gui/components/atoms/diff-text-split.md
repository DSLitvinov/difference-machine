# Diff Text Split (row)

Строка split-diff: **один** столбец номера + текст. Не путать с [unified](./diff-text-unified.md) (два номера).

Figma: [Atom / Diff / Text / Split](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4191-5926) (`4191:5926`).  
Код: `DiffTextSplitRow`. Property: `type`.

Панель кладёт две колонки viewer рядом: слева `deleted`/`default`, справа `added`/`default`. Атом не знает «левая/правая панель».

---

## Варианты (`type`)

Типографика: Inter Regular 16/24. Номер **40 px**, `border-r`, padding 16 px. Префикс 12 px + текст.

| `type` | Фон | Номер | Префикс | Цвет номера и border |
|--------|-----|-------|---------|----------------------|
| `added` | `rgba(5,150,105,0.1)` | число, `#047857` | `+` | `#047857` |
| `deleted` | `rgba(220,38,38,0.1)` | число, `#ef4444` | `-` | `#ef4444` |
| `default` | прозрачный | число, `#71717a` | пробел | `#e4e4e7` / `#71717a` |

Текст: `#09090b`.

---

## shadcn/ui

Как unified: не Table. Два разных компонента, не `layout="split"` на unified.

---

## Запрещено

- Второй столбец номера.
- Пустой номер у added/deleted (в Split номер всегда есть).
