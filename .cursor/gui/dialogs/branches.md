# Dialog / ветки

Кирпичи модалок веток. База: shadcn Dialog. Ширина ~451.

| Figma | Node | Код | Property | API |
|-------|------|-----|----------|-----|
| Switch Branch | `4158:7553` | `SwitchBranchDialog` | — | `repo.switch` |
| Dirty Branch Switch | `4040:8358` | `DirtyBranchSwitchDialog` | component 200×48 | повтор switch `auto_stash: true` |
| Rename Branch | `4158:7824` | `RenameBranchDialog` | `old name` / `new name` | `branch.rename` |
| Create new Branch | `4158:7889` | `CreateBranchDialog` | `null name` / `fill name` | `branch.create` |
| Delete Branch | `4158:8037` | `DeleteBranchDialog` | — | `branch.delete` |

`Components / Dialog / Rename|Create|Delete Branch` — примитивы полей, собираются в Dialog / …, не экспортировать отдельно в `ui/`.

Валидация пустого имени — до `Call`. Destructive delete — copy из макета, не `window.confirm`.
