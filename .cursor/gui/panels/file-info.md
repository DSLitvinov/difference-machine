# Panel / File Info

Правая колонка метаданных файла. 332×720.

Figma: [Panel / File Info](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4309-9390) (`4309:9390`).  
Код: `FileInfoPanel`.

---

## Слоты

1. [Header Right Side](../components/items/header-right-side.md) 332×60.
2. [FileInfoPreview](../components/items/preview-file-info.md) 308×308, padding 12.
3. Секция `Metadata` (заголовок как в макете). Пары label 120 / value 188, шаг 24:

| Label | Пример |
|-------|--------|
| Name | Filename |
| Dimensions | 1280x720 |
| Size | 3 MB |
| Type | PNG |
| Locked | Dmitry |
| Editor | Dmitry |
| Creator | Dmitry |
| Created | 12.12.2025 02:12 |
| Modified | 03.02.2026 14:26 |

Не добавлять строки (path, hash, permissions), которых нет. Источник: `workdir.metadata`, `lock.list`.

4. Кнопка `Create commit Button` 308×36 внизу контейнера.

---

## Варианты

| Figma | Node |
|-------|------|
| File Info | `4309:9390` |
| File Info - Null | `4382:8024` — [not-select-file](../components/placeholders/not-select-file.md) |
| Select More Files | `4383:9620` — [preview-file-info-more](../components/items/preview-file-info-more.md) |
