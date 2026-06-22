Ты архитектор ПО. Необходимо составить документацию для разработчика. Проект GUI для forester. 
Со всеми возможными "corner case". 
Интерфейс будет разделен на три секции: Sidebar, Content Preview, Content Info

Sidebar - управление режимом просмотра: Просмотр содержимого папки репозитория или простмотр истории: ветки и коммиты. В зависимости от выбранного режима Content Preview и Content Info меняют свои Layout. Также в Sidebar меняется секция с элементами проекта: Просмотр списка папок репозитория или просмотр дерева репозитория

Посмотри на дизайн Sidebar:
Это режим просмотра папок рабочей дирректории
https://www.figma.com/design/GTu6s7FMr4Tn1NWrYeGpIF/?node-id=7311-19040

Это просмотр списка веток и коммитов
https://www.figma.com/design/GTu6s7FMr4Tn1NWrYeGpIF/?node-id=7311-19014

Нужно создать файлы:
- архитектуры проекта с корнеркейсами → [architecture.md](./architecture.md)
- архитектура side bar в двух версиях:
  - [sidebar-project-view.md](./sidebar-project-view.md) — папки рабочей директории
  - [sidebar-history-view.md](./sidebar-history-view.md) — ветки и коммиты
  - [commit-card.md](./commit-card.md) — карточка коммита (Default/Hover/Selected)
- Content Preview (режим Project view, связка с Sidebar):
  - [content-preview-project-view.md](./content-preview-project-view.md) — панель: toolbar, drill-down, multiselect, поиск, сортировка, slider
  - [folder-preview-item.md](./folder-preview-item.md) — item папки (Default/Hover/Selected)
  - [file-preview-item.md](./file-preview-item.md) — item файла (Default/Hover/Selected × Min/Max)


собираем на ui framework: Wails и shadcn ui


