# Экраны (`View /`)

Экран — **сборка главного окна** из уже описанных панелей и кирпичей.  
Не атом, не колонка и не диалог.

Холст: [DFM 0.8.1 component](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4191-5772) (`4191:5772`).  
На холсте 23 фрейма с префиксом `View /`.

Кирпичи: [../components/architecture.md](../components/architecture.md).  
Колонки: [../panels/architecture.md](../panels/architecture.md).  
Модалки: [../dialogs/architecture.md](../dialogs/architecture.md).  
VCS-состояния: [../states/architecture.md](../states/architecture.md).

---

## Слои (не смешивать)

| Слой | Документ | Агент берёт отсюда |
|------|----------|-------------------|
| Экран | эта папка | какие колонки, когда, ширины, переходы |
| Панель | `panels/` | слоты одной колонки |
| Кирпич | `components/` | геометрия, hex, copy плейсхолдера |

Запрещено:

- Собирать `View /` как один React-компонент «весь кадр».
- Копировать цвета и радиусы с экрана, если есть `Atom /` или `Item /`.
- Описывать внутренние слоты колонки в спеке экрана (дубль панели).
- Путать `View / Project view / …` с `Content / View / Text|Img|Binary` (область превью файла).

Shell читает **производный** экран из store. Панели не знают соседей.

---

## Каркас окна приложения

Все экраны кроме First Start: внешнее окно **1429×768**, включая системный title bar.

| Слот | Кирпич | Размер |
|------|--------|--------|
| Шапка | [Header Window](../components/items/header-window.md) | native OS title bar + application menu (не 48px в webview) |
| Тело | горизонтальный ряд панелей | остаток высоты окна |

Колонки тела:

| Слот | Ширина | Когда |
|------|--------|--------|
| Left | 309 | всегда в app shell |
| Center | 788 | правая колонка видна |
| Center | 1120 | правая колонка скрыта (collapse / empty project / commit / history of file) |
| Right | 332 | файл выбран, info не свёрнута; или Select More Files |

Не держать пустую правую колонку «на всякий случай», если в варианте View её нет. Сетка папки в center заполняет слот: [отзывчивый Grid](../panels/content-view.md), default **48×48**, не 7 колонок с кадра 1429 и не Size=Max как посадка. Плотность — UI-state `gridTrack`, не измерение экрана.

Исключение макета: `Histpry of File - Image` рисует left 333 и center 1096. Канон колонок — **309 / 788|1120 / 332** из панельных спек, не этот кадр.

First Start — другое окно: [first-start.md](./first-start.md) (640×656), без трёх колонок.

---

## Семейства экранов

| Семейство | Спека | Смысл |
|-----------|-------|--------|
| Старт | [first-start.md](./first-start.md) | нет текущего репозитория |
| Обзор проекта | [project-browse.md](./project-browse.md) | сетка папки, empty, стейджи, создание коммита |
| Файл workdir | [file-preview.md](./file-preview.md) | превью одного файла, история файла в сайдбаре |
| Ревизия файла | [file-history.md](./file-history.md) | diff файла относительно коммита |
| Коммит проекта | [commit.md](./commit.md) | состав коммита + diff выбранного path |

Имена Figma с опечаткой (`Histpry`) в каталоге сохраняем как в макете; в прозе — «History of File».

---

## Каталог `View /` (23)

| Figma | Node | Семейство |
|-------|------|-----------|
| View / First Start | `4382:9252` | старт |
| View / Project view / Empty DFM Project | `4382:8827` | обзор |
| View / Project view / Empty DFM Folder | `4385:8956` | обзор |
| View / Project view / Root Folder | `4224:14140` | обзор |
| View / Project view / Root Folder - Collapse | `4276:6972` | обзор |
| View / Project view / SubFolder | `4324:5701` | обзор |
| View / Project view / File Info | `4408:11431` | обзор |
| View / Project view / File More Info | `4408:12671` | обзор |
| View / Project view / Stages | `4385:12759` | обзор |
| View / Project view / Stashes Null | `6035:12553` | обзор |
| View / Project view / Create Commit | `4385:10858` | обзор |
| View / Project view / Create Commit single file | `6036:14491` | обзор |
| View / Project view / File View - IMG | `4246:6471` | файл |
| View / Project view / File View - IMG ( Collapse ) | `4276:7423` | файл |
| View / Project view / File View - Text | `4290:23880` | файл |
| View / Project view / File View - Text ( Collapse ) | `4383:8492` | файл |
| View / Project view / File View - Binary | `4383:8072` | файл |
| View / Project view / File View - Binary ( Collapse ) | `4383:8927` | файл |
| View / Project view / File View - No History | `4276:8492` | файл |
| View / Project view / Histpry of File - Image | `4268:5493` | ревизия файла |
| View / Project view / Histpry of File - Text | `4290:22913` | ревизия файла |
| View / Project view / View Commit - Binary | `4272:6624` | коммит |
| View / Project view / View Commit - Text | `4290:24338` | коммит |
| View / Project view / View Commit - Img | `4306:3027` | коммит |

Отдельного `View / History` окна нет. Вкладки **History / Stash** (Figma: Stages) живут внутри [Panel / Project view](../panels/project-view.md).

Нет экранов merge, detached HEAD, settings — это [диалоги](../dialogs/architecture.md) и баннеры из [states](../states/architecture.md), не `View /`.

---

## UI-измерения → экран

Экран **вычисляется**, его имя не хранить в store. Источник: [states](../states/architecture.md).

| Измерение | Значения | Влияет на |
|-----------|----------|-----------|
| `shell` | first-start \| app | First Start vs 1429-окно |
| `folderPath` | `""` (корень) \| вложенный rel | Root vs SubFolder |
| `folderEmpty` | да \| нет | Empty Project vs сетка |
| `selection` | none \| file \| files | File Info Null / File Info / Select More Files |
| `contentContext` | folder \| file \| file-revision \| commit | семейство экрана |
| `fileKind` | image \| text \| binary | IMG / Text / Binary |
| `infoCollapsed` | да \| нет | center 1120, right скрыта |
| `gridTrack` | 106…360, default 106 | не кадр View; только колонки и 48×48→крупнее. [Сетка](../architecture.md#сетка-рабочей-копии) |
| `sidebarTab` | history \| stages | список коммитов vs stash (UI: **Stash**) |
| `stashEmpty` | да \| нет | Stages vs [Stashes Null](./project-browse.md) при вкладке Stash |
| `commitComposer` | закрыт \| открыт | карточка Create Commit |
| `fileHasHistory` | да \| нет | File view vs File view History Null |

Не путать `sidebarTab` с исчезнувшим «режимом окна Project | History». В макете один app shell; контекст файла — замена left на [Panel / File view](../panels/file-view.md), не вторая страница.

---

## Переходы (обзор)

```text
First Start --create/open--> Root Folder | Empty DFM *
Root / SubFolder --select file--> File Info
File Info --multi-select--> File More Info
* --collapse info--> Root Folder Collapse (и аналоги)
сетка --open file--> File View (kind)
File View --Back `<`--> обзор папки
File View --select commit--> History of File
History of File --Current preview--> File View
Project History --select commit--> View Commit
Uncommitted --Commit All / composer--> Create Commit | Create Commit single file (один файл выбран)
File Info --Add in commit--> Create Commit single file
вкладка Stash --> Stash | Stashes Null (пусто)
```

Детали — в спеках семейств.

---

## Открытые вопросы к макету

Зафиксированы, пока нет ответа владельца дизайна. Реализация не выдумывает третье поведение.

1. **Empty DFM Folder** (`4385:8956`): в сетке есть файлы, в сайдбаре плейсхолдер «Create repository». Это workdir без `.DFM/` или репозиторий без коммитов?
2. **First Start vs Empty DFM Project**: оба умеют создать/открыть репо. First Start — только пока нет `[current repo]`?
3. **Stash** (`View / … / Stages` в Figma): вкладка UI — **Stash** (Forester stash, не `staged_*` из `status.get`). Список — `stash.list`. Пустая вкладка — кадр [Stashes Null](./project-browse.md) `6035:12553`: [NoStagesProject](../components/atoms/card-no-stages-project.md) `6020:12733` слева, [Folder Empty](../panels/content-view.md) по центру, File Info Null справа. Не оставлять сетку рабочей папки. Кэш: [revision-cache.md](../gui_frontend/revision-cache.md).
4. **View Commit** без выбранного файла в списке коммита — кадра нет. Пока не выбран path в `Content / File list`, какой diff показывать?
5. **History of File** только Image и Text, binary-ревизии файла нет. Для бинарного файла из File view — оставаться на File View Binary или брать binary stub из View Commit?
