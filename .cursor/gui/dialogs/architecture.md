# Диалоги

Диалог — модальный сценарий с явным OK/Cancel (или эквивалентом из макета).  
Панели: [../panels/architecture.md](../panels/architecture.md).  
Методы: [../gui_backend/jsonapi.md](../gui_backend/jsonapi.md).

---

## Кирпичи Figma (`Dialog /`)

Холст [DFM 0.8.1 component](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4191-5772). `Components / Dialog / …` — поля внутри, не отдельные экраны.

| Figma | Node | Спека |
|-------|------|-------|
| Settings | `4040:5134` | [settings.md](./settings.md) |
| Merge | `4158:7621` | [merge.md](./merge.md) |
| Switch / Dirty / Rename / Create / Delete Branch | см. таблицу | [branches.md](./branches.md) |

---

## Правила построения

1. Один диалог — одна операция Forester (или короткий wizard из 2–3 шагов, если так в макете).
2. Пока запрос идёт — блокировать повторный submit, контролы disabled по макету.
3. Успех: закрыть диалог, обновить store (`status.get`, списки веток/коммитов).
4. Ошибка API: остаться открытым, показать текст; не закрывать «наполовину».
5. Destructive (delete branch, restore --hard, restore.version, merge abort) — отдельное подтверждение из макета, не `window.confirm`.
6. Не дублировать в диалоге данные, которые уже видны в панели, если макет этого не делает.
7. Валидация имени ветки / пустого commit message — до `Call`.

---

## Каталог (по JSON API)

Диалог существует в продукте, если есть в Figma. Ниже — **обязательная привязка к API**, когда такой диалог рисуют.

| Диалог | Зачем | Метод |
|--------|--------|--------|
| Init repository | Создать `.DFM/` в выбранной папке | `repo.init`; путь — OS folder picker |
| Create commit | Сообщение, автор, опционально tag / amend | `index.add` при необходимости → `commit.create` |
| Create branch | Имя, база = HEAD или выбранный коммит | `branch.create` |
| Rename branch | Новое имя | `branch.rename` |
| Delete branch | Не текущая ветка | `branch.delete` |
| Switch dirty | Грязный worktree | повтор `repo.switch` с `auto_stash: true` |
| Merge | Выбор ветки, ff-опции, конфликты | `merge.start` / `continue` / `abort`; объекты — `object.*` |
| Restore version | Перезаписать workdir деревом коммита | `restore.version` |
| Restore files | Вернуть path из коммита | `restore.file` |
| Revert / Reset | История | `commit.revert`, `commit.reset` + `mode` |
| Rename file | Только basename | `workdir.rename` |
| Delete file | Корзина ОС | `workdir.delete` |
| Settings | Автор, пути, тема | `setup.cfg`, не Forester |
| Remove repo from list | Убрать path из cfg | не удаляет `.DFM/` с диска |

Нет JSON-метода — нет пункта в меню «сделать как в git CLI».

---

## Init

1. Пользователь выбирает абсолютный путь (пустая папка или проект без `.DFM/`).
2. `CallStateless` / сессия на этот путь → `repo.init`.
3. Запись `[current repo]` и `[repo] path_N`.
4. `Open` сессии, `status.get`, вход в Project.

Автор из `[user]` передавать в `author`, если поле есть в мастере.

---

## Commit

- Кнопка недоступна, если index пуст **и** нет сценария «add then commit» в макете.
- Если макет коммитит выбранные/все изменения: сначала `index.add` с path (или `["."]`), затем `commit.create`.
- `amend` только когда это действие есть в UI и HEAD не пустой.

---

## Switch и dirty

`repo.switch` без `auto_stash` на dirty дереве завершается ошибкой.  
Диалог dirty-switch — единственное место, где GUI ставит `auto_stash: true`. Не включать auto-stash молча.

---

## Merge

1. `merge.status` до открытия: если `in_progress` — диалог продолжения, не второй `start`.
2. `merge.start` с именем **другой** ветки.
3. Если `in_progress` + `has_conflicts` — список `conflicts` (`kind` text/binary).
4. Пользователь правит файлы (внешний редактор через `workdir.open`) → `index.add` → `merge.continue`.
5. `merge.abort` сбрасывает MERGE_HEAD.

Теги объектов DELETE/RENAME/MERGE пишутся в manifest через `object.tag.*` на выбранном коммите/файле; это не замена `merge.start`.

---

## Settings

Поля путей — абсолютные native path.  
`[api] path` — библиотека, не CLI ([setup-cfg-api-path](../../rules/setup-cfg-api-path.mdc)).
