# Dialog / ветки

Кирпичи модалок веток. База: shadcn Dialog. Ширина ~451.

| Figma | Node | Код | Property | API |
|-------|------|-----|----------|-----|
| Switch Branch | `4158:7553` | `SwitchBranchDialog` | — | `repo.switch` |
| Dirty Branch Switch | `4040:8358` | `DirtyBranchSwitchDialog` | component 200×48 | повтор switch `auto_stash: true` |
| Rename Branch | `4158:7824` | `RenameBranchDialog` | `old name` / `new name` | `branch.rename` |
| Create new Branch | `4158:7889` | `CreateBranchDialog` | `null name` / `fill name` | `branch.create` |
| Delete Branch | `6050:12668` / `4158:8037` | `DeleteBranchDialog` | `step` | `branch.delete` |

`Components / Dialog / Rename|Create|Delete Branch` — примитивы полей, собираются в Dialog / …, не экспортировать отдельно в `ui/`.

Валидация пустого имени — до `Call`. Destructive delete — copy из макета, не `window.confirm`.

Ошибка `branch.*` / `repo.switch` после confirm → **toast**, диалог открыт. Исключение: отказ switch на dirty без `auto_stash` открывает этот Switch (stash and switch), не toast. Каталог: [architecture](./architecture.md#ошибки).

## Delete Branch

Два шага. `branch.delete` только на шаге 2.

| step | Node | |
|------|------|--|
| select | [`6050:12668`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=6050-12668) | «Select to delete the branch?». Список. Cancel / **Next** |
| confirm | [`4158:8037`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4158-8037) | «Do you really want to delete the branch?». Имя ветки + предупреждение. Cancel / **Delete branch** |

Список (`branch.list`) — только select. Строки как [Commit File Item](../components/atoms/commit-file-item.md) без бейджа: Inter Regular 16/24, padding 16×8, radius 4.

| Строка | Вид | Поведение |
|--------|-----|-----------|
| Текущая (`is_current`) | `{name} (current)`, `Foreground/muted` | не выбирается, удалить нельзя |
| Другая | `Foreground/default` | клик выбирает; selected — фон `#f4f4f5` |

**Next** disabled, пока не выбрана чужая ветка. Confirm показывает выбранное имя (14/20 Medium), не список. Выбор — в диалоге, не в подменю хедера.
