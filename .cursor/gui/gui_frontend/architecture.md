# GUI frontend (React / Wails)

Правила веб-слоя в `sources/frontend/dfm-gui/frontend`.  
Обзор: [../architecture.md](../architecture.md).  
Панели / диалоги / состояния / компоненты — соседние папки.

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

---

## Layout

Главное окно — shell из панелей (не роутер страниц):

- **Rail / sidebar mode** — переключение Project и History (если так в макете).
- **Sidebar** — дерево папок или список коммитов.
- **Preview** — сетка файлов, diff, просмотр.
- **Info** — метаданные выбранного файла/коммита.

Размеры колонок — из макета; persist splitter в local storage допустим, если не противоречит спеке.

Видимые подписи, бейджи, пустые состояния — только из Figma/спеки панели.

---

## Клиентский state

Zustand (или эквивалент) хранит:

| Срез | Примеры | Источник истины |
|------|---------|-----------------|
| App | текущий repo path, тема, настройки UI | cfg + local |
| Project | path папки, selection, filter | `workdir.*` + UI |
| History | ветка, выбранный commit, файлы diff | `log.get`, `diff.*` |
| VCS | snapshot `status.get`, `merge.status` | API |
| Preview cache | thumbnails по path | `workdir.thumbnail` |

Не класть в store сырые байты всех файлов репо. Кэш превью — LRU/по видимым path.

Селекторы: панели читают узкий срез, не весь store.

---

## Списки и виртуализация

`workdir.entries` и `log.get` пагинируются на backend. Frontend:

- Догружает следующую страницу при scroll, без пользовательского текста пагинации.
- Для сетки превью — virtualizer по макету; запросы thumbnail только для видимых (+ небольшой overscan).
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

## Тема и a11y

Тема — токены дизайн-системы. Для скрытого текста только `sr-only` / `aria-*`, не видимые «подсказки для агента».

Клавиатура: фокус в диалогах как в shadcn Dialog; горячие клавиши — только если есть в спеке.
