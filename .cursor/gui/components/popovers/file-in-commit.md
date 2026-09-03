# Popover File in Commit

Figma: [Popover (File in Commit)](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4272-11286) (`4272:11286`).  
Код: `FileInCommitMenu`. 217 px.

Меню строки файла **ревизии**, не workdir. Не копировать пункты [file-preview-item](./file-preview-item.md). Дочерний [file-in-commit-copy](./file-in-commit-copy.md) — подменю Copy.

Открывается ПКМ по строке в [Content / File list](../items/content-file-list.md) на [View Commit](../../views/commit.md). Open / Revert выбранного path также в шапке [commit-diff-*](../items/commit-diff-text.md) (copy `Compare` / `Revert`).

---

## Секция действий

| Иконка | Copy | |
|--------|------|--|
| external-link | `Open file from commit` | `compare.extract` + `workdir.open` `.DFM/tmp_review/…` |
| replace | `Revert file from commit` | `restore.file` с `paths: [path]`. Destructive — подтверждение |
| copy + chevron-right | `Copy path` | подменю [file-in-commit-copy](./file-in-commit-copy.md) |

## После separator

`trash-2` + `Delete in history`, `#ef4444` → `commit.delete_file` (`commit_hash` + `path`). Убирает файл из снимка этого коммита и потомков на текущей ветке; workdir не трогает.

Disabled, если статус строки `D` (файла уже нет в дереве). Не путать с `Delete in project` в [file-preview-item](./file-preview-item.md): history-пункт живёт только здесь.
