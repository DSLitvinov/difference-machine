# Headers панелей

Кирпичи шапки колонок. Не chrome всего окна (`View /`). База: shadcn Button / Dropdown.

Высота ряда обычно **60–64 px**, ширина колонки 309 / 332 / hug content.

| Figma | Node | Код | Состав |
|-------|------|-----|--------|
| Select Branch | `4309:5686` | `HeaderSelectBranch` | 309×64, внутри `.Sidebar Item` 285×40 (селектор ветки/репо) |
| Settings | `4335:19965` | `HeaderSettings` | 309×60, низ левой колонки |
| Right Side | `4309:9246` | `HeaderRightSide` | 308×60, шапка info |
| Folder Action | `4315:11409` | `HeaderFolderAction` | `Collapse=no` 554×60 / `Collapse=yes`; слот [folder-action](./folder-action.md) |
| File Action | `4318:3832` | `HeaderFileAction` | Collapse no/yes, 673×60 |
| File Commit Action | `4318:4095` | `HeaderFileCommitAction` | 355×60 |
| Commit Info | `4322:4537` | `HeaderCommitInfo` | 355×90 |
| Window | `4423:10574` | `HeaderWindow` | 640×48, шапка диалога/окна first-start, не app View |

Спеки по файлам ниже — один набор = один `get_design_context` при вёрстке. Не добавлять title колонки, которого нет в хедере.

Collapse: прячет/сжимает content view, не меняет JSON API.
