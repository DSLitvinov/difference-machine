# View / Project view / History of File

Семейство: пользователь выбрал **коммит в истории файла**. Сравнивается этот path в ревизии с workdir / родителем — по контролам хедера.

Имя в Figma: `View / Project view / Histpry of File - …` (опечатка). В коде и прозе — History of File.

Не [file-preview.md](./file-preview.md) (текущий файл без выбранной ревизии).  
Не [commit.md](./commit.md) (коммит проекта, список всех path).

Каркас: [architecture.md](./architecture.md).

---

## Когда

`contentContext = file-revision`. Left остаётся [Panel / File view](../panels/file-view.md). Right **нет** (center 1120). Хедер центра — [Header File Commit Action](../components/items/header-file-commit-action.md): **Compare** и **Revert этого файла** (не всего коммита).

---

## Варианты

| Figma | Node | Kind | Center |
|-------|------|------|--------|
| Histpry of File - Image | [`4268:5493`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4268-5493) | image | [History of File](../panels/content-view.md) + [commit-diff-image](../components/items/commit-diff-image.md): `2-up` / `Swipe` / `Overlay`, `After` / `Before` |
| Histpry of File - Text | [`4290:22913`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4290-22913) | text | History of File + [commit-diff-text](../components/items/commit-diff-text.md): `Unified` / `Split` |

Кадр Image в Figma: left 333 / center 1096. Реализация: **309 / 1120** по канону колонок.

Binary-ревизии файла отдельным View нет. Пока нет ответа на вопрос 5 в [architecture.md](./architecture.md) — не выдумывать экран; для binary можно оставить File View Binary или показать [diff-binary](../components/placeholders/diff-binary.md) в том же каркасе History of File без нового chrome.

---

## Данные

- Diff текста: `diff.text` с `path` и выбранным коммитом.
- Картинка ревизии: `blob.get`.
- Не вызывать `diff.name_status` всего дерева ради одного файла. LRU: [revision-cache.md](../gui_frontend/revision-cache.md).
- Compare: `compare.extract` + open tmp_review для этого path.
- Revert файла: `restore.file`. Destructive — через [диалог](../dialogs/architecture.md).

---

## Переходы

| Действие | Куда |
|----------|------|
| Back to file / снять выбор коммита | [file-preview](./file-preview.md) |
| Другой коммит в left | тот же семейство, другой hash |
