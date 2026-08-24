# View / Project view / View Commit

Семейство: пользователь выбрал **коммит в истории проекта**. Center — состав коммита и diff одного path. Left — [Panel / Project view](../panels/project-view.md). Right **нет**.

Не история одного файла ([file-history.md](./file-history.md)): там хедер File Commit Action, здесь — [Header Commit Info](../components/items/header-commit-info.md) плюс [Content / File list](../components/items/content-file-list.md).

Каркас: [architecture.md](./architecture.md).

---

## Когда

`contentContext = commit`. Клик по [CommitProjectCard](../components/atoms/card-commit-project.md) на вкладке History. Center 1120: панель [Content View / History of File](../panels/content-view.md) в варианте **commit inspect** (не file-revision).

---

## Слоты центра (все три кадра)

1. Header Commit Info 1100×90: Head / message / author / hash / `Files changed` / `+` / `-`.
2. Слева узкий [file list](../components/items/content-file-list.md) — [CommitFileItem](../components/atoms/commit-file-item.md) на каждый path (`diff.name_status`).
3. Справа превью выбранного path.

---

## Варианты (по kind выбранного path)

| Figma | Node | Превью path |
|-------|------|-------------|
| View Commit - Binary | [`4272:6624`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4272-6624) | [diff-binary](../components/placeholders/diff-binary.md) |
| View Commit - Text | [`4290:24338`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4290-24338) | [commit-diff-text](../components/items/commit-diff-text.md) Unified/Split |
| View Commit - Img | [`4306:3027`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4306-3027) | [commit-diff-image](../components/items/commit-diff-image.md) 2-up / Swipe / Overlay |

Смена kind — смена правой части, не смена left и не появление File Info.

---

## Данные

- Список path: `diff.name_status` с `to` = выбранный hash.
- Статистика хедера: `diff.stat` (кэш по hash).
- Текст: `diff.text`. Картинка: `blob.get`.

Кадра «коммит выбран, path в списке нет» в Figma нет. Не показывать пустой центр с выдуманным copy. Пока нет ответа на вопрос 4 в [architecture.md](./architecture.md) — выбрать первый path списка (как в трёх кадрах-примерах) **или** ждать явного клика; не добавлять подпись «select a file».

---

## Переходы

| Действие | Куда |
|----------|------|
| Клик другого коммита | тот же семейство, другой hash |
| Снять выбор / Uncommitted / сетка | [project-browse](./project-browse.md) |
| Клик path в file list | тот же экран, другой kind-кадр |
