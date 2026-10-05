# Sidebar Card Directory

Оболочка блока **Worked directory** под селектором ветки. Отдельный набор от [Item / Card](./sidebar-card.md): не подменять Card Directory на Card и наоборот. Форму коммита сюда не класть.

Figma: [Item / Card Directory](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=6004-10960) (`6004:10960`).  
Код: `SidebarCardDirectory`. Property: `state` (Default \| Hover \| Selected \| Disable).

Ширина оболочки 269 px; в панели слот **285** px (padding колонки 12). Padding 12, radius 8 (`rounded-md`), gap 8.

**Border solid.** Selected — сплошная синяя обводка, не пунктир.

| `state` | Фон | Border | Тень |
|---------|-----|--------|------|
| Default | `Background/card` white | `#e4e4e7` **solid** | shadow-sm |
| Hover | white | `#60a5fa` **solid** | shadow-sm |
| Selected | `#eff6ff` | `#60a5fa` **solid** | нет |
| Disable | `Background/muted` `#f4f4f5` | `#e4e4e7` **solid** | нет |

В Figma слот — [Swapper](../atoms/swapper.md). В коде атом — [UncommittedFilesCard](../atoms/card-directory.md).

---

## Где стоит

Во всех вариантах [Panel / Project view](../../panels/project-view.md), сразу под [Header Select Branch](./header-select-branch.md), **до** Tabs:

| Панель | Node | Оболочка Card Directory | Атом Directory |
|--------|------|-------------------------|----------------|
| канон | `4246:5052` | **Selected**, solid `#60a5fa` / `#eff6ff` | Un Changed / Changed по `status.get` |
| History Null | `4309:6979` | Selected, solid | `Un Changed` |
| Folder DFM Null | `4385:8756` | Selected, solid | `Un Changed` |

Пока пользователь смотрит сетку папки (не inspect коммита проекта), Card Directory **Selected**. Inspect коммита снимает Selected (клик по карточке возвращает в обзор).

Не класть Uncommitted files в `SidebarCard` (`4191:5809`). Не класть Commit Project / No History / Null Repository внутрь Card Directory.

No History и Null Repository — только Commit List, см. [project-view](../../panels/project-view.md).

---

## Запрещено

- Слить с `SidebarCard` «геометрия почти та же».
- Пунктирная обводка. Selected — сплошная синяя.
- Форма коммита внутри оболочки.
- Оставить Swapper / teal в UI.
