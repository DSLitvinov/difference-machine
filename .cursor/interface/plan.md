Ты архитектор ПО. Необходимо составить документацию для разработчика. Проект GUI для forester. 
Со всеми возможными "corner case". 
Интерфейс будет разделен на три секции: Sidebar, Content Preview, Content Info

Sidebar - управление режимом просмотра: Просмотр содержимого папки репозитория или простмотр истории: ветки и коммиты. В зависимости от выбранного режима Content Preview и Content Info меняют свои Layout. Также в Sidebar меняется секция с элементами проекта: Просмотр списка папок репозитория или просмотр дерева репозитория

Посмотри на дизайн Sidebar (shadcn kit):
Это режим просмотра папок рабочей дирректории
https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4026-4812

Это просмотр списка веток и коммитов
https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4026-4547

Нужно создать файлы:
- [design-tokens.md](./design-tokens.md) — shadcn/ui цвета (Figma kit, единый справочник)
- архитектуры проекта с корнеркейсами → [architecture.md](./architecture.md)
- [api-contract.md](./api-contract.md) — JSON API + UI events
- пути (macOS / Windows) → [paths.md](./paths.md)
- multi-repo (`setup.cfg`) → [multi-repo.md](./multi-repo.md)
- resize трёх панелей → [panel-layout.md](./panel-layout.md)
- архитектура side bar в двух версиях:
  - [sidebar-project-view.md](./sidebar-project-view.md) — папки рабочей директории
  - [sidebar-history-view.md](./sidebar-history-view.md) — ветки и коммиты
  - [commit-card.md](./commit-card.md) — карточка коммита (Default/Hover/Selected)
- Content Preview (режим Project view, связка с Sidebar):
  - [content-preview-project-view.md](./content-preview-project-view.md) — панель: toolbar, drill-down, multiselect, поиск, сортировка, slider
  - [folder-preview-item.md](./folder-preview-item.md) — item папки (Default/Hover/Selected)
  - [file-preview-item.md](./file-preview-item.md) — item файла (Default/Hover/Selected × Min/Max)
- Content Preview (режим History, UX как GitHub Desktop):
  - [content-preview-history-view.md](./content-preview-history-view.md) — панель: header, changed files list, diff routing, state, API
  - [preview-commit-header.md](./preview-commit-header.md) — header коммита в Preview
  - [history-changed-file-item.md](./history-changed-file-item.md) — строка changed file (A/M/D/R × Default/Hover/Selected)
  - [diff-view.md](./diff-view.md) — toolbar + маршрутизация по типу файла
  - [text-diff-panel.md](./text-diff-panel.md) — Unified / Split
  - [image-diff-panel.md](./image-diff-panel.md) — Split / Overlay
  - [binary-diff-stub.md](./binary-diff-stub.md) — заглушка + кнопка open; `.blend` → screenshot коммита ([4030:2796](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4030-2796))
  - [deleted-diff-stub.md](./deleted-diff-stub.md) — заглушка удалённого файла
  - Figma: [text diff `4028:5655`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4028-5655) · [image diff `4030:3317`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4030-3317) · [binary stub `4031:3754`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4031-3754)
  - В History mode **нет Content Info** — только Sidebar + Content Preview
- Content Info (режим Project view):
  - [content-info-project-view.md](./content-info-project-view.md) — панель: preview, metadata, history (single only), create commit
  - [info-file-preview-single.md](./info-file-preview-single.md) — preview одного файла (`4037:707`)
  - [info-file-preview-multi.md](./info-file-preview-multi.md) — multiselect stack (`4037:1879`)
  - [info-file-preview-tile.md](./info-file-preview-tile.md) — tile в стеке (`4037:1843`)
  - [info-metadata-section.md](./info-metadata-section.md) — Metadata single/multi
  - [info-history-section.md](./info-history-section.md) — History: branch, commit, Revert, Compare (single file only; скрыта при multiselect)
  - [create-commit-dialog.md](./create-commit-dialog.md) — диалог (`4037:1076`)
  - Figma panel: [single `4027:5041`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4027-5041) · [multi `4037:1898`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4037-1898)


собираем на ui framework: Wails и shadcn ui

**MVP v1 (full scope):** Sidebar (Project + History) + Content Preview (Project + History diff) + Content Info (Project) + multi-repo + 3-panel resize. Канон API/events: [api-contract.md](./api-contract.md). Порядок реализации: [api-contract.md §7](./api-contract.md).
