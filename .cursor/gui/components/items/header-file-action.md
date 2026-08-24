# Header File Action

Figma: [Item / Panel / Header / File Action](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4318-3832) (`4318:3832`).  
Код: `HeaderFileAction`. `Collapse` no (`4318:3833`, 673×60) / yes (`4318:3836`, 673×60).

Шапка открытого **файла workdir**. Не [header-file-commit-action](./header-file-commit-action.md).

---

## Слоты (слева направо)

| Слот | Вид | Действие |
|------|-----|----------|
| Back | outline 40×40, `chevron-left` | назад в сетку папки |
| Имя | `file_name.png` в кадре | basename текущего path, по центру оставшегося трека, не редактируется здесь |
| More | outline 40×40, `ellipsis` (горизонтальное `⋯`) | открывает контекстное меню файла |
| Collapse | только `Collapse=yes`: separator 20 + `panel-right-open` secondary 40×40 | показать File Info (`infoCollapsed = false`) |

Combobox 200×40 и кнопка **Apply** в этом хедере **нет**.

---

## Контекстное меню

Клик More сразу открывает [Popover (File Preview Item)](../popovers/file-preview-item.md) (`4272:6726`): те же секции, copy, иконки и disabled. Выбор пункта **выполняет** действие для **текущего** path — не откладывать на Apply.

| Выбор | API |
|-------|-----|
| Add in commit | `index.add` с этим path |
| Ignored | disabled, как в popover |
| Rename | диалог rename → `workdir.rename` |
| Delete in history | disabled, как в popover |
| Open in folder | `workdir.open` родителя |
| Edit in | submenu редакторов → `workdir.open` с `editor` |
| Lock | `lock.*` |
| Delete in project | диалог → `workdir.delete` (корзина ОС) |

Колбэки — у панели, не у атома.

---

## Запрещено

- Combobox + Apply в File Action.
- Подпись кнопки `Save` / третья текстовая кнопка рядом с More.
- Вертикальный ellipsis с карточек коммита — в этом слоте горизонтальный `⋯` из атома кнопки (`6034:11712`).
