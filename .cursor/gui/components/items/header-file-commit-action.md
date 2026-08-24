# Header File Commit Action

Figma: [Item / Panel / Header / File Commit Action](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4318-4095) (`4318:4095`).  
Код: `HeaderFileCommitAction`. 355×60.

Шапка превью **этого файла** в выбранном коммите, не workdir и не revert всего коммита.

---

## Слоты

| Слот | Вид | Действие |
|------|-----|----------|
| Back | outline 40×40, `chevron-left` | назад к [File View](../../views/file-preview.md) (снять выбор ревизии) |
| Имя | basename path | |
| Compare | outline, copy `Compare` | сравнение **этого файла** с ревизией: `compare.extract` + открыть path в tmp_review (`workdir.open` с `.DFM/tmp_review/…`) |
| Revert | primary, copy `Revert` | вернуть **этот path** из коммита: `restore.file` с `paths: [path]`. Destructive — подтверждение из макета, не `window.confirm` |

Не `commit.revert` (весь коммит) и не `restore.version` (всё дерево) с этой шапки.
