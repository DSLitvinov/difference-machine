# Sidebar Card Directory

Оболочка блока **Uncommitted files** под селектором ветки и форма Create Commit (слева при all files, справа при selection). Отдельный набор от [Item / Card](./sidebar-card.md): не подменять Card Directory на Card и наоборот.

Figma: [Item / Card Directory](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=6004-10960) (`6004:10960`).  
Код: `SidebarCardDirectory`. Property: `state` (Default \| Hover \| Selected \| Disable). Disable в продукте — **только** Create Commit **selection**: серая заливка `#f4f4f5`, dashed `#e4e4e7`, не кликабельна. Create Commit **all files** — Selected, не Disable. Не ставить Disable на обзор папки и Current preview.

Ширина оболочки 269 px; в панели слот **285** px (padding колонки 12). Padding 12, radius 8 (`rounded-md`), gap 8.

**Border всегда dashed** на Default / Hover / Selected / Disable — это отличие от [Item / Card](./sidebar-card.md) (там solid, кроме Current preview). Не брать `border-solid` из Card.

| `state` | Фон | Border | Тень |
|---------|-----|--------|------|
| Default | `Background/card` white | `#e4e4e7` **dashed** | shadow-sm |
| Hover | white | `#60a5fa` **dashed** | shadow-sm |
| Selected | `#eff6ff` | `#60a5fa` **dashed** | нет |
| Disable | `Background/muted` `#f4f4f5` | `#e4e4e7` **dashed** | нет |

В Figma слот — [Swapper](../atoms/swapper.md). В коде слева: [UncommittedFilesCard](../atoms/card-directory.md) (`Atom / Cards / Directory`); при Create Commit all files — [CreateCommitCard](../atoms/card-create-commit.md). Справа при Create Commit / single file — CreateCommitCard.

---

## Где стоит

Во всех вариантах [Panel / Project view](../../panels/project-view.md), сразу под [Header Select Branch](./header-select-branch.md), **до** Tabs:

| Панель | Node | Оболочка Card Directory | Атом Directory |
|--------|------|-------------------------|----------------|
| канон | `4246:5052` | **Selected**, dashed `#60a5fa` / `#eff6ff` | Un Changed / Changed по `status.get` |
| History Null | `4309:6979` | Selected, dashed | `Un Changed` |
| Folder DFM Null | `4385:8756` | Selected, dashed | `Un Changed` |
| Create Commit all files | `6076:15959` | **Selected**, dashed `#60a5fa` / `#eff6ff` | нет: Swapper = CreateCommitCard |

Пока пользователь смотрит сетку папки (не inspect коммита проекта), Card Directory **Selected**. Inspect коммита снимает Selected (клик по карточке возвращает в обзор). Create Commit **selection**: оболочка **Disable**, атом Directory остаётся, `Сommit all files` inactive. Create Commit **all files**: оболочка **Selected**, атом Directory заменяется формой.

Не класть Uncommitted files в `SidebarCard` (`4191:5809`). Не класть Commit Project / No History / Null Repository внутрь Card Directory.

No History и Null Repository — только Commit List, см. [project-view](../../panels/project-view.md).

---

## Запрещено

- Слить с `SidebarCard` «геометрия почти та же».
- Solid border на любом state.
- Disable вне Create Commit **selection**.
- Disable на Create Commit all files.
- Оставить Swapper / teal в UI.
