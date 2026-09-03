# Header File Commit Action

Figma: [Item / Panel / Header / File Commit Action](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4318-4095) (`4318:4095`).  
Код: `HeaderFileCommitAction`. 355×60.

Шапка превью **этого файла** в выбранном коммите, не workdir и не revert всего коммита.

---

## Слоты

| Слот | Вид | Действие |
|------|-----|----------|
| Back | outline 40×40, `chevron-left` | назад к [File View](../../views/file-preview.md) (снять выбор ревизии) |
| Имя | basename path, по центру оставшейся ширины | |

Compare / Revert **этого path** — не здесь, а в шапке [commit-diff-image](./commit-diff-image.md) / [commit-diff-text](./commit-diff-text.md) / [commit-diff-binary](./commit-diff-binary.md). На View Commit хедера File Commit Action нет.

Не `commit.revert` (весь коммит) и не `restore.version` (всё дерево) с этой шапки.
