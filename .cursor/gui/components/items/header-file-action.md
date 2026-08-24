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

Минимум (смысл, copy — из combobox в Figma при вёрстке):

| Смысл | API |
|-------|-----|
| Добавить в index | `index.add` с этим path |
| Убрать из index | метода `index.drop` в JSON API **нет** — пункт не выдумывать и не слать `index.add` «наоборот», пока нет метода |

Прочие пункты (lock, ignore, delete…) — только если они есть в этом combobox, не копировать всё [file-preview-item](../popovers/file-preview-item.md) без макета.

Пустой выбор + Apply — no-op (валидация до API).

---

## Запрещено

- Подпись кнопки `Save`, если продукт — Apply.
- Третья текстовая кнопка рядом с Apply.
- Вызов API из атома: колбэки панели.
