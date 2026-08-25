# GUI frontend (React / Wails)

Правила веб-слоя в `sources/frontend/dfm-gui/frontend`.  
Обзор: [../architecture.md](../architecture.md).  
Виртуальный скролл и ленивые эскизы: [virtual-scroll.md](./virtual-scroll.md).  
Кэш коммитов и стейджей: [revision-cache.md](./revision-cache.md).  
Панели / диалоги / состояния / экраны / компоненты — соседние папки.

---

## Стек

- React + TypeScript + Vite (Wails embed)
- Tailwind + shadcn/ui
- Zustand для клиентского состояния
- Вызовы backend только через Wails bindings

Frontend не импортирует Go и не читает диск. Нет `fetch` на JSON API Forester: API не HTTP-сервер.

---

## Мост к backend

1. Узкие Wails-методы конфигурации и ОС (текущий репо, cfg, select folder).
2. Единый вызов Forester: `method` + JSON args → envelope.

Правила:

- Типизировать args/result рядом с методами из [jsonapi.md](../gui_backend/jsonapi.md).
- После `ok: false` не частично применять `result`.
- Мутации: дождаться ответа → `status.get` / точечный refresh панелей, которые зависят от данных.
- Не дублировать Forester (свой diff, свой hash, своё дерево `.DFM`).

Полный refresh снапшота (`status.get` + `log.get` + `branch.list` + `stash.list` + `lock.list` + `merge.status` + `workdir.entries`) дергают три источника: эффект на смену repo / папки / `changedOnly`, событие `workdir:changed` от watcher и каждая мутация. Поэтому:

- Прогоны **сериализованы**: одновременно выполняется один, за ним стоит максимум один в очереди. Пачка событий watcher сворачивается в один перезапрос; `await` мутации всегда получает прогон, начатый **после** её ответа.
- Перед записью в store сверять `repoPath` / `folderPath` / `changedOnly` со значениями на старте прогона. Не совпало — не писать: снапшот устарел, запись сделает следующий прогон.
- Догрузка страниц (`workdir.entries` с `offset`) сверяет `entriesToken`: если полный refresh заменил список, страницу выбросить, иначе смешаются offset'ы разных списков.

---

## Layout

Главное окно — shell из панелей по [views](../views/architecture.md), не роутер страниц:

- **Header Window** — native OS title bar + application menu (File / Edit / Repository / Window). Not a React row.
- **Left** — Project view или File view (контекст, не «вторая страница»).
- **Center** — сетка папки, превью файла, diff ревизии или состав коммита.
- **Right** — File Info / Select More Files, либо скрыта (center 1120).

First Start — отдельное окно 640×656, [first-start](../views/first-start.md).

Размеры колонок — из спеки View; persist splitter только если не ломает 309 / 788|1120 / 332. Сетка папки внутри center — [продуктовое правило](../architecture.md#сетка-рабочей-копии): CSS Grid `auto-fill` / `minmax(106px, 1fr)`, default превью **48×48**, не фиксированные 7×106 с кадра и не Size=Max как посадка.

Видимые подписи, бейджи, пустые состояния — только из Figma/спеки панели или экрана.

---

## Клиентский state

Zustand (или эквивалент) хранит:

| Срез | Примеры | Источник истины |
|------|---------|-----------------|
| App | текущий repo path, first-start vs app | cfg + local |
| Shell UI | folderPath, selection, contentContext, infoCollapsed, changedOnly, sidebarTab, commitComposer | UI; экран из [views](../views/architecture.md) |
| Grid zoom | `gridTrack` 106…360, default **106** → `previewSize` **48** | сессия; не Forester, не cfg. Формула: [architecture.md](../architecture.md#сетка-рабочей-копии) |
| History | ветка, выбранный commit, файлы diff | `log.get`, `diff.*`; LRU payload — [revision-cache.md](./revision-cache.md) |
| VCS | snapshot `status.get`, `merge.status` | API; не путать со вкладкой Stash |
| Preview cache | LRU эскизов workdir, ключ path+size+mtime | [thumbnails.md](../gui_backend/thumbnails.md), [virtual-scroll.md](./virtual-scroll.md) |

Не класть в store сырые байты всех файлов репо. Кэш превью — LRU, blob URL, не вечный base64.

Селекторы: панели читают узкий срез, не весь store.

---

## Списки и виртуализация

Канон: [virtual-scroll.md](./virtual-scroll.md). Кэш эскизов: [thumbnails.md](../gui_backend/thumbnails.md). Кэш ревизий: [revision-cache.md](./revision-cache.md).

`workdir.entries` и `log.get` пагинируются на backend. Frontend:

- Догружает следующую страницу при scroll, без пользовательского текста пагинации.
- Сетка папки — CSS Grid `repeat(auto-fill, minmax(gridTrack, 1fr))`, default `gridTrack` **106**, превью **48×48**; virtualizer считает `nCols` с контейнера. Квадрат — от `gridTrack`, не от ширины `1fr`. `workdir.thumbnail` только для видимых + 1–2 ряда overscan.
- Карточки History — `diff.stat` только для видимых; payload path — только выбранный файл.
- Очередь **1–2** in-flight на все `Call` окна.
- `has_more` / `capped` — внутренние флаги, не копирайт в UI.

---

## Выбор файлов

Selection живёт на frontend (клик, range, marquee — если в макете). В API уходят только действия:

- open / rename / delete / restore paths
- `index.add` выбранных
- lock на `file_path`

Нормализация path — до вызова (`/` , без `./`). Сравнивать rel path как строки после нормализации; на Windows не смешивать с abs из toast.

---

## Ошибки и уведомления

- Операционные ошибки API → toast / сообщение из спеки.
- Валидация формы (пустое имя ветки, пустой commit message) — до вызова API.
- Не показывать stack trace и сырые имена методов (`workdir.thumbnail`) пользователю.

---

## Токены и a11y

Токены — светлая дизайн-система Figma (`:root` в CSS). Тёмной темы в GUI нет: не `html.dark`, не `[ui] theme`, не вкладка Appearance. Иконки на тёмных кнопках (primary / destructive) — CSS `filter: invert(1)` на светлом SVG, не второй набор ассетов.

Для скрытого текста только `sr-only` / `aria-*`, не видимые «подсказки для агента».

Клавиатура: фокус в диалогах как в shadcn Dialog; горячие клавиши — только если есть в спеке.
