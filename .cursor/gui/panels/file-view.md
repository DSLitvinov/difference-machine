# Panel / File view

Левая колонка **истории файла** (не проекта). Экраны: [../views/file-preview.md](../views/file-preview.md), [../views/file-history.md](../views/file-history.md).

Figma: [Panel / File view](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4309-7530) (`4309:7530`).  
Код: `FileViewPanel`. 309×720.

---

## Слоты сверху вниз (оба варианта)

| Слот | Кирпич |
|------|--------|
| Header Select Branch 309×64 | [header-select-branch](../components/items/header-select-branch.md) |
| Карточка файла | [SidebarCard](../components/items/sidebar-card.md): basename. Грязный файл — **Edit in** и **Take snapshot**. Чистый — `No changes file`, без кнопок. Строки Back to file и заголовка `History of file` нет |
| Вкладки | History активна. Stashes видна и **disabled** — список стэшей файла не строить |
| Commit List 285 | см. варианты |
| Header Settings 309×60 | [header-settings](../components/items/header-settings.md) |

Padding колонки: 12 px горизонталь. Content: `gap` **0** при списке коммитов, **8** при History Null.

---

## Варианты панели

| Figma | Node | Current preview | Commit List |
|-------|------|-----------------|-------------|
| File view | [`4309:7530`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4309-7530) | Selected, **solid** `#60a5fa` / `#eff6ff` | стек [SidebarCard](../components/items/sidebar-card.md) Default + [CommitFileCard](../components/atoms/card-commit-file.md) |
| File view - History Null | [`4309:9019`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4309-9019) | Selected, **solid** `#60a5fa` | один SidebarCard Disable (solid) + [NoHistoryFile](../components/atoms/card-no-history-file.md) **сверху** списка, не по центру колонки |

Selected — сплошная синяя обводка. Карточка файла **никогда** не Disable. History Null и просмотр workdir — Selected; выбран коммит в истории — Default. Клик всегда активен. Take snapshot этой карточки открывает Append, затем Create snapshot, только для этого файла.

В инстансах `4309:7530` в Swapper сейчас [Commit Project](../components/atoms/card-commit-project.md) (есть «7 files changed»). Продукт — атом [Commit File](../components/atoms/card-commit-file.md) (`4306:3082`): stats только `+` / `−`. Не копировать «N files changed» со скрина панели.

---

## Поведение

- `log.get` с `path`. Не дерево workdir.
- Список виртуализировать; `diff.stat` карточки — visible + overscan ([revision-cache.md](../gui_frontend/revision-cache.md)). Строка списка — 2px вокруг карточки, чтобы обводка hover/focus не клипалась. Футер — [Header Settings](../components/items/header-settings.md) со своим фоном.
- Клик Current preview → [file-preview](../views/file-preview.md) текущего файла (`leaveFileRevision`). Не сетка папки. Возврат к списку файлов — Back `<` в [Header File Action](../components/items/header-file-action.md). Карточка всегда кликабельна, никогда Disable.
- Клик коммита → [file-history](../views/file-history.md). Пока `contentContext = file`, Current preview остаётся Selected.
- Клик коммита → [file-history](../views/file-history.md). Пока `contentContext = file`, Current preview остаётся Selected.
