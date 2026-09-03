# Commit Diff Text

Блок текстового diff.

Figma: [Item / Commit / Diff / Text Diff](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4290-22243) (`4290:22243`).  
Код: `TextDiffViewer`. Property: `Tab`.

| Tab | Строки |
|-----|--------|
| `1) Unified` | стек [DiffTextUnifiedRow](../atoms/diff-text-unified.md) |
| `2) Split` | две колонки [DiffTextSplitRow](../atoms/diff-text-split.md) |
| `4) No commits` | нет родителя: табы Unified / Split **disabled**; **Action (Compare / Revert) остаётся**. Тело — стек Split `default` (один номер, без `+`/`-`), не выдумывать copy «файлы идентичны» |

---

## Шапка

Табы справа, padding 8. Справа от табов — Action, gap 12 (и на `4)`).

| Слот | Вид | Когда |
|------|-----|-------|
| Tabs | Unified / Split | всегда; на `4)` disabled |
| Compare | outline, copy `Compare`, h=40 | всегда, включая `4)` |
| Revert | primary, copy `Revert`, h=40 | всегда, включая `4)` |

Action — те же `compare.extract` / `restore.file`, что у [header-file-commit-action](./header-file-commit-action.md). Destructive confirm из макета. Панель передаёт колбэки, item API не зовёт.

Ширина ~759. Не рисовать minimap, не нумеровать hunks, если нет в макете.

Данные: разобранный `diff.text`. Item не парсит unified сам, если парсер уже в lib панели.
