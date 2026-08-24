# Commit Project Card

Карточка коммита в списке истории **проекта**. Не путать с [card-commit-file](./card-commit-file.md) (нет «N files changed») и с [card-stage](./card-stage.md) (нет Head/merge/tag).

Figma: [Atom / Cards / Commit Project](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4279-11417) (`4279:11417`).  
Код: `CommitProjectCard`. Boolean properties: `head`, `merge`, `more`, `tag`.

Ширина в наборе **245 px**. Вертикальный stack, gap 8 px. Атом не вызывает `log.get` / `diff.stat`. Панель отдаёт stats из LRU, когда карточка в viewport ([revision-cache.md](../../gui_frontend/revision-cache.md)). Пока `diff.stat` нет — слот Stats пустой, без «…».

---

## Слоты

| Слот | Вид | Токены |
|------|-----|--------|
| Merge icon | 16×16 `git-merge`, опционально | экспорт Figma |
| Head | shadcn Badge **sm** pill, fill `#18181b`, текст `#fafafa`, «Head» | height 22, px 12 |
| Title | Inter Semi Bold 14/20, `#09090b` | `text-sm/semibold` |
| More | 16×16 `ellipsis-vertical` | открывает [popovers/commit-card](../popovers/commit-card.md) |
| Author | Inter Regular 12/16, `#09090b` | строка под header, gap 4 |
| Description | 12/16, `#71717a`, 2 строки, ellipsis, высота 32 | |
| Stats | `7 files changed` muted; `+ 12` `#047857`; `- 12` `#ef4444`; gap 4 | из `diff.stat` |
| Date | Badge secondary pill `#f4f4f5`, текст `#3f3f46`, «1 week ago» | height 22 |
| Tag | Badge outline pill, border `#e4e4e7`, «Tag» | только если `tag` |

Head / merge / tag / more — не рисовать слот, если boolean false. Не оставлять пустое место иконки merge.

Копирайт «files changed», «Head», «Tag» — как в макете (EN). Relative time — формат из макета, не ISO.

---

## shadcn/ui

Badge **sm** + `rounded-full` здесь **можно**: это pill дизайн-системы, не FileStatusBadge.

Кнопки more — `Button variant="ghost" size="icon"`. Не Card-обёртка с padding Card shadcn, если item-родитель уже даёт рамку ([sidebar-card](../items/sidebar-card.md)).

---

## Запрещено

- Буквы A/M на этой карточке.
- Четвёртая статистика «renames».
- Локализовать Head/Tag.
