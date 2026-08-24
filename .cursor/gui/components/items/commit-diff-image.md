# Commit Diff Image

Блок сравнения картинок. Табы — variants, не отдельные компоненты.

Figma: [Item / Commit / Diff / Image](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4282-21006) (`4282:21006`).  
Код: `ImageDiffViewer`. Property: `Tab`.

| Tab | Смысл | Кирпичи |
|-----|--------|---------|
| `1) 2-up` | два кадра рядом | FilePreview / bitmap |
| `2) Swipe` | один кадр, сравнение жестом | Swapper в макете **заменить** реальным swipe (два bitmap + ручка). Не teal-слой |
| `3) Overlay` | наложение | |
| `4) No commits` | нет родителя (первый коммит): **одно** изображение, табы 2-up / Swipe / Оverlay **disabled** (`#a1a1aa`), без After/Before. Не пустой checker, если есть blob ревизии | |

Размер кадра в наборе ~759×519. Атом не ходит в `blob.get`: панель отдаёт два src (`noCommits` — только after).

Не добавлять пятый режим (onion-skin, checker). Подписи табов — как в Figma (`2-up`, `Swipe`, `Оverlay` с кириллической О, если так в слое).
