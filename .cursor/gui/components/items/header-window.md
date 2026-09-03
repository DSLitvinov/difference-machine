# Header Window

Figma: [Item / Panel / Header / Window](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4423-10574) (`4423:10574`).  
Menu Bar: [4423:11737](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4423-11737).

Код: native window chrome + Wails application menu (`menu.go`). **Не** React-кирпич и **не** второй title bar поверх ОС.

Набор символа в Figma — схема команд. Отрисовка рамки, скруглений и кнопок окна — **геометрия ОС**. Текст title bar — ниже; в Figma он декоративный, канон для реализации — эта спека.

---

## Window title

Системный заголовок окна (Wails `Title` / `WindowSetTitle`). Не рисовать вторую строку в webview. About box остаётся `Difference Machine` — это имя продукта, не title окна.

Пользователь должен видеть, какой репозиторий открыт, не открывая меню Repository.

| Состояние | Текст |
|-----------|--------|
| First Start / нет `[current repo]` | `Difference Machine` |
| Открыт репозиторий | `Difference Machine ({name})` |

`{name}` — basename корня репозитория (последний сегмент абсолютного path). Тот же label, что radio-пункт в меню **Repository**, когда имена не конфликтуют.

Примеры: `Difference Machine (shot-01)`, `Difference Machine (assets)`.

Обновлять при Open Folder / Create repository / Add repository / переключении репо из меню / возврате на First Start (Clean без другого текущего path). Не включать ветку, rel path папки внутри репо и полный абсолютный path.

---

## Window controls

Кнопки из макета (`arrow-down` / `maximize-2` / `x`) **не рисуем**. Их заменяют системные контролы:

| ОС | Контролы |
|----|----------|
| macOS | traffic lights (закрыть / свернуть / zoom) слева в title bar |
| Windows | caption buttons справа |
| Linux | кнопки окна WM |

`Frameless` выключен. На macOS — `TitleBarDefault()`, чтобы окно скруглялось так же, как другие приложения.

---

## Menu Bar (`4423:11737`)

Пункты те же: **File**, **Edit**, **Repository**, **Branches**, **Window**.

| ОС | Где меню |
|----|----------|
| macOS | глобальный menu bar экрана (как Obsidian). В webview меню **нет** |
| Windows / Linux | системный menu bar окна Wails, не кастомный ряд в React |

macOS дополнительно получает стандартные **App** (About, Hide, Quit) и **Window** (Minimize, Zoom) роли Wails — это chrome ОС, не новые продуктовые команды.

### File

| Пункт | Поведение |
|-------|-----------|
| Open Folder | OS folder picker (абсолютный native path) → `jsonapi.Close` текущей сессии при необходимости → `Open` нового корня. Если в папке есть `.DFM/` — app shell. Если нет — [Not a repository](../../states/architecture.md), не вызывать workdir API |

Тот же смысл, что Open на [First Start](../../views/first-start.md).

### Edit

| Пункт | Поведение |
|-------|-----------|
| Settings | открыть [Dialog / Settings](../../dialogs/settings.md). Тот же диалог, что шестерёнка в [Header Settings](./header-settings.md) |

### Repository

Управление репозиториями. Ветки сюда **не** класть — отдельный пункт **Branches**.

Группы через separator:

1. Create repository, Add repository
2. Verify repository, Recover commit
3. Clean repository
4. radio-список известных репозиториев (переключение сессии)

| Пункт | Поведение |
|-------|-----------|
| Create repository | OS folder picker → `repo.init` (`CallStateless`) → запись cfg → `Open` сессии. Как Create на First Start |
| Add repository | OS folder picker → `Open` существующего корня с `.DFM/` → запись в список cfg. Как Open Folder, из раздела Repository |
| Verify repository | `repo.rebuild`: счётчики object store. Результат в диалоге. Disabled без сессии. Та же команда с кнопки на [DFM Damaged](../../views/project-browse.md) |
| Recover commit | `reflog.get` → список; `reflog.restore` на выбранный hash (снимает `delete` и `commit.reset` mixed). Disabled без сессии |
| Clean repository | **удалить каталог `.DFM/`** на диске в корне текущего репо. Не JSON API. Сначала `jsonapi.Close`. Файлы проекта **не** трогать. Path в cfg можно оставить — состояние **Not a repository** (Create repository в History). Disabled без сессии. Destructive confirm |

После Add — separator, затем Verify и Recover. После Recover — separator, затем Clean. Перед radio-списком — ещё separator, если список не пуст.

Clean — destructive: подтверждение по шаблону destructive-диалогов ([maintenance](../../dialogs/maintenance.md)), не `window.confirm`. Кадра `Dialog / Clean repository` на холсте пока нет. Verify / Recover — [maintenance.md](../../dialogs/maintenance.md).

Не путать с Remove repo from list (только cfg, `.DFM/` остаётся).

### Branches

Copy пунктов — как в [Popover (Manage branches)](./header-select-branch.md). Disabled без открытой сессии.

| Пункт | Поведение |
|-------|-----------|
| Create new | [Create Branch](../../dialogs/branches.md) |
| Merge branches | открыть [Dialog / Merge](../../dialogs/merge.md) |
| Rename | [Rename Branch](../../dialogs/branches.md) текущей ветки |
| Delete branch | [Delete Branch](../../dialogs/branches.md). select → confirm; текущая disabled |

После Rename — separator, затем Delete branch.

### Window

Системное меню окна (hide / minimize / zoom / close), не третий набор иконок в контенте.
