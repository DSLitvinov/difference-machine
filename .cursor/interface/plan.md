Ты архитектор ПО. Необходимо составить документацию для разработчика. Проект GUI для forester. 
Со всеми возможными "corner case". 
Интерфейс будет разделен на три секции: Sidebar, Content Preview, Content Info

Sidebar - управление режимом просмотра: Просмотр содержимого папки репозитория или простмотр истории: ветки и коммиты. В зависимости от выбранного режима Content Preview и Content Info меняют свои Layout. Также в Sidebar меняется секция с элементами проекта: Просмотр списка папок репозитория или просмотр дерева репозитория

Посмотри на жизайн Sidebar:
Это режим просмотра папок рабочей дирректории
https://www.figma.com/design/GTu6s7FMr4Tn1NWrYeGpIF/%F0%9F%8E%B1-M.OS-%D0%9F%D1%83%D1%81%D0%BA---%D0%9F%D0%BE%D0%B8%D1%81%D0%BA--2.0-?node-id=7301-17587&t=DltPYLgekgwqb6eJ-11

Это просмотр списка веток и коммитов
https://www.figma.com/design/GTu6s7FMr4Tn1NWrYeGpIF/%F0%9F%8E%B1-M.OS-%D0%9F%D1%83%D1%81%D0%BA---%D0%9F%D0%BE%D0%B8%D1%81%D0%BA--2.0-?node-id=7301-17611&t=DltPYLgekgwqb6eJ-11

Нужно создать файлы:
- архитектуры проекта с корнеркейсами → [architecture.md](./architecture.md)
- архитектура side bar в двух версиях:
  - [sidebar-project-view.md](./sidebar-project-view.md) — папки рабочей директории
  - [sidebar-history-view.md](./sidebar-history-view.md) — ветки и коммиты

собираем на ui framework: Wails и shadcn ui

**Текущий scope:** только Sidebar (Preview / Info — позже).

