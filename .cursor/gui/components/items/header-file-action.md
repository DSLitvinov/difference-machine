# Header File Action

Figma: [Item / Panel / Header / File Action](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4318-3832) (`4318:3832`).  
Код: `HeaderFileAction`. `Collapse` no (`4318:3833`, 673×60) / yes (`4318:3836`, 673×60).

Шапка открытого **файла workdir**. Не [header-file-commit-action](./header-file-commit-action.md).

---

## Слоты (слева направо)

| Слот | Вид | Действие |
|------|-----|----------|
| Back | outline 40×40, `chevron-left` | назад в сетку папки |
| Имя | `file_name.png` в кадре | basename текущего path, не редактируется здесь |
| Combobox | 200×40 | **выбор действия** над этим файлом |
| Apply | primary, в кадре слой `primary` | **применить** выбранное действие. Продуктовый copy: `Apply` (не `Save`) |
| Collapse | только `Collapse=yes`: `panel-right-open` | показать File Info (`infoCollapsed = false`) |

---

## Combobox → Apply

Combobox **не** выполняет операцию сам. Apply вызывает выбранное действие для **текущего** path.

Закрытый combobox в кадре показывает `Add in commit`. Открытый список **идентичен** [Popover (File Preview Item)](../popovers/file-preview-item.md) (`4272:6726`): те же секции, copy, иконки и disabled. Не урезать до одного пункта.

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

Default при открытии файла — `Add in commit`. Пустой выбор + Apply — no-op.

---

## Запрещено

- Подпись кнопки `Save`, если продукт — Apply.
- Третья текстовая кнопка рядом с Apply.
- Вызов API из атома: колбэки панели.
