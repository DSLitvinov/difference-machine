# diffmachine_gui

Desktop-приложение (PyQt6 + QML) для работы с репозиториями Forester: открытие репо, просмотр изменений, диффы, ветки и слияния.

## Запуск

Запуск из каталога `diffmachine_gui` (импорты `file_management`, `file_viewer`, `repository`, `diff_viewer` разрешаются относительно текущего каталога):

```bash
cd diffmachine_gui && python main.py
```

Из корня репозитория — добавьте `diffmachine_gui` в `PYTHONPATH`:

```bash
PYTHONPATH=diffmachine_gui python diffmachine_gui/main.py
```

## Структура пакетов

- **file_management** — дерево файлов, выбор директории, `.dfmignore`. Класс `FileManager`.
- **file_viewer** — просмотр содержимого файлов (текст, изображения, метаданные). Класс `FileViewer`.
- **repository** — операции с репозиторием Forester (статус, коммиты, ветки, merge). Класс `RepositoryManager`.
- **diff_viewer** — текстовый и визуальный diff (HTML, изображения).

Экземпляры передаются в QML через контекст (`fileManager`, `fileViewer`, `repositoryManager`). Типы регистрируются в `main.py` через `qmlRegisterType` для разрешения `import FileManager 1.0` и т.п. в QML.
