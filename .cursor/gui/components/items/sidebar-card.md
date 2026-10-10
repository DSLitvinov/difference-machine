# Sidebar Card (Item / Card)

Оболочка карточки в **списке** (коммиты, стейджи, empty history, back to file). Рамка + слот. В Figma слот — [Swapper](../atoms/swapper.md); в коде — атом из таблицы ниже.

**Не** для блока Worked directory: там [Item / Card Directory](./sidebar-card-directory.md). У обеих оболочек border **solid**. Selected — сплошная синяя обводка.

Figma: [Item / Card](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4191-5809) (`4191:5809`).  
Код: `SidebarCard`. Property: `state` (Default \| Hover \| Selected \| Disable).

Ширина 269 px. Padding 12 px. Radius 8 px (`radius-md`). Gap 8.

---

## Слот контента

| Контекст панели | Атом вместо Swapper |
|-----------------|---------------------|
| Список истории проекта | [CommitProjectCard](../atoms/card-commit-project.md) |
| Список истории файла | [CommitFileCard](../atoms/card-commit-file.md) |
| Stash | [StageCard](../atoms/card-stage.md) |
| Empty stash | [NoStagesProject](../atoms/card-no-stages-project.md) |
| Форма коммита | не этот item: [Dialog / Append и Create snapshot](../../dialogs/commit.md) |
| Empty истории | [NoHistoryProject](../atoms/card-no-history-project.md) / [NoHistoryFile](../atoms/card-no-history-file.md) |
| File view, верх | карточка файла: basename, см. [file-view](../../panels/file-view.md). `BackToFileRow` снят |

Не дублировать padding shadcn `Card` внутри атома и item.

---

## State

| `state` | Фон | Border | Тень |
|---------|-----|--------|------|
| Default | `Background/card` white | `#e4e4e7` solid | shadow-sm |
| Hover / Focus | white | `#60a5fa` 1px и снаружи `#a0c9fc` 2px, без зазора. Одно состояние | shadow-sm |
| Selected | `#eff6ff` | `#60a5fa` solid | нет в кадре |
| Disable | `Background/muted` `#f4f4f5` | `#e4e4e7` solid | нет |

Disable в наборе — не кликабелен. Не снижать opacity контента сверх макета.

Hover и Focus — кадр `hover&focus` карточки (`8101:12210`): системную outline со смещением не рисовать.

Hover сетки (`#eff6ff` без обязательного border на Hover) — другой item.

Карточка файла в [File view](../../panels/file-view.md) и карточки коммитов — solid. Selected — сплошная синяя обводка. Карточка файла **никогда** не Disable.

---

## Связь

[Panel / Project view](../../panels/project-view.md): стек `SidebarCard` **только** в Commit List. Блок под селектором ветки — [Card Directory](./sidebar-card-directory.md).
