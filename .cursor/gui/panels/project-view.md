# Panel / Project view

Левая колонка проекта: ветка, uncommitted, список коммитов. **Не** `View / Project view / …`.

Figma: [Panel / Project view](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4246-5052) (`4246:5052`).  
Код: `ProjectViewPanel`. **309×720**.

---

## Слоты сверху вниз (все варианты)

Каркас один. Меняется только **Commit List**. Слот Uncommitted — всегда [Item / Card Directory](../components/items/sidebar-card-directory.md), не `Item / Card`.

| Y | Кирпич | Спека |
|---|--------|-------|
| 0 | Header Select Branch 309×64 | [header-select-branch](../components/items/header-select-branch.md) |
| 64+0 | **Item / Card Directory** 285×116 | [sidebar-card-directory](../components/items/sidebar-card-directory.md) + [UncommittedFilesCard](../components/atoms/card-directory.md) |
| 64+116 | Tabs 285×40 (Header 64) | shadcn Tabs, copy из node |
| 64+180 | Commit List 285 | см. варианты |
| 660 | Header Settings 309×60 | [header-settings](../components/items/header-settings.md) |

Padding колонки: 12 px горизонталь.

---

## Варианты панели

| Figma | Node | Card Directory (под веткой) | Commit List |
|-------|------|------------------------------|-------------|
| Project view | [`4246:5052`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4246-5052) | Selected, dashed `#60a5fa` / `#eff6ff` | стек **Item / Card** + [CommitProjectCard](../components/atoms/card-commit-project.md) |
| Project view - History Null | [`4309:6979`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4309-6979) | Selected, dashed `#60a5fa` / `#eff6ff`; атом `Un Changed` | один **Item / Card** 285×72, Disable + [NoHistoryProject](../components/atoms/card-no-history-project.md) |
| Project view - Folder DFM Null | [`4385:8756`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4385-8756) | Selected, dashed `#60a5fa` / `#eff6ff`; атом `Un Changed` | **не** Card: [NullRepositoryPlaceholder](../components/items/placeholder-null-repository.md) 269×124 |

Empty истории и empty репозитория **не** заменяют Card Directory. No History и Null Repository живут только в Commit List.

Трёхколоночная сборка: [../views/project-browse.md](../views/project-browse.md).

Данные: `branch.list`, `status.get`, `log.get`, `stash.list`. Панель не читает диск.

Commit List при длинной ветке — virtualizer + догрузка `log.get` по `capped`, без текста пагинации. `diff.stat` — только видимые карточки. [virtual-scroll.md](../gui_frontend/virtual-scroll.md), [revision-cache.md](../gui_frontend/revision-cache.md).

Вкладка **Stash** (Figma Stages) — тот же virtualizer; список из `stash.list`, не из `status.get.staged_*`. Пустой список — один **Item / Card** Disable + [NoStagesProject](../components/atoms/card-no-stages-project.md). Сборка окна тогда [Stashes Null](../views/project-browse.md) (`6035:12553`): центр — Folder Empty, не сетка рабочей папки.
