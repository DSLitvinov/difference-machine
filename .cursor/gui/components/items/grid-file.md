# Grid View File

Тайл файла в сетке. Собирает [FilePreview](../atoms/file-preview.md) + [FileStatusBadge](../badge-file-status.md).

Figma: [Item / Grid View / File](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4191-6507) (`4191:6507`).  
Код: `FileGridTile`. Properties: `state` (Default \| Hover \| Selected), `Size` (Min \| Max), `Lock` (No \| Yes). Boolean `status` — letter-бейдж.

Не путать с [list-file](./list-file.md) и с [preview-file-info](./preview-file-info.md).

---

## Комбинации

12 вариантов = 3 state × 2 size × 2 lock. Один компонент, не 12 файлов.

| Size | Превью | Ячейка (Default Min) |
|------|--------|----------------------|
| Min | `FilePreview` **S** 48×48 | min 106×106, padding 8, ширина 106 |
| Max | `FilePreview` **M** 128×128 | padding 8; бейджи по нижнему краю превью |

Подпись: `File name`, Inter Regular 12/16 `#09090b`, ellipsis, nowrap. Min — `text-center` на всю ширину; Max — как в кадре (не центрировать за счёт выдуманного width).

Gap превью↔лейбл: 8 px.

---

## Бейджи на превью

Слой `Status` поверх превью, не внутри `FilePreview`.

| Lock | Letter | Раскладка |
|------|--------|-----------|
| No | один letter, если `status` | Min: left 14 / top 24 на 48-превью; Max: ближе к низу (top 100 на 128) |
| Yes | letter + lock, **два** экземпляра FileStatusBadge | Min: gap 2, слева внизу превью; Max: letter слева, lock справа по ширине 112 |

Нет статуса — не рендерить letter. Lock=Yes без letter — только lock. Порядок: letter затем lock.

---

## State

| `state` | Фон | Обводка | Радиус |
|---------|-----|---------|--------|
| Default | нет | нет | — |
| Hover | `Background/accent/light` `#eff6ff` | нет | 8 px (`radius-md`) |
| Selected | `#eff6ff` | `1px solid Border/accent/default` `#60a5fa` | 8 px |

Бейджи **не** меняются при hover/selected.

---

## Данные

Thumbnail → `FilePreview`. Letter/lock — из панели (`status.get`, `lock.list`). Клик — selection, не `workdir.open` (open — действие тулбара/меню).

---

## Запрещено

- Size L в сетке.
- Счётчик файлов на тайле файла.
- Серый hover `#f4f4f5` от list item.
