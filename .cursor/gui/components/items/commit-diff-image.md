# Commit Diff Image

Блок сравнения картинок. Табы — variants, не отдельные компоненты.

Figma: [Item / Commit / Diff / Image](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4282-21006) (`4282:21006`).  
Код: `ImageDiffViewer`. Property: `Tab`.

| Tab | Смысл | Кирпичи |
|-----|--------|---------|
| `1) 2-up` | два кадра рядом | FilePreview / bitmap |
| `2) Swipe` | один кадр, сравнение жестом | два bitmap одного размера, верхний (After) обрезается слева направо (`clip-path`), ручка тянется. Разделитель `indigo/600` `#4f46e5` 2px, thumb из макета. Не сжимать верхний кадр. Не teal-слой |
| `3) Overlay` | наложение | снизу Before, сверху After; ползунок меняет прозрачность верхнего кадра (влево — After непрозрачен, вправо — виден Before) |
| `4) No commits` | нет родителя (первый коммит): **одно** изображение, табы 2-up / Swipe / Оverlay **disabled** (`#a1a1aa`), без After/Before. **Action (Compare / Revert) остаётся** — откат workdir к этой единственной ревизии, даже если 2-up не из чего собрать. Не пустой checker, если есть blob ревизии | |

---

## Шапка

Табы справа, padding 8. Справа от табов — Action, gap 12 между табами и кнопками (и на `4)`).

| Слот | Вид | Когда |
|------|-----|-------|
| Tabs | 2-up / Swipe / Оverlay | всегда; на `4)` disabled |
| Compare | outline, copy `Compare`, h=40 | всегда, включая `4)` |
| Revert | primary, copy `Revert`, h=40 | всегда, включая `4)` |

Action — те же действия, что у [header-file-commit-action](./header-file-commit-action.md): Compare = `compare.extract` + `workdir.open` `.DFM/tmp_review/…`; Revert = `restore.file` с `paths: [path]`, destructive confirm из макета, не `window.confirm`. Не `commit.revert`. Панель передаёт колбэки, item API не зовёт.

Размер кадра в наборе ~759×519. Атом не ходит в `blob.get`: панель отдаёт два src (`noCommits` — только after).

Не добавлять пятый режим (onion-skin, checker). Подписи табов — как в Figma (`2-up`, `Swipe`, `Оverlay` с кириллической О, если так в слое).
