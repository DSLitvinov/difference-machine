# Header Window

Figma: [Item / Panel / Header / Window](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4423-10574) (`4423:10574`).  
Код: `HeaderWindow`.

Набор символа может быть 640×48; **на экранах приложения** инстанс **1429×48**. Канон окон: [../../views/architecture.md](../../views/architecture.md).

[View / First Start](../../views/first-start.md) этот кирпич **не** использует.

---

## Window controls (справа)

Три кнопки 24×24 — те же команды, что меню **Window**:

| Порядок в макете | Иконка | Действие |
|------------------|--------|----------|
| 1 | `arrow-down` | скрыть / свернуть (hide / minimize) |
| 2 | `maximize-2` | свернуть-развернуть (maximize / restore) |
| 3 | `x` | закрыть окно |

Проводник — Wails / native. Не дублировать второй title bar ОС.

---

## Menu Bar (слева)

Только эти пункты. Не добавлять Save, Clone, Quit как отдельные команды, если их нет ниже.

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

| Пункт | Поведение |
|-------|-----------|
| hide | как кнопка 1 справа |
| min/max | как кнопка 2 |
| close | как кнопка 3 |

Не третий набор команд окна — те же native-операции.
