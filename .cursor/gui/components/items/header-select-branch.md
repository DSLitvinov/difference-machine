# Header Select Branch

Figma: [Item / Panel / Header / Select Branch](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4309-5686) (`4309:5686`).  
Код: `HeaderSelectBranch`.

309×64. Padding 12. Слот `.Sidebar Item` 285×40 — dropdown **веток**. Данные: `branch.list`, текущая из `status.get`. Не ходить в API из хедера: колбэки панели.

---

## Меню

| Пункт | Поведение |
|-------|-----------|
| Список веток | `repo.switch` на выбранную; dirty без stash → [Dirty Branch Switch](../../dialogs/branches.md) |
| Create | [Create Branch](../../dialogs/branches.md) → `branch.create` |
| Rename | [Rename Branch](../../dialogs/branches.md) → `branch.rename` |
| Delete | [Delete Branch](../../dialogs/branches.md) → `branch.delete` (не текущая) |

Точный copy пунктов — из `get_design_context` на этот node. Не добавлять merge/rebase в это меню.

Иконки — экспорт Figma.
