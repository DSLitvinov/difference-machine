# Commit Diff Text

Блок текстового diff.

Figma: [Item / Commit / Diff / Text Diff](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4290-22243) (`4290:22243`).  
Код: `TextDiffViewer`. Property: `Tab`.

| Tab | Строки |
|-----|--------|
| `1) Unified` | стек [DiffTextUnifiedRow](../atoms/diff-text-unified.md) |
| `2) Split` | две колонки [DiffTextSplitRow](../atoms/diff-text-split.md) |
| `4) No commits` | нет родителя: табы Unified / Split **disabled**; тело — стек Split `default` (один номер, без `+`/`-`), не выдумывать copy «файлы идентичны» |

Ширина ~759. Не рисовать minimap, не нумеровать hunks, если нет в макете.

Данные: разобранный `diff.text`. Item не парсит unified сам, если парсер уже в lib панели.
