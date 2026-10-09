# Commit File Card

Карточка коммита в истории **файла**. Визуально как [Commit Project](./card-commit-project.md), но в stats **нет** «N files changed» — только `+` добавленные файлы / `-` удалённые файлы этого снимка.

Figma: [Atom / Cards / Commit File](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4306-3082) (`4306:3082`).  
Код: `CommitFileCard`. Те же boolean: `head`, `merge`, `more`, `tag`.

Ширина 245 px. Данные: `log.get` с `path`. `+` / `−` — `diff.stat` всего снимка (`added` / `deleted`), лениво для visible карточек ([revision-cache.md](../../gui_frontend/revision-cache.md)).

Не объединять с Project-карточкой через `if (scope === 'file')` ценой расхождения слотов. Два компонента или один cva `variant="project" | "file"` с **явным** различием stats.

---

## Отличие от Project

| | Project | File |
|--|---------|------|
| Stats | files changed + added files + deleted files | только added files + deleted files |
| Остальное | одинаково | одинаково |

---

## Запрещено

- Строка «N files changed» на file-карточке. Атом `4306:3082` её не содержит. Инстансы [Panel / File view](../../panels/file-view.md) `4309:7530` сейчас подставляют Commit Project в Swapper — не брать stats со скрина панели.
