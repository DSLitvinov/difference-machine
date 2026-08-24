# Превью и эскизы (thumbnails)

Источник превью для сетки и info — JSON API Forester, не локальный рендер в React (кроме отображения уже полученных bytes/text).

Метод: `workdir.thumbnail`. Реализация: `handlers_workdir.go`, ffmpeg-пайплайн, `blend_thumbnail.go`.  
Исторические blob: `blob.get` (байты файла в коммите, не уменьшенный эскиз).

Кэш GUI не заменяет API: miss → `workdir.thumbnail`. Контракт метода не менять ради кэша (0.8.1).

Когда запрашивать и как виртуализировать сетку: [../gui_frontend/virtual-scroll.md](../gui_frontend/virtual-scroll.md).

---

## Контракт `workdir.thumbnail`

Args: `{ "path": "rel/path.ext" }` — файл, не директория.

| `kind` | Поля | Когда |
|--------|------|--------|
| `image` | `mime`, `content_base64` | Растровое превью готово (картинка через ffmpeg или PNG из .blend) |
| `text` | `mime`, `text_preview` | Текстовое расширение, UTF-8, размер ≤ 32 KiB; текст обрезан до 2000 рун |
| `placeholder` | `mime` | Нет эскиза: неизвестный тип, битый UTF-8, нет blend-thumb, ffmpeg не смог |

Ошибка: нет `path`, path — директория, файл недоступен.

Лимит ответа изображения: 5 MiB (`maxThumbnailBytes`). Источник для ffmpeg: до 64 MiB, длинная сторона кадра ≤ 512 px.

Один растр с API покрывает тайлы S/M и info L (`object-cover`). Второй размер эскиза не хранить.

---

## Картинки

Расширения: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.exr`, `.tiff`, `.tif`, `.bmp`.

Пайплайн: системный/бандленный ffmpeg → PNG в pipe. Нет ffmpeg или ошибка → `placeholder` (не падение всей сетки).

Дорого: каждый `Call` без кэша снова запускает ffmpeg. Disk-кэш GUI — только для этого `kind: image` с ffmpeg (не для blend, см. ниже).

---

## `.blend`

Порядок в Forester:

1. Кэш миниатюр Blender (Freedesktop thumbs, large затем normal).
2. Встроенный chunk `TEST` в blend-файле.

Успех → `kind: image`, `mime: image/png`.  
Нет кэша и нет chunk → GUI рисует **placeholder** (иконка типа файла по макету), не запускает Blender для рендера кадра.

Не копировать PNG из `~/.thumbnails` в `.DFM/`. Повторный показ — из **памяти** GUI, пока ключ валиден.

---

## Текст

Расширения (полный список в `isTextExt`): `.txt`, `.md`, `.json`, `.xml`, `.svg`, `.tsx`, `.ts`, `.js`, `.jsx`, `.go`, `.py`, `.rs`, `.css`, `.html`, `.yaml`, `.yml`, `.ini`, `.cfg`, `.sh`.

Показ: моноширинный фрагмент `text_preview`. Не подгружать весь файл вторым запросом, если thumbnail уже отдал preview.

На диск не писать: 2000 рун дёшево прочитать снова после рестарта.

---

## История коммита (не workdir)

`blob.get` отдаёт содержимое blob ревизии (base64, до 5 MiB). Для картинок в History — декодировать как файл; уменьшать на frontend только для отображения. Хранить в **memory** LRU по hash, не в `.DFM/cache/thumbs/`. Грузить только выбранный path: [revision-cache.md](../gui_frontend/revision-cache.md).

`commit.get` может вернуть `screenshot_base64` снимка коммита.

`diff.text` с `is_binary: true` — не пытаться показать unified diff; UI бинарного diff по макету (stub).

Ключ кэша истории **не** совпадает с workdir: в нём есть hash коммита, не `mtime` файла на диске.

---

## Хранение эскизов (GUI)

Два слоя. Object store Forester (`.DFM/objects`) **не** использовать.

### Ключ

Workdir:

```text
repoAbs + relPath + size + mtime
```

- `relPath` — `/`, как в API (`entries.path`).
- `size`, `mtime` — из `workdir.entries` / `metadata` (`modified` Unix).

История:

```text
repoAbs + commitHash + relPath
```

Смена size/mtime → другой ключ. Старая запись вытесняется LRU, не «обновляется на месте».

### Слой 1 — память (frontend, обязательно)

Для ленивого скролла сетки.

| Правило | |
|---------|--|
| Значение | `{ kind, blobUrl \| text_preview, placeholder }` |
| Не хранить | сырой `content_base64` в Zustand надолго; полный файл |
| LRU | по числу записей (видимые + overscan), не «все 200 entries» |
| Evict | `URL.revokeObjectURL` для raster |
| Смена repo | сбросить весь memory cache |

Запрос: virtualizer — только видимые тайлы + **1–2 ряда** overscan. Не греть папку `limit=200` целиком. Канон скролла: [virtual-scroll.md](../gui_frontend/virtual-scroll.md).

Очередь: **1–2** in-flight `workdir.thumbnail`. API под глобальный mutex; пачка параллельных `Call` не ускоряет.

Пока нет ответа — `loading` тайла по макету. `placeholder` в кэше: не ретраить тот же ключ, пока он валиден.

### Слой 2 — диск (только ffmpeg-картинки)

Чтобы не гонять ffmpeg после рестарта и при возврате к папке.

| | |
|--|--|
| Где | `.DFM/cache/thumbs/` (FS: `filepath.Join(repoRoot, ".DFM", "cache", "thumbs")`) |
| API-путь | `.DFM/cache/thumbs` — скрыт от `workdir.entries` / `tree` как всё `.DFM/` |
| Что | PNG ответа `kind: image` после ffmpeg |
| Имя файла | хэш ключа workdir (например SHA-256 от `relPath + size + mtime`) + `.png` |
| Кто пишет | **Wails backend**: miss на диске → `workdir.thumbnail` → записать PNG; hit → отдать frontend без повторного ffmpeg |
| Не писать | text, placeholder, blend (OS/TEST уже на диске ОС), blob ревизии |

Clean repository удаляет `.DFM/` целиком — кэш уходит вместе с репо. Так и нужно.

Не класть кэш в `~/.dfm/` по умолчанию (несколько репо, копии проекта).

Контракт JSON API в 0.8.1 не расширять ради этого слоя.

### Протокол тайла (workdir)

```text
tile visible
  → memory hit? показать
  → kind ожидания image (расширение картинки) и disk hit? показать, прогреть memory
  → workdir.thumbnail
       image (ffmpeg) → memory + disk
       image (blend)  → memory only
       text           → memory
       placeholder    → memory (без ретрая)
```

Blend и текст диск-слой пропускают.

### Инвалидация

| Событие | Действие |
|---------|----------|
| Watcher / запись файла | сбросить memory (и disk-файл) **этого** rel path, не всю папку |
| `workdir.rename` | перенести ключ на `new_path`; старый path выкинуть |
| `workdir.delete` | выкинуть ключ |
| Смена repo | сброс memory; disk другого корня не читать |
| Clean repository | каталог `.DFM/cache/thumbs/` исчезает с `.DFM/` |

Watcher **игнорирует** запись в `.DFM/cache/` — иначе запись эскиза снова инвалидирует сетку.

---

## Правила GUI

1. Запрашивать thumbnail **лениво** (видимые тайлы / virtualizer, 1–2 ряда overscan). Не греть всю папку `limit=200` сразу. [virtual-scroll.md](../gui_frontend/virtual-scroll.md).
2. Параллелизм: очередь 1–2, не штурм API.
3. Пока нет ответа — состояние тайла `loading` (спека), не спиннер вне макета.
4. `placeholder` и ошибка выглядят одинаково как empty preview из макета; текст ошибки API в сетку не писать.
5. После `workdir.rename` / внешнего watcher — сбросить кэш по старому path (см. таблицу инвалидации).
6. Не добавлять подписи вроде «preview 2 of 3» или отладочные MIME-лейблы.
7. Не рендерить эскиз в React/canvas из полного файла. Не класть PNG в `.DFM/objects` и не коммитить кэш.
8. Не держать три копии одних байт (Zustand base64 + IndexedDB + диск). Disk + blob URL в memory достаточно.
