# No Stages Project

Empty вкладки **Stash** (в Figma слой `Stages` / `No Stages Project`). Это **Forester stash**, не git index `staged_*` и не [No History Project](./card-no-history-project.md). Кадр окна: [Stashes Null](../../views/project-browse.md) (`6035:12553`).

Figma: [Atom / Cards / No Stages Project](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=6020-12733) (`6020:12733`).  
Код: `NoStagesProject`.

Ширина 245 px. Stack gap 4 px внутри контейнера. Те же стили, что у No History Project. Слой Figma говорит Stage — в UI **Stash**.

| Строка | Копирайт | Стиль |
|--------|----------|-------|
| Title | `No stash of project` | Inter Medium 16/24 `#09090b` |
| Body | `The project is not added to any stash` | Inter Regular 14/20 `#71717a` |

Нет кнопки, иконки, hover. Оболочка — [SidebarCard](../items/sidebar-card.md) Disable. Если `stash.list` пуст — этот атом, **не** мок `StageCard`.

---

## Запрещено

- Copy про history / commit.
- Фейковые строки «Stash №1» / «Stage №1».
- Spinner вместо этого блока, если список пуст.
- Писать **Stage** / **Stages** в UI.
