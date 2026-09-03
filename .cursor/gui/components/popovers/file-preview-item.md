# Popover File Preview Item

Контекстное меню тайла файла в сетке/списке workdir.

Figma: [Popover (File Preview Item)](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4272-6726) (`4272:6726`).  
Код: `FilePreviewItemMenu`. 200 px, как Filters.

Открывается с тайла в сетке, из [Header File Action](../items/header-file-action.md), из [File Info](../../panels/file-info.md) More и из [Select More Files](../../panels/select-more-files.md) More.

Нет заголовков секций (`Commit`, `Action `).

---

## Сверху

| Иконка | Copy | API (панель) |
|--------|------|----------------|
| plus | `Create commit` | `index.add` этих path → открыть композер. Не путать с Append |

Separator.

## Дальше

| Иконка | Copy | API (панель) |
|--------|------|----------------|
| plus | `Append` | `index.add`. Композер не открывать |
| minus | `Undo append` | `index.drop`. Disabled, если path не в `staged_*` |
| eye-off / eye | `Ignored` / `Don't ignore` (`Не игнорировать`) | **один пункт**, как Lock / Unlock. Не ignored: eye-off + `Ignored` → `workdir.ignore` (дописать path в `.dfmignore`). Already ignored: eye + `Don't ignore` → `workdir.unignore` (убрать эту строку) |
| pencil-line | `Rename` | диалог rename → `workdir.rename` |
| external-link | `Open in folder` | `workdir.open` родителя |
| settings + chevron-right | `Edit in` | submenu внешних редакторов |
| lock | `Lock` | `lock.*` |

## После separator

`trash-2` + `Delete in project`, `#ef4444` → `workdir.delete` (корзина ОС).

`Delete in history` в этом popover **нет** — сценарий [file-in-commit](./file-in-commit.md) + `commit.delete_file`.

После `workdir.ignore`, если View ignored выкл.: path пропадает из сетки — снять его с selection; если это был открытый файл — назад в сетку папки.
