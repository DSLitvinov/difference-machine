# Popover File Preview Item

Контекстное меню тайла файла в сетке/списке workdir.

Figma: [Popover (File Preview Item)](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4272-6726) (`4272:6726`).  
Код: `FilePreviewItemMenu`. 200 px, как Filters.

Открывается с тайла в сетке, из [Header File Action](../items/header-file-action.md), из [File Info](../../panels/file-info.md) More и из [Select More Files](../../panels/select-more-files.md) More.

---

## Секция `Commit`

| Иконка | Copy | API (панель) |
|--------|------|----------------|
| plus | `Add in commit` | `index.add` |
| eye-off | `Ignored` | ignore-правило, если есть в продукте; не выдумывать `.gitignore` UI |
| pencil-line | `Rename` | диалог rename → `workdir.rename` |
| trash-2 | `Delete in history` | не `workdir.delete`; история — отдельный сценарий |

## Секция `Action` (заголовок с пробелом `Action `)

| Иконка | Copy | |
|--------|------|--|
| external-link | `Open in folder` | `workdir.open` родителя |
| settings + chevron-right | `Edit in` | submenu внешних редакторов |
| lock | `Lock` | `lock.*` |

## После separator

`trash-2` + `Delete in project`, `#ef4444` → `workdir.delete` (корзина ОС).

Не путать два Delete. Не красить `Delete in history` в red — в макете обычный accent `#18181b`.
