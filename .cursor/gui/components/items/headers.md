# Headers панелей

Кирпичи шапки колонок. База: shadcn Button / Dropdown. Шапка всего окна — [header-window.md](./header-window.md), не этот список.

Высота ряда обычно **60–64 px**, ширина колонки 309 / 332 / hug content.

| Figma | Node | Код | Состав |
|-------|------|-----|--------|
| Select Branch | `4309:5686` | `HeaderSelectBranch` | 309×64: список веток + Create / Rename / Delete |
| Settings | `4335:19965` | `HeaderSettings` | 309×60: [аватар](./header-settings.md) + help (неактивна) + вызов Settings |
| Right Side | `4309:9246` | `HeaderRightSide` | свернуть info (`panel-right-close`) |
| Folder Action | `4315:11409` | `HeaderFolderAction` | search / sort / filter; Collapse=yes + открыть info |
| File Action | `4318:3832` | `HeaderFileAction` | back, combobox действий, **Apply** |
| File Commit Action | `4318:4095` | `HeaderFileCommitAction` | Compare / Revert **файла** |
| Commit Info | `4322:4537` | `HeaderCommitInfo` | 355×90, без кнопок мутаций |
| Window | `4423:10574` | native chrome + application menu | File / Edit / Repository / Window; кнопки окна — ОС |

Спеки по файлам ниже — один набор = один `get_design_context` при вёрстке. Не добавлять title колонки, которого нет в хедере.

Collapse: `infoCollapsed` — прячет правую колонку, не меняет JSON API.
