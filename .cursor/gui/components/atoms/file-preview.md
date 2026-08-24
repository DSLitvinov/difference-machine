# File Preview

Кастомный атом. Не путать с [grid-file](../items/grid-file.md) (тайл целиком) и с [preview-file-info](../items/preview-file-info.md) (квадрат 308 + бейджи).

Figma: [Atom / File Preview](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4191-6503) (`4191:6503`).  
Код: `FilePreview`. Property: `size`.

Атом **не** вызывает API. Панель передаёт `src` превью (из `workdir.thumbnail` / `blob.get` после virtualizer) или пусто. Когда грузить: [virtual-scroll.md](../../gui_frontend/virtual-scroll.md).

---

## Варианты (`size`)

| `size` | Размер | Радиус | Токен |
|--------|--------|--------|-------|
| `S` | **48×48** | 4 px | `Radius/radius-sm` |
| `M` | **128×128** | 4 px | `Radius/radius-sm` |
| `L` | **312×312** | 12 px | `Radius/radius-lg` |

Общее: фон `Background/default` `#ffffff`, обводка `1px solid Border/default` `#e4e4e7`. Содержимое — изображение на весь квадрат (`object-cover`), либо моноширинный фрагмент `text_preview` (клип, без скролла), либо пустой холст.

`L` в сетке не используется (ни атом 312, ни `radius-lg`). В наборе: grid item `S` (Min) и `M` (Max). В **панели** обзора папки default — `S` **48×48**; Ctrl/Cmd+wheel растит квадрат с `minTrack`, радиус как у S/M (4 px). `L` — только info (рамка 308).

---

## Состояния

В наборe **нет** hover / selected / loading. Это оболочка картинки.

| Состояние | Поведение |
|-----------|-----------|
| default | рамка + fill |
| нет эскиза | пустой белый квадрат, без текста |
| loading | тот же квадрат; spinner только если он есть у родителя в макете — **не** внутри атома |
| broken | как нет эскиза, не «Error» |

---

## shadcn/ui

Базы нет. Обычный `div` + `img`. Не `Avatar`, не `Card`.

Иконку-заглушку типа файла (image / text / binary) рисует родитель ([preview-file-info](../items/preview-file-info.md)), не этот атом.

---

## Запрещено

- Свои size кроме S/M/L.
- Подпись, бейдж, lock внутри атома.
- `rounded-full`.
