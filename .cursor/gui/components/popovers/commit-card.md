# Popover Commit Card

Figma: [Popover (Commit Card)](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4272-11288) (`4272:11288`).  
Код: `CommitCardMenu`. 227×208.

Открывается с [CommitProjectCard](../atoms/card-commit-project.md) / File (ellipsis). Stash ellipsis — `StashCardMenu` (Restore state / Delete), не этот popover. Пункты (checkout, revert, …) — из node; destructive — через [dialogs](../../dialogs/architecture.md), не `window.confirm`.
