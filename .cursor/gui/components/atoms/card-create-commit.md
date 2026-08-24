# Create Commit Card

Форма создания коммита в сайдбаре. Не модальный Dialog Settings.

Figma: [Atom / Cards / Create Commit](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4385-9476) (`4385:9476`).  
Код: `CreateCommitCard`.

Ширина 245 px. Stack gap 12 px. База: shadcn `Textarea` + `Button`.

---

## Поля (сверху вниз)

Три textarea, каждая высота 77 px в наборе, radius 8 px, border `#e4e4e7`, padding 16 px, placeholder Inter Regular 14/20 `#71717a`, resize-handle в углу.

| Порядок | Placeholder |
|---------|-------------|
| 1 | `Write commit...` |
| 2 | `Tag, tag...` |
| 3 | `Description...` |

Не добавлять видимые `<Label>` — в макете только placeholder.

---

## Footer

Справа, gap 8 px, кнопки height 40, radius 8, shadow-sm.

| Кнопка | Вид | Текст |
|--------|-----|-------|
| Cancel | outline, bg white, border `#e4e4e7`, текст `#09090b` | `Cancel` |
| Create | primary `#18181b`, текст `#fafafa` | `Create` |

Disabled Create — только если так появится в вариантах Figma; сейчас варианта disabled нет. Пустое сообщение — валидация до API, не выдуманный серый стиль кнопки.

Успех: `index.add` при необходимости → `commit.create`. Атом шлёт колбэки, не `Call`.

---

## Запрещено

- Четвёртое поле author (автор из cfg).
- Amend-чекбокс, если его нет в этом атоме.
