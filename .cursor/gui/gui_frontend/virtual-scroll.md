# Виртуальная прокрутка, ленивые эскизы, кэш

Как сетка и длинные списки живут в окне без видимой пагинации и без штурма `workdir.thumbnail`.

Обзор frontend: [architecture.md](./architecture.md).  
Контракт и хранение эскизов: [../gui_backend/thumbnails.md](../gui_backend/thumbnails.md).  
Содержимое коммитов и стейджей: [revision-cache.md](./revision-cache.md).  
Паритет Figma (никаких «showing 2 of 3»): [figma-gui-parity](../../rules/figma-gui-parity.mdc).  
Правило агента: [virtual-scroll-preview](../../rules/virtual-scroll-preview.mdc).

---

## Три оси (не смешивать)

| Ось | Что грузится | Метод | Когда |
|-----|--------------|--------|--------|
| **Каталог** | Имена, path, size, mtime, is_dir; у истории — hash, message, author | `workdir.entries` / `search` / `entries_by_paths`; история: `log.get` | Следующая страница при приближении к концу уже загруженного массива |
| **Эскиз workdir** | PNG / text_preview / placeholder | `workdir.thumbnail` | Только тайлы **в viewport + overscan** |
| **Payload ревизии** | stat карточки, список path, diff, blob | `diff.stat` / `name_status` / `diff.text` / `blob.get` / `commit.get` | Visible карточки или **выбранный** path. Канон: [revision-cache.md](./revision-cache.md) |

Страница entries (`limit` по умолчанию 200) — метаданные для раскладки сетки, не разрешение греть 200 `workdir.thumbnail`. Страница `log.get` — не сто вызовов `diff.stat`. Mutex JSON API; эскиз и diff дороже каталога.

`FilePreview` и `FileGridTile` API не вызывают. Virtualizer и очередь живут в панели ([Content View](../panels/content-view.md)). Карточки истории — в Project / File view; payload: [revision-cache.md](./revision-cache.md).

---

## Где обязателен virtualizer

| Поверхность | Зачем |
|-------------|--------|
| Сетка папки в Content View | Главный случай: default **48×48**, CSS Grid `auto-fill` + `minmax(106px, 1fr)`; больше колонок → больше visible thumbs |
| Список коммитов в Project view / File view | `log.get`; `diff.stat` только visible карточек |
| Список stash (вкладка Stash) | Тот же virtualizer; каталог `stash.list` |
| Длинный список файлов коммита / Select More Files | scroll + догрузка, без chrome пагинации |

Не виртуализировать:

- шапку и тулбар;
- один крупный превью File Info (`size` L) — один запрос, когда выбран файл;
- диалоги и короткие меню.

Библиотека (TanStack Virtual или эквивалент) — деталь реализации. Число колонок сетки папки — из CSS Grid панели, не «7 с кадра». Кирпич (бейджи, hover, copy) — [grid-file](../components/items/grid-file.md) / [grid-folder](../components/items/grid-folder.md).

---

## Viewport и overscan

Сетка папки — отзывчивая: [content-view](../panels/content-view.md). Кадр 772×648 задаёт padding 16 и gap 8, не 7×106.

```css
grid-template-columns: repeat(auto-fill, minmax(106px, 1fr));
gap: 8px;
```

`nCols = max(1, floor((innerWidth + 8) / (minTrack + 8)))`. При default `minTrack` 106 знаменатель 114. Collapse info (center 1120) и ресайз окна меняют `nCols`, не `previewSize`. Virtualizer **читает** это число (ResizeObserver), не хардкодит колонки. При смене `nCols` пересчитать ряды; каталог и LRU эскизов не сбрасывать; scrollTop сохранить, если возможно.

Высота ряда — от `previewSize(minTrack)` + padding 8×2 + gap 8 + подпись 34, **не** от фактической ширины `1fr`. При default 48 ряд ≈ 106. Overscan — **1–2 ряда** (= `nCols`…`2×nCols` ячеек), не «всегда 14».

Плотность и формула квадрата: [architecture.md](../architecture.md#сетка-рабочей-копии), пиксели: [content-view](../panels/content-view.md).

| Параметр | Правило |
|----------|---------|
| Mount DOM | только видимые тайлы + overscan |
| Overscan | **1–2 ряда**, не вся страница entries |
| Placeholder в DOM | пустой слот той же геометрии, пока тайл не смонтирован — без спиннера на всю панель |
| Скролл | сохранять позицию при догрузке страницы entries; не прыгать к началу |

Смена папки / Only changed / View ignored / поиск — сброс диапазона virtualizer и позиции скролла (новый набор path). Смена только selection — скролл не сбрасывать. Ресайз окна — не сброс папки.

---

## Ленивая загрузка эскиза

Пока тайл не попал в visible ∪ overscan — **не** вызывать `workdir.thumbnail`.

Протокол (workdir) — как в [thumbnails.md](../gui_backend/thumbnails.md): memory → disk (только ffmpeg-image) → API. Очередь **1–2** in-flight на **все** `Call` окна (thumbs + history). Mutex API не ускоряется пачкой. Приоритет: [revision-cache.md](./revision-cache.md).

Приоритет очереди: тайлы ближе к центру viewport первыми; ушедшие из overscan — отменить или не стартовать, если `Call` ещё не ушёл. Уже ушедший `Call` не абортируется контрактом 0.8.1 — ответ положить в кэш, показать при возврате скролла.

Уход тайла из overscan:

- не размонтировать blob URL, пока ключ в LRU;
- не ретраить `placeholder` по тому же ключу.

Loading: квадрат `FilePreview` пустой (атом без spinner). Глобальный спиннер сетки — запрещён, его нет в Figma.

---

## Догрузка каталога (`has_more`)

`workdir.entries` / `search`: `offset` / `limit` (entries: 200).  
`log.get`: `max_count` + флаг `capped` (отдельного `offset` в контракте 0.8.1 нет — повторить с большим `max_count` или догрузить по спеке API).

1. Первая страница при открытии папки / вкладки History.
2. Когда virtualizer подходит к концу **уже загруженного** массива — следующая страница.
3. Дописывать в список, не заменять.
4. `has_more` / `capped` / `total` — только для логики. В UI не писать «ещё N», «page 2», «showing 2 of 3».

Пока идёт догрузка страницы — не чистить уже показанные тайлы ([states](../states/architecture.md)). Ошибка страницы — toast, список остаётся.

Фильтры **Only changed**, **View ignored** и поиск — те же правила: плоский/фильтрованный массив тоже виртуализируется и догружается страницами, без второго chrome.

---

## Хранение эскизов

Канон ключей, LRU, `.DFM/cache/thumbs/`, инвалидация — [thumbnails.md](../gui_backend/thumbnails.md). Здесь только связь со скроллом:

| Слой | Роль при скролле |
|------|------------------|
| Memory LRU | Повторный заход в тот же viewport без `Call`. Размер LRU ≈ видимые + overscan + небольшой запас, не «все entries папки» |
| Disk PNG | Только `kind: image` после ffmpeg; hit при возврате в папку после рестарта, без повторного ffmpeg |
| Object store `.DFM/objects` | Не использовать |

Watcher игнорирует `.DFM/cache/`. Clean repository удаляет кэш вместе с `.DFM/`.

---

## Selection и жесты

Virtualizer не ломает selection: выбранные path живут в store, не в смонтированных DOM-узлах. Скролл обратно к выбранному тайлу — снова Selected из store.

Marquee / range, если появятся в макете — считать по модели списка (index в загруженном массиве), не по «какие div сейчас в DOM».

---

## Запрещено

- Видимая пагинация, счётчики «N of M», debug MIME / «preview 2 of 3».
- `workdir.thumbnail` на все `entries` сразу после `entries`.
- `diff.stat` / `blob.get` на все коммиты страницы `log.get` сразу.
- Генерация эскиза в React/canvas из полного файла.
- Три копии одних байт (Zustand base64 + IndexedDB + диск).
- Спиннер внутри `FilePreview`; спиннер на всю Content View.
- Класть thumbs в `.DFM/objects` или коммитить `.DFM/cache/`.
- Фиксировать колонки сетки папки (`repeat(7, 106px)` и т.п.) вместо `repeat(auto-fill, minmax(106px, 1fr))`.
