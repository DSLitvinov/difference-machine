# View / Project view / File View

Семейство: открыт **один файл workdir**. Left — [Panel / File view](../panels/file-view.md) (история этого path). Center — [Content View File](../panels/content-view.md). Right — File Info или скрыта.

Не обзор сетки ([project-browse.md](./project-browse.md)). Не diff коммита проекта ([commit.md](./commit.md)).

Каркас: [architecture.md](./architecture.md).

---

## Когда

Пользователь открыл файл из сетки (open / double-click по макету хедера).  
`contentContext = file`. Left больше не Project view: [Panel / File view](../panels/file-view.md) (`4309:7530` или History Null `4309:9019`). Слоты left — в спеке панели, не дублировать геометрию здесь.

Kind центральной области — по типу файла, не по расширению «на глаз», если API/превью уже классифицировали text / image / binary.

---

## Варианты

| Figma | Node | Kind | Info | Center |
|-------|------|------|------|--------|
| File View - IMG | [`4246:6471`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4246-6471) | image | File Info 332 | File Expanded 788: [Content / View / Img](../components/items/content-view.md) |
| File View - IMG ( Collapse ) | [`4276:7423`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4276-7423) | image | нет, center 1120 | File Collapse |
| File View - Text | [`4290:23880`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4290-23880) | text | File Info 332 | File Expanded: [Content / View / Text](../components/items/content-view.md) (в кадре — split-строки) |
| File View - Text ( Collapse ) | [`4383:8492`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4383-8492) | text | нет | File Collapse 1120 |
| File View - Binary | [`4383:8072`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4383-8072) | binary | File Info 332 | File Expanded: [Content / View / Binary](../components/items/content-view.md) + [diff-binary](../components/placeholders/diff-binary.md) |
| File View - Binary ( Collapse ) | [`4383:8927`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4383-8927) | binary | нет | File Collapse 1120 |
| File View - No History | [`4276:8492`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4276-8492) | любой; в кадре Img | File Info 332 | File Expanded; **left** = File view - History Null + [NoHistoryFile](../components/atoms/card-no-history-file.md) |

Кадр Text Expanded в Figma **720** по высоте окна (тело 672) — считать отклонением; канон окна **768 / тело 720**, как у остальных File View.

Хедер центра: [Header File Action](../components/items/header-file-action.md) — combobox действий + **Apply**. Не третья кнопка Save.

---

## Правила

1. Collapse — то же измерение `infoCollapsed`, что у обзора папки.
2. No History — `fileHasHistory = false` (`log.get` с `path` пуст). Превью файла всё равно показывается. Не подменять центр плейсхолдером истории.
3. Кадр No History использует Img-превью как пример; kind в продукте остаётся у открытого файла.
4. Данные left: `log.get` + `path`. Не `workdir.tree`.

---

## Переходы

| Действие | Куда |
|----------|------|
| Back `<` в Header File Action | [project-browse](./project-browse.md) текущей папки |
| Current preview | остаёмся на [file-preview](./file-preview.md) (уже Selected) |
| Клик коммита в History of file | [file-history.md](./file-history.md) |
| Collapse / expand info | Collapse-вариант того же kind |
