# Header Select Branch

Figma: [Item / Panel / Header / Select Branch](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4309-5686) (`4309:5686`).  
Код: `HeaderSelectBranch`.

309×64. Padding 12. Слот `.Sidebar Item` 285×40 — dropdown **веток**: border `#e4e4e7`, radius 4 (`rounded-sm`), **shadow-sm**, иконки 20×20 `square-terminal` + `chevrons-up-down`, copy ветки Inter Regular 16/24 `#3f3f46`. Данные: `branch.list`, текущая из `status.get`. Не ходить в API из хедера: колбэки панели.

---

## Dropdown выбора веток

Figma: [Popover (Branch)](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=6050-12558) (`6050:12558`). Ширина 217. **Только** список веток и пункт-триггер подменю.

| Пункт | Поведение |
|-------|-----------|
| Список веток | `repo.switch` на выбранную; dirty без stash → [Dirty Branch Switch](../../dialogs/branches.md) |
| Manage branches `>` | открыть подменю управления. Не действие само по себе |

Copy: **Manage branches**. Chevron-right 16×16.

---

## Подменю управления ветками

Figma: [Popover (Manage branches)](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=6050-12559) (`6050:12559`). Ширина 200. Не дублировать эти пункты в корне dropdown.

| Пункт | Поведение |
|-------|-----------|
| Create new | [Create Branch](../../dialogs/branches.md) → `branch.create` |
| Merge branches | открыть [Dialog / Merge](../../dialogs/merge.md). Disabled, если кроме текущей нет других веток. Тот же диалог, что меню **Branches** |
| Rename | [Rename Branch](../../dialogs/branches.md) → `branch.rename` |
| Delete branch | [Delete Branch](../../dialogs/branches.md) → select, затем confirm; текущую удалить нельзя. Disabled, если кроме текущей нет других веток |

После Rename — separator. **Delete branch** — destructive: текст и иконка `trash-2` 16×16 `#ef4444`.

Иконки chrome — lucide через `Icon`.
