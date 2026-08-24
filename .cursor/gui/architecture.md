# Архитектура GUI для Forester

Настольное приложение Difference Machine — графический клиент VCS **Forester**.  
GUI не реализует контроль версий самостоятельно: все операции с репозиторием идут через JSON API Forester.

Общее описание продукта: [architecture.md](../commands/architecture.md).  
Ядро и CLI Forester: [forester-arhitecture.md](../commands/forester-arhitecture.md).  
Хранение `.DFM/`: [database.md](../commands/database.md).  
Семантика VCS: [business-rules.md](../commands/business-rules.md).

**Исходники**

| Слой | Путь |
|------|------|
| GUI (Wails) | `sources/frontend/dfm-gui` |
| Forester | `sources/backend/forester` |
| Публичный JSON API для GUI | `sources/backend/forester/pkg/jsonapi` |
| Диспетчер методов | `sources/backend/forester/internal/jsonapi` |

---

## Стек технологий

Проект строится на web-технологиях внутри нативного окна.

| Слой | Стек |
|------|------|
| Язык backend GUI | **Go** 1.22+ |
| Оболочка | [Wails](https://wails.io/) v2 |
| Frontend | React, Vite, TypeScript |
| Стили и компоненты | Tailwind CSS, [shadcn/ui](https://ui.shadcn.com/) (Radix) |
| Состояние UI | Zustand |
| VCS | Forester JSON API in-process (`pkg/jsonapi`) |

Визуальный канон — макеты Figma и атомарные спеки в этом разделе. Не добавлять видимый chrome, которого нет в макете: [figma-gui-parity](../rules/figma-gui-parity.mdc).

---

## Слои

```text
React UI  (sources/frontend/dfm-gui/frontend)
    │  Wails bindings
    ▼
Go App    (sources/frontend/dfm-gui)     окно, setup.cfg, диалоги ОС, watcher
    │  jsonapi.Open / Call / Close
    ▼
pkg/jsonapi  →  internal/jsonapi         envelope {ok, result|error}
    ▼
Forester core  →  .DFM/
```

| Слой | Ответственность | Не делает |
|------|-----------------|-----------|
| **Frontend** | Вёрстка, навигация, локальный UI-state, вызовы Wails | Прямой доступ к `.DFM/`, парсинг object store |
| **Wails backend** | Сессия Forester, `setup.cfg`, выбор папок, открытие файлов ОС, bootstrap путей | Алгоритмы commit/merge/diff |
| **Forester JSON API** | Единственный контракт VCS и workdir | Отрисовку UI |

Транспорт GUI — **in-process** `pkg/jsonapi`, не CLI и не native C library. Native library (`libforester`) нужна Blender addon, не окну Wails.

---

## Карта документации

Правила разбиты по папкам. Этот файл — обзор; детали — в связанных спеках.

| Раздел | Папка | Содержание |
|--------|-------|------------|
| Frontend | [gui_frontend](./gui_frontend/architecture.md) | React, Wails-мост, layout, клиентский state; [сетка 48×48](#сетка-рабочей-копии); [виртуальный скролл](./gui_frontend/virtual-scroll.md), [кэш ревизий](./gui_frontend/revision-cache.md) |
| Backend GUI | [gui_backend](./gui_backend/architecture.md) | Go/Wails, сессия, JSON API, workdir, превью |
| Компоненты | [components](./components/architecture.md) | Кирпичи холста `4191:5772`: Atom / Item / Popover / Placeholder |
| Панели | [panels](./panels/architecture.md) | Колонки `Panel / …` |
| Экраны | [views](./views/architecture.md) | Сборка окна `View / …` из панелей |
| Диалоги | [dialogs](./dialogs/architecture.md) | Модалки `Dialog / …` |
| Состояния | [states](./states/architecture.md) | Режимы репозитория и UI; экран вычисляется, не хранится |
| Дорожная карта | [roadmap.md](./roadmap.md) | Фазы от пустого окна до полного GUI |

Контракт методов: [gui_backend/jsonapi.md](./gui_backend/jsonapi.md).

---

## Сессия Forester

GUI держит **одну открытую сессию** на выбранный корень репозитория (каталог с `.DFM/`).

```go
h := jsonapi.Open(workPath)                 // Handle
raw := jsonapi.Call(h, method, argsJSON)    // []byte envelope
jsonapi.Close(h)
```

`CallStateless(workPath, method, argsJSON)` — для разовых вызовов без handle (например `repo.init` до появления `.DFM/`).

Смена репозитория: `Close` текущей сессии → `Open` нового `workPath`. Путь сессии — **абсолютный filesystem path** корня проекта.

Обработчики JSON API сериализуют работу через глобальный mutex (`withWorkDir`). GUI не должен рассчитывать на параллельные VCS-вызовы в одном процессе.

---

## Envelope

Каждый `Call` возвращает JSON:

```json
{"ok": true, "result": {}}
```

или

```json
{"ok": false, "error": "message"}
```

Правила для GUI:

- Разбирать только этот envelope. Не читать stdout CLI.
- `ok: false` — ошибка для toast / диалога; текст `error` можно показать пользователю, если он понятен, иначе нейтральное сообщение из спеки UI.
- Успешные мутации часто возвращают `{"success": true}`; часть методов возвращает данные (`status.get`, `log.get`, `workdir.*`).
- После мутации, меняющей дерево/HEAD/index, frontend обновляет `status.get` и зависимые панели.

---

## Пути

Два уровня — не смешивать. Канон: [path-normalization](../rules/path-normalization.mdc).

| Уровень | Где | Формат |
|---------|-----|--------|
| Относительный | JSON API, UI, VCS | `/`: `assets/scene.blend` |
| Абсолютный | `setup.cfg`, OS open, toast | Native separators, `Abs` + `Clean` |

`.DFM/` скрыт от `workdir.tree` / `workdir.entries`. Исключение: `workdir.open` может открыть `.DFM/tmp_review` (результат `compare.extract`).

---

## Что принадлежит GUI, что — Forester

**Forester (JSON API)**

- Репозиторий, ветки, коммиты, index, status, diff, blob, merge, locks, manifests, GC
- Сканирование workdir, метаданные файла, thumbnail, rename, удаление в корзину ОС, поиск, open

**Wails backend**

- Список репозиториев и текущий репо в `~/.dfm/repos.cfg`
- Автор (`user.name` / `user.email`)
- Пути CLI / native API / Blender addon (bootstrap для экосистемы)
- Нативные диалоги выбора папки/файла
- Наблюдение за файловой системой workdir (инвалидация превью и status)

**Frontend**

- Режимы обзора папки / файла / коммита по [views](./views/architecture.md)
- Сетка рабочей копии (default **48×48**, [ниже](#сетка-рабочей-копии)), карточки коммитов, стейджи и композер коммита
- Диалоги и панели по спекам
- Кэш превью в памяти (байты приходят из API)
- Масштаб сетки (`gridTrack`) — UI-state сессии, не Forester и не `setup.cfg`
- Только светлая тема: токены `:root`, SVG из `assets/light/`

---

## Функциональные контуры окна

Поверхности GUI выводятся из методов JSON API, а не из отдельного UI-фреймворка Forester.

| Контур | API | UI |
|--------|-----|-----|
| Репозиторий | `repo.init`, список путей в cfg; Clean = удаление `.DFM/` | меню [Header Window](./components/items/header-window.md), First Start |
| Рабочая копия | `status.get`, `workdir.*`, `index.add` | Project: дерево, сетка default 48×48, dirty |
| История | `log.get`, `commit.*`, `diff.*`, `blob.get` | History: список коммитов, файлы ревизии; LRU — [revision-cache](./gui_frontend/revision-cache.md) |
| Ветки | `branch.*`, `repo.switch` | селектор ветки, диалоги |
| Сравнение | `compare.extract`, `restore.*` | extract в tmp_review, restore |
| Слияние | `merge.*`, `object.*` | диалог merge, конфликты, теги объектов |
| Блокировки | `lock.*` | индикатор и действия на файле |
| Настройки | cfg, не JSON API | пути, автор, язык |

Детализация поверхностей: [views](./views/architecture.md). Колонки: [panels](./panels/architecture.md). Модалки: [dialogs](./dialogs/architecture.md). Состояния: [states](./states/architecture.md).

---

## Сетка рабочей копии

Центр окна в семействе [project-browse](./views/project-browse.md): пользователь смотрит **каталог workdir**, не ревизию.

**Продуктовое правило.** Стартовая плотность — Figma Size=Min. Иконка папки и превью файла **48×48**. Цель — максимум объектов в колонке (как мелкие значки в файловом менеджере). Крупный квадрат Size=Max (128) и трек 200 px — не посадка в обзор, а масштаб по Ctrl/Cmd+wheel. Переключателя grid/list в 0.8.1 нет. Подписи «N columns» / «zoom» в UI нет.

**Два числа, не смешивать**

| Число | Смысл | Default | Чей state |
|-------|--------|---------|-----------|
| `gridTrack` (`minTrack`) | минимум ширины колонки CSS Grid | **106 px** (ячейка Size=Min вместе с подписью) | Zustand, сессия процесса; не cfg |
| `previewSize` | квадрат иконки / эскиза внутри тайла | **48 px** | производное: `48 + max(0, gridTrack − 106)` |

Колонки считает `repeat(auto-fill, minmax(gridTrack, 1fr))`, gap 8, padding 16. Ширина окна и collapse info меняют **число колонок**, не размер квадрата. Квадрат не брать из фактической ширины трека (`1fr`): иначе широкое окно само увеличит иконки и сломает default 48.

Диапазон `gridTrack`: **106…360**. Скролл без Ctrl/Cmd — прокрутка, не зум WebView. Смена репозитория масштаб не сбрасывает (предпочтение сессии). Рестарт приложения возвращает 106 / 48.

Пиксели тайла: [content-view](./panels/content-view.md), [grid-file](./components/items/grid-file.md), [grid-folder](./components/items/grid-folder.md). Виртуализация и очередь thumbs: [virtual-scroll](./gui_frontend/virtual-scroll.md). При default колонок больше — в viewport больше тайлов; правило «thumbnail только visible + 1–2 ряда» не меняется, очередь по-прежнему 1–2 in-flight.

---

## Конфигурация

Глобальные файлы в `~/.dfm/`. GUI читает и пишет их на старте и из настроек.

| Файл | Секция | Назначение |
|------|--------|------------|
| `setup.cfg` | `[user] name`, `email` | Автор коммитов |
| `repos.cfg` | `[current repo] path` | Открытый репозиторий |
| `repos.cfg` | `[repo] path_N` | Список известных репозиториев |
| `setup.cfg` | `[forester] path` | CLI (экосистема / bootstrap) |
| `setup.cfg` | `[api] path` | Native library для Blender addon |
| `setup.cfg` | `[addons] diffmachine_path` | Путь аддона |
| `setup.cfg` | `[blender] path` | Исполняемый Blender |

Репозиторный `.DFM/config` создаёт `repo.init`, GUI его не подменяет.

Правило путей API для аддона: [setup-cfg-api-path](../rules/setup-cfg-api-path.mdc).

---

## Правила построения кастомных компонентов

См. [components/architecture.md](./components/architecture.md) и [shadcn-custom-components](../rules/shadcn-custom-components.mdc).

Дизайн-система: [DFM 0.8.1 component](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4191-5772) (`4191:5772`).  
Кирпичи — `Atom /`, `Item /`, `Panel /`, `Dialog /`, `Popover /`. Сборка окна — `View / …` в [views](./views/architecture.md), не в каталоге кирпичей.

shadcn/ui — база поведения; кастомный атом — по наборному фрейму Figma, не «на глаз» с кадра View.

---

## Правила построения панелей

См. [panels/architecture.md](./panels/architecture.md) и кирпичи [project-view](./panels/project-view.md), [content-view](./panels/content-view.md), [file-info](./panels/file-info.md).

Панель — колонка `Panel / …` (sidebar, preview, info). Данные из JSON API. Какие колонки стоят вместе — [views](./views/architecture.md), не спека панели.

---

## Правила построения экранов

См. [views/architecture.md](./views/architecture.md).

Экран `View /` — рецепт: Header Window + left + center + optional right. Не отдельный виджет. Имя кадра вычисляется из [states](./states/architecture.md), не хранится в store.

---

## Правила построения диалогов

См. [dialogs/architecture.md](./dialogs/architecture.md), [settings](./dialogs/settings.md), [merge](./dialogs/merge.md), [branches](./dialogs/branches.md).

---

## Описание состояний

См. [states/architecture.md](./states/architecture.md).

Ключевые режимы репозитория: нет репо / не инициализирован / clean / dirty / detached HEAD / merge in progress. Frontend отображает их; источник истины — `status.get` и `merge.status`. Какой `View /` показать — таблица в [views](./views/architecture.md) и [states](./states/architecture.md).
