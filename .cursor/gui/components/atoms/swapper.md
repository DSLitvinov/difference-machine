# Atom / Swapper (слот Figma)

Бирюзовая заливка в макете — **не UI**. В коде Swapper **не существует**: instance заменяется нужным содержимым родителя.

Figma: [Atom / Swapper](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4219-12826) (`4219:12826`).  
Код: **нет**. Не `ImageDiffSwapper`, не `div` с `rgba(42,157,144,0.1)`.

Кадр 269×216 в наборе задаёт только место слота. Размер в продукте — hug родителя.

---

## Куда что подставлять

| Родитель в Figma | В коде вместо Swapper |
|------------------|------------------------|
| [Item / Card](../items/sidebar-card.md) | атом карточки: [Commit Project](./card-commit-project.md), [Commit File](./card-commit-file.md), [Stage](./card-stage.md), [No History …](./card-no-history-project.md), [No Stages Project](./card-no-stages-project.md), [Back to file](./card-back-to-file.md) |
| [Item / Card Directory](../items/sidebar-card-directory.md) | [UncommittedFilesCard](./card-directory.md); Create Commit all files слева — [CreateCommitCard](./card-create-commit.md); Create Commit / single file справа — тот же CreateCommitCard |
| [Item / Commit / Diff / Image](../items/commit-diff-image.md) Tab Swipe | реальный swipe (два кадра + ручка), не teal-слой |

Если в Figma внутри карточки виден только Swapper — смотреть, какой атом карточки кладёт **панель**, не копировать заливку.

---

## Запрещено

- Компонент, CSS-переменная или токен «swapper».
- Оставлять пустой слот или placeholder-цвет в UI.
- Путать Swapper с shadcn `Card`.
