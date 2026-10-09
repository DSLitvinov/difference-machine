# Dialog / Append files и Create snapshot

Коммит — два модальных диалога, не карточка в колонке. Кадры `View /` Create snapshot (`4385:10858`, `6036:14491`, `6076:15959`) и атом `CreateCommitCard` сняты. Не возвращать форму в File Info, Select More Files или Card Directory.

Figma: Dialog Append [`8053:13385`](https://www.figma.com/design/UdzVpYkngLCGzVXFWwq8TJ/Difference-MAchine?node-id=8053-13385), Dialog Create snapshot [`8046:15314`](https://www.figma.com/design/UdzVpYkngLCGzVXFWwq8TJ/Difference-MAchine?node-id=8046-15314).  
Код: `AppendFilesDialog`, `CreateCommitDialog`.

---

## Кто открывает

| Действие | Диалог | Состав |
|----------|--------|--------|
| **Take snapshot** на Worked directory | сначала Append files, затем Create snapshot | все dirty path |
| **Take snapshot** на карточке открытого файла | сначала Append files, затем Create snapshot | только этот файл |
| **Create snapshot** в меню файла или ⋯ мультивыбора | сначала Append files, затем Create snapshot | только выбранные файлы |
| Пункт **Append** | не диалог | `index.add` |
| **Undo Append** | не диалог | `index.drop` |

Take snapshot скрыт, когда нет изменённых файлов (включая Stashes Null). Кнопки Create stash нет: строка на кадре `6035:12553` — ошибка макета. Пустой stash в центре — `No files yet` без подзаголовка-действия.

Пока идёт `index.add` перед Create snapshot, карточка Worked directory в состоянии Load (`Please wait`, кнопка disabled).

---

## Append files

Две колонки. **All** переключает только свою колонку. **Append** disabled, если не отмечен ни один путь. **Cancel** ничего не стейджит и не открывает Create snapshot. Успех закрывает Append и открывает Create snapshot на отмеченных путях. Ошибка — toast, диалог остаётся.

| Колонка | Строки | Чекбокс |
|---------|--------|---------|
| Append | выбранные пути, которых нет среди игнорируемых | включены по умолчанию |
| Ignored | все игнорируемые файлы репозитория | включён, если путь входит в этот коммит (был в выборе Create snapshot) |

Список Ignored: `workdir.entries` `{path:"*", include_ignored:true}` — только файлы с `ignored`, включая файлы внутри игнорируемых папок. Страницы, пока `has_more`. Снятие галочки **не** вызывает `workdir.ignore`. Включённый игнорируемый путь: `workdir.unignore`, затем общий `index.add`.

---

## Create snapshot

Поля: имя (`Name_snapshot...`) — сообщение; описание — тело; Tag — тег Forester. Пустое имя блокирует Create. Автор из Profile, отдельного поля нет. Пустой Tag не передаётся.

`commit.create` принимает `message`, `author`, `tag`. Имя и описание склеиваются в `message` (имя, пустая строка, описание). Перед create выбранные пути ещё раз `index.add`.

Успех закрывает диалог и обновляет метаданные репозитория. Ошибка — toast, диалог остаётся открытым. Cancel не создаёт коммит.
