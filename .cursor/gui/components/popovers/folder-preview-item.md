# Popover Folder Preview Item

Контекстное меню тайла папки в сетке workdir.

Figma отдельного popover для папки нет: тот же chrome, что у [File Preview Item](./file-preview-item.md) (200 px).  
Код: `FolderPreviewItemMenu`. Открывается правым кликом по [Grid View Folder](../items/grid-folder.md).

Один пункт, два состояния (как Ignored / Don't ignore у файла):

| Состояние | Иконка | Copy | API |
|-----------|--------|------|-----|
| не ignored | eye-off | `Ignored` | `workdir.ignore` — дописать `path/` в корневой `.dfmignore` |
| ignored | eye | `Don't ignore` / `Не игнорировать` | `workdir.unignore` — убрать `path` / `path/` из `.dfmignore` |

Не копировать пункты файла (Append, Lock, Delete), которых нет на папке.

После `workdir.ignore`, если View ignored выкл.: папка пропадает из сетки — снять её path с selection.
