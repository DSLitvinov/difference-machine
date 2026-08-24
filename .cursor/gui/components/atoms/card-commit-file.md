# Commit File Card

Карточка коммита в истории **файла**. Визуально как [Commit Project](./card-commit-project.md), но в stats **нет** «N files changed» — только `+ 12` / `- 12`.

Figma: [Atom / Cards / Commit File](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4306-3082) (`4306:3082`).  
Код: `CommitFileCard`. Те же boolean: `head`, `merge`, `more`, `tag`.

Ширина 245 px. Данные: `log.get` с `path` + `diff.stat` по этому файлу, не по дереву. `diff.stat` — лениво, visible карточки ([revision-cache.md](../../gui_frontend/revision-cache.md)).

Не объединять с Project-карточкой через `if (scope === 'file')` ценой расхождения слотов. Два компонента или один cva `variant="project" | "file"` с **явным** различием stats.

---

## Отличие от Project

| | Project | File |
|--|---------|------|
| Stats | files changed + add + del | только add + del |
| Остальное | одинаково | одинаково |

---

## Запрещено

- Строка «1 file changed» на file-карточке, если её нет в макете.
