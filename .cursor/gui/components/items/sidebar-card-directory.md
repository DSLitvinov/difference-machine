# Sidebar Card Directory

Оболочка блока **Uncommitted files** под селектором ветки. Отдельный набор от [Item / Card](./sidebar-card.md): не подменять Card Directory на Card и наоборот.

Figma: [Item / Card Directory](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=6004-10960) (`6004:10960`).  
Код: `SidebarCardDirectory`. Property: `state` (Default \| Hover \| Selected \| Disable).

Те же четыре state, что у Card (фон / border / тень — как в [sidebar-card](./sidebar-card.md)). Ширина оболочки 269 px; в панели слот **285** px (padding колонки 12).

В Figma слот — [Swapper](../atoms/swapper.md). В коде всегда [UncommittedFilesCard](../atoms/card-directory.md) (`Atom / Cards / Directory`).

---

## Где стоит

Во всех вариантах [Panel / Project view](../../panels/project-view.md), сразу под [Header Select Branch](./header-select-branch.md), **до** Tabs:

| Панель | Node | Оболочка Card Directory | Атом Directory |
|--------|------|-------------------------|----------------|
| канон | `4246:5052` | Default (или по данным dirty) | Un Changed / Changed по `status.get` |
| History Null | `4309:6979` | Selected (`#eff6ff`, border `#60a5fa`) | `Un Changed` |
| Folder DFM Null | `4385:8756` | Disable (`#f4f4f5`, border `#e4e4e7`) | `Un Changed` |

Не класть Uncommitted files в `SidebarCard` (`4191:5809`). Не класть Commit Project / No History / Null Repository внутрь Card Directory.

No History и Null Repository — только Commit List, см. [project-view](../../panels/project-view.md).

---

## Запрещено

- Слить с `SidebarCard` «геометрия почти та же».
- Оставить Swapper / teal в UI.
