# Commit Diff Binary

Заглушка бинарного diff.

Figma: [Item / Commit / Diff / Binary Diff](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=6067-13828) (`6067:13828`, `type=1) default`). Внутри — stub `4322:4753`.  
Код: `BinaryDiffStub`. Property: `type`.

| type | Шапка | Тело |
|------|-------|------|
| `1) default` | справа Action; без табов | [placeholders/diff-binary](../placeholders/diff-binary.md) |
| `2) No commits` | справа **то же Action**; без табов | тот же placeholder |

---

## Шапка

Padding 8, кнопки справа, gap 8 между ними. Табов нет. На `2) No commits` шапка **не** пустая: те же Compare / Revert.

| Слот | Вид | Действие |
|------|-----|----------|
| Compare | outline, copy `Compare`, h=40 | `compare.extract` + `workdir.open` `.DFM/tmp_review/…` |
| Revert | primary, copy `Revert`, h=40 | `restore.file` с `paths: [path]`. Destructive confirm из макета |

Те же действия, что у [header-file-commit-action](./header-file-commit-action.md). Не `commit.revert`. Панель передаёт колбэки, item API не зовёт.

Контент совпадает с placeholder — переиспользовать внутри item, не копировать второй copy. Нет hex-dump и «Open in hex editor», если их нет в макете.
