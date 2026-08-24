# Panel / File view

Левая колонка **истории файла** (не проекта). Экраны: [../views/file-preview.md](../views/file-preview.md), [../views/file-history.md](../views/file-history.md).

Figma: [Panel / File view](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4309-7530) (`4309:7530`).  
Код: `FileViewPanel`. 309×720.

---

## Слоты сверху вниз (оба варианта)

| Слот | Кирпич |
|------|--------|
| Header Select Branch 309×64 | [header-select-branch](../components/items/header-select-branch.md) |
| Current preview 285×44 | [SidebarCard](../components/items/sidebar-card.md) + [BackToFileRow](../components/atoms/card-back-to-file.md) |
| Заголовок секции | `History of file` — Inter Semi Bold 16/24 `#18181b`, padding 12 |
| Commit List 285 | см. варианты |
| Header Settings 309×60 | [header-settings](../components/items/header-settings.md) |

Padding колонки: 12 px горизонталь. Content: `gap` **0** при списке коммитов, **8** при History Null.

---

## Варианты панели

| Figma | Node | Current preview | Commit List |
|-------|------|-----------------|-------------|
| File view | [`4309:7530`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4309-7530) | Selected, **dashed** `#60a5fa` / `#eff6ff` | стек [SidebarCard](../components/items/sidebar-card.md) Default + [CommitFileCard](../components/atoms/card-commit-file.md) |
| File view - History Null | [`4309:9019`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4309-9019) | Disable, **dashed** `#e4e4e7` / `#f4f4f5` | один SidebarCard Disable (solid) + [NoHistoryFile](../components/atoms/card-no-history-file.md) **сверху** списка, не по центру колонки |

Пунктир Current preview — override инстанса в этих панелях. Канон [Item / Card](../components/items/sidebar-card.md) Selected/Disable — solid. Не делать dashed все Selected карточки коммитов.

В инстансах `4309:7530` в Swapper сейчас [Commit Project](../components/atoms/card-commit-project.md) (есть «7 files changed»). Продукт — атом [Commit File](../components/atoms/card-commit-file.md) (`4306:3082`): stats только `+` / `−`. Не копировать «N files changed» со скрина панели.

---

## Поведение

- `log.get` с `path`. Не дерево workdir.
- Список виртуализировать; `diff.stat` карточки — visible + overscan ([revision-cache.md](../gui_frontend/revision-cache.md)).
- Клик Current preview → [file-preview](../views/file-preview.md) текущего файла (`leaveFileRevision`). Не сетка папки. Возврат к списку файлов — Back `<` в [Header File Action](../components/items/header-file-action.md).
- Клик коммита → [file-history](../views/file-history.md). Пока `contentContext = file`, Current preview остаётся Selected.
