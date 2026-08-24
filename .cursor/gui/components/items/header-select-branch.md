# Header Select Branch

Figma: [Item / Panel / Header / Select Branch](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4309-5686) (`4309:5686`).  
Код: `HeaderSelectBranch`.

309×64. Padding 12. Слот `.Sidebar Item` 285×40 — dropdown **веток**: border `#e4e4e7`, radius 4 (`rounded-sm`), **shadow-sm**, иконки 20×20 `square-terminal` + `chevrons-up-down`, copy ветки Inter Regular 16/24 `#3f3f46`. Данные: `branch.list`, текущая из `status.get`. Не ходить в API из хедера: колбэки панели.

---

## Меню

| Пункт | Поведение |
|-------|-----------|
| Список веток | `repo.switch` на выбранную; dirty без stash → [Dirty Branch Switch](../../dialogs/branches.md) |
| Merge | открыть [Dialog / Merge](../../dialogs/merge.md). Disabled, если кроме текущей нет других веток |
| Create | [Create Branch](../../dialogs/branches.md) → `branch.create` |
| Rename | [Rename Branch](../../dialogs/branches.md) → `branch.rename` |
| Delete | [Delete Branch](../../dialogs/branches.md) → `branch.delete` (не текущая) |

Точный copy пунктов Create / Rename / Delete — из `get_design_context` на этот node. Merge — тот же диалог, что Repository → Branches → Merge.

Иконки — экспорт Figma.
