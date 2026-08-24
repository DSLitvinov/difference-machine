# Header Window

Figma: [Item / Panel / Header / Window](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4423-10574) (`4423:10574`).  
Menu Bar: [4423:11737](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4423-11737).

Код: native window chrome + Wails application menu (`menu.go`). **Не** React-кирпич и **не** второй title bar поверх ОС.

Набор символа в Figma — схема команд. Отрисовка рамки, скруглений и кнопок окна — **геометрия ОС**.

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

Пункты те же: **File**, **Edit**, **Repository**, **Window**.

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

| Пункт | Поведение |
|-------|-----------|
| Create repository | OS folder picker → `repo.init` (`CallStateless`) → запись cfg → `Open` сессии. Как Create на First Start |
| Clean repository | **удалить каталог `.DFM/`** на диске в корне текущего репо. Не JSON API (метода нет). Сначала `jsonapi.Close`. Файлы проекта **не** трогать. Path в cfg можно оставить — папка остаётся известной, состояние **Not a repository** |

Clean — destructive: подтверждение по шаблону destructive-диалогов ([dialogs](../../dialogs/architecture.md)), не `window.confirm`. Кадра `Dialog / Clean repository` на холсте пока нет — copy уточнить при вёрстке, не молча сносить `.DFM/`.

Не путать с Remove repo from list (только cfg, `.DFM/` остаётся).

### Window

Системное меню окна (hide / minimize / zoom / close), не третий набор иконок в контенте.
