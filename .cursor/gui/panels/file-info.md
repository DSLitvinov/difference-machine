# Panel / File Info

Правая колонка метаданных **одного** выбранного файла. 332×720. Когда колонка видна или скрыта — [../views/project-browse.md](../views/project-browse.md).

Figma: [Panel / File Info](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4309-9390) (`4309:9390`).  
Код: `FileInfoPanel`.

---

## Слоты

1. [Header Right Side](../components/items/header-right-side.md) 332×60 — свернуть колонку.
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

4. Футера кнопок нет. Edit и Take snapshot — на карточке файла в [File view](./file-view.md). Create snapshot — пункт меню, диалоги [Append / Create snapshot](../dialogs/commit.md). Не вставлять форму коммита в эту колонку.

---

## Edit

Кнопки Edit в этой панели нет. Тот же список редакторов — **Edit in** на карточке файла в [File view](./file-view.md).

Выпадающий список редакторов из Settings → вкладка External editors (`setup.cfg`, не JSON API). Copy кнопки — `Edit in`, не меню «Правка».

Клик по пункту: `workdir.open` с текущим rel path и `editor` = абсолютный executable или macOS `.app` из cfg. Список пуст — не выдумывать IDE; можно только OS default, если такой пункт есть в макете.

## More

Кнопка сразу открывает [Popover (File Preview Item)](../components/popovers/file-preview-item.md) (`4272:6726`). Выбор пункта **выполняет** действие для текущего path — как [Header File Action](../components/items/header-file-action.md) (включая toggle Ignored / Don't ignore).

Мультивыбор — не эта панель, а [select-more-files](./select-more-files.md).

---

## Варианты

| Figma | Node |
|-------|------|
| File Info | `4309:9390` |
| File Info - Null | `4382:8024` — [not-select-file](../components/placeholders/not-select-file.md); футер нет |
| File Info - Missing | [`6066:13319`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=6066-13319) — [missing-file](../components/placeholders/missing-file.md); превью, metadata и футер нет |
| File Info - single file create snapshot | снят — коммит в [диалогах](../dialogs/commit.md), футера кнопок нет |
| Select More Files | `4383:9620` — отдельная спека |
