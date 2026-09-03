# Диалоги

Диалог — модальный сценарий с явным OK/Cancel (или эквивалентом из макета).  
Панели: [../panels/architecture.md](../panels/architecture.md).  
Экраны: [../views/architecture.md](../views/architecture.md).  
Методы: [../gui_backend/jsonapi.md](../gui_backend/jsonapi.md).  
Ошибки: [ниже](#ошибки) и [states](../states/architecture.md#ошибки-и-уведомления).

---

## Кирпичи Figma (`Dialog /`)

Холст [DFM 0.8.1 component](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4191-5772). `Components / Dialog / …` — поля внутри, не отдельные экраны.

| Figma | Node | Спека |
|-------|------|-------|
| Settings | `4040:5134` (GC tab `6056:12410`, Ignored `6078:16314`) | [settings.md](./settings.md) |
| Merge | `4158:7621` | [merge.md](./merge.md) |
| Switch / Dirty / Rename / Create / Delete Branch | см. таблицу | [branches.md](./branches.md) |
| Stash conflicts | `6085:13903` | [stash-conflicts.md](./stash-conflicts.md) |

Без кадра на холсте (тот же Dialog shell 451): [файлы](./files.md), [restore](./restore.md), [обслуживание](./maintenance.md). Не выдумывать новый chrome.

---

## Правила построения

1. Один диалог — одна операция Forester (или короткий wizard из 2–3 шагов, если так в макете).
2. Пока запрос идёт — блокировать повторный submit, контролы disabled по макету.
3. Успех: закрыть диалог, обновить store (`status.get`, списки веток/коммитов).
4. Ошибка API: остаться открытым, показать текст; не закрывать «наполовину».
5. Destructive (delete branch, restore --hard, restore.version, merge abort, **Clean repository**, **Delete in history**, revert/reset) — отдельное подтверждение из макета, не `window.confirm`.
6. Не дублировать в диалоге данные, которые уже видны в панели, если макет этого не делает.
7. Валидация имени ветки / пустого commit message / пустого rename — до `Call`.

---

## Каталог

Диалог в продукте — если есть в Figma **или** обязателен для destructive / обслуживания (тогда кадр может отсутствовать). Native OS picker (Open Folder, Create, Add, Settings path) — не `Dialog /`.

| Диалог | Код | Спека | Метод | Ошибка |
|--------|-----|-------|-------|--------|
| Settings | `SettingsDialog` | [settings.md](./settings.md) | `setup.cfg`, `gc.run`, `workdir.dfmignore.get` / `set` | toast (`onError`) |
| Merge | `MergeDialog` | [merge.md](./merge.md) | `merge.start` / `continue` / `abort`; preview `diff.name_status`, `object.list_by_file` | в диалоге `AlertBanner` |
| Switch dirty | `SwitchBranchDialog` | [branches.md](./branches.md) | повтор `repo.switch` `auto_stash: true` | toast, если не dirty-stash |
| Create branch | `CreateBranchDialog` | [branches.md](./branches.md) | `branch.create` | toast |
| Rename branch | `RenameBranchDialog` | [branches.md](./branches.md) | `branch.rename` | toast |
| Delete branch | `DeleteBranchDialog` | [branches.md](./branches.md) | `branch.delete` | toast |
| Rename file | `FileRenameDialog` | [files.md](./files.md) | `workdir.rename` | toast |
| Delete in project | `FileDeleteDialog` | [files.md](./files.md) | `workdir.delete` | toast |
| Delete in history | `FileDeleteDialog` | [files.md](./files.md) | `commit.delete_file` | toast |
| Restore file | `RestoreFileDialog` | [restore.md](./restore.md) | `restore.file` | toast |
| Restore version / Revert commit / Reset | `RestoreFileDialog` | [restore.md](./restore.md) | `restore.version`, `commit.revert`, `commit.reset` | toast |
| Delete stash | `RestoreFileDialog` | [restore.md](./restore.md) | `stash.drop` | toast |
| Worktree ↔ stash conflicts | `WorktreeStashConflictDialog` | [stash-conflicts.md](./stash-conflicts.md) | backend gap; не подключён | `AlertBanner` в диалоге |
| Stash ↔ stash conflicts | `StashStashConflictDialog` | [stash-conflicts.md](./stash-conflicts.md) | backend gap; не подключён | `AlertBanner` в диалоге |
| Verify repository | `VerifyRepositoryDialog` | [maintenance.md](./maintenance.md) | `repo.rebuild` | в диалоге |
| Recover commit | `RecoverCommitDialog` | [maintenance.md](./maintenance.md) | `reflog.get` / `reflog.restore` | в диалоге |
| Clean repository | `FileDeleteDialog` | [maintenance.md](./maintenance.md) | не JSON API: Close + удалить `.DFM/` | toast (`SessionInfo.error`) |
| Init repository | OS picker, не модалка | ниже | `repo.init`; меню Create; First Start Create | toast |
| Create commit | **не** `Dialog /` | [project-browse](../views/project-browse.md) | `index.add` → `commit.create` | toast |
| Remove repo from list | вкладка Settings | [settings.md](./settings.md) | `repos.cfg`; не удаляет `.DFM/` | toast |

Нет JSON-метода — нет пункта «сделать как в git CLI». Исключение: **Clean repository**.

Help в [Header Settings](../components/items/header-settings.md) — disabled, диалога нет.

---

## Ошибки

Куда класть `envelope.error` (или `SessionInfo.error`, или fallback `request failed`):

| Поверхность | Когда |
|-------------|-------|
| **В диалоге** | Merge; stash conflicts; Verify; Recover. Диалог не закрывать |
| **Toast** (`AlertBanner` destructive, title `Error`) | все остальные мутации и Open/Init/Clean; Settings save; пагинация `workdir.entries` |
| **Не toast** | `status.get` / `log.get` с текстом повреждённого object store → [DFM Damaged](../views/project-browse.md), не баннер ошибки |
| **Баннер состояния** | merge in progress, detached HEAD — [states](../states/architecture.md), не ошибка API |

Текст пользователю: `error` из envelope как есть, если строка человекочитаемая; иначе нейтральный `request failed`. Не показывать stack, имена методов (`workdir.thumbnail`), сырой JSON.

Грязный switch без `auto_stash`: если сообщение похоже на uncommitted/stash — открыть Switch dirty, **не** toast.

Подробности строк envelope: [jsonapi.md](../gui_backend/jsonapi.md#ошибки-envelope), [gui_backend](../gui_backend/architecture.md#ошибки).

---

## Init

1. Пользователь выбирает абсолютный путь (пустая папка или проект без `.DFM/`).
2. `CallStateless` / сессия на этот путь → `repo.init`.
3. Запись `~/.dfm/repos.cfg`: `[current repo]` и `[repo] path_N`.
4. `Open` сессии, `status.get`, вход в Project.

Автор из `[user]` передавать в `author`, если поле есть в мастере.

Меню [Header Window](../components/items/header-window.md) → Repository → Create repository — тот же сценарий. Add repository — Open существующего `.DFM/`, без `repo.init`. Порядок пунктов и separators — там же. Ошибка Open/Init → toast (`SessionInfo.error`).

---

## Commit

- Кнопка недоступна, если index пуст **и** нет сценария «add then commit» в макете.
- Композер — карточка в File Info / Select More Files (selection) или в левой Card Directory (all files), кадры [Create Commit](../views/project-browse.md) / [Create Commit all files](../views/project-browse.md), не модалка Settings.
- Если макет коммитит выбранные/все изменения: сначала `index.add` с path (или `["."]`), затем `commit.create`.
- `amend` только когда это действие есть в UI и HEAD не пустой.
- Ошибка → toast.

---

## Switch и dirty

`repo.switch` без `auto_stash` на dirty дереве завершается ошибкой.  
Диалог dirty-switch — единственное место, где GUI ставит `auto_stash: true`. Не включать auto-stash молча. Прочие ошибки switch → toast.

---

## Merge

Последовательность — [merge.md](./merge.md). Ошибка start/continue/abort и preview — `AlertBanner` внутри диалога, шаг view objects. Не дублировать тем же текстом в toast, пока диалог открыт.

---

## Settings

Поля путей — абсолютные native path.  
`[api] path` — библиотека, не CLI ([setup-cfg-api-path](../../rules/setup-cfg-api-path.mdc)).

Список репозиториев можно очистить полностью. Save пустого списка: `SaveRepos` → пустой `repos.cfg` (без `[current repo]`), закрыть сессию, окно [First Start](../views/first-start.md) 640×656, закрыть Settings. Не оставлять последний path из-за `knownRepos(current)`.

Кнопка удаления строки — destructive icon, белый `trash-2`: [settings.md](./settings.md), [Button UI kit](../components/architecture.md#button-ui-kit). Ошибка save / `gc.run` → toast, диалог открыт.
