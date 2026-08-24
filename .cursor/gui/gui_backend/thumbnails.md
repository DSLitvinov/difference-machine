# Превью и эскизы (thumbnails)

Источник превью для сетки и info — JSON API Forester, не локальный рендер в React (кроме отображения уже полученных bytes/text).

Метод: `workdir.thumbnail`. Реализация: `handlers_workdir.go`, ffmpeg-пайплайн, `blend_thumbnail.go`.  
Исторические blob: `blob.get` (байты файла в коммите, не уменьшенный эскиз).

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

---

## Картинки

Расширения: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.exr`, `.tiff`, `.tif`, `.bmp`.

Пайплайн: системный/бандленный ffmpeg → PNG в pipe. Нет ffmpeg или ошибка → `placeholder` (не падение всей сетки).

Frontend: `content_base64` → `data:` URL или blob URL. Кэшировать по `path` + `modified` из entries/metadata.

---

## `.blend`

Порядок в Forester:

1. Кэш миниатюр Blender (Freedesktop thumbs, large затем normal).
2. Встроенный chunk `TEST` в blend-файле.

Успех → `kind: image`, `mime: image/png`.  
Нет кэша и нет chunk → GUI рисует **placeholder** (иконка типа файла по макету), не запускает Blender для рендера кадра.

---

## Текст

Расширения (полный список в `isTextExt`): `.txt`, `.md`, `.json`, `.xml`, `.svg`, `.tsx`, `.ts`, `.js`, `.jsx`, `.go`, `.py`, `.rs`, `.css`, `.html`, `.yaml`, `.yml`, `.ini`, `.cfg`, `.sh`.

Показ: моноширинный фрагмент `text_preview`. Не подгружать весь файл вторым запросом, если thumbnail уже отдал preview.

---

## История коммита (не workdir)

`blob.get` отдаёт содержимое blob ревизии (base64, до 5 MiB). Для картинок в History — декодировать как файл; уменьшать на frontend только для отображения, либо использовать как полное превью.

`commit.get` может вернуть `screenshot_base64` снимка коммита.

`diff.text` с `is_binary: true` — не пытаться показать unified diff; UI бинарного diff по макету (stub).

---

## Правила GUI

1. Запрашивать thumbnail **лениво** (видимые тайлы / virtualizer). Не греть всю папку `limit=200` сразу, если спека это не требует.
2. Параллелизм ограничивать на frontend: API под mutex, очередь важнее «все сразу».
3. Пока нет ответа — состояние тайла `loading` (спека), не спиннер вне макета.
4. `placeholder` и ошибка выглядят одинаково как empty preview из макета; текст ошибки API в сетку не писать.
5. После `workdir.rename` / внешнего watcher — сбросить кэш по старому path.
6. Не добавлять подписи вроде «preview 2 of 3» или отладочные MIME-лейблы.
