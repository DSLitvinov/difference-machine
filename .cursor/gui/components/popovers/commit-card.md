# Popover Commit Card

Figma: [Popover (Commit Card)](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4272-11288) (`4272:11288`).  
Код: `CommitCardMenu`. 227×208.

Открывается с [CommitProjectCard](../atoms/card-commit-project.md) / File (ellipsis). Stash ellipsis — `StashCardMenu` (Restore state / Delete), не этот popover. Пункты (checkout, revert, …) — из node; destructive — через [dialogs](../../dialogs/architecture.md), не `window.confirm`.

| Пункт | Действие |
|-------|----------|
| Compare with working tree | `compare.extract` с `open: true`: выгрузка коммита в `.DFM/tmp_review`, затем открыть **эту папку** в файловом менеджере ОС (Finder / Explorer). Не `editor_path` |
| Restore this version | confirm → `restore.version` |
| Revert commit | confirm → `commit.revert` |
| Reset branch to commit | confirm → `commit.reset` `mode: mixed`. **Без** chevron `>` — submenu нет |
| Copy hash / Copy message | clipboard |

Compare файла в истории — другой поток: extract без `open`, затем `workdir.open` конкретного `.DFM/tmp_review/…`.
