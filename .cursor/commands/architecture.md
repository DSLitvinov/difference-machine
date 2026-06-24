# Difference Machine - Архитектура проекта

## Стек технологий

### Backend (Forester CLI)
- **Язык программирования**: Go 1.22+
- **Метаданные**: файлы в `.DFM/` (refs, index, manifests, reviews, locks, stash, reflog)
- **Сборка**: Статический бинарник без внешних Go-зависимостей
- **Платформы**: Linux, macOS, Windows (кросс-компиляция)

### Blender Addon
- **Язык программирования**: Python 3.10+ (встроен в Blender)
- **Фреймворк**: Blender Python API (bpy)
- **Версия Blender**: 4.5.0+
- **Зависимости**: Только стандартная библиотека Python (subprocess, configparser, pathlib, logging)

### Инструменты сборки
- **Go**: `go build`, `go mod`
- **Make**: Makefile для автоматизации сборки
- **Скрипты**: Bash (Linux/macOS), Batch (Windows)
- **Установщик**: Shell/Batch скрипты для автоматической установки

## Структура папок

```
difference-machine/
├── forester/                          # Ядро VCS (Go)
│   ├── cmd/forester/                  # Точка входа CLI
│   │   └── main.go                    # Главный файл CLI
│   ├── internal/                      # Внутренние пакеты
│   │   ├── commands/                  # Команды CLI (add, commit, branch, etc.)
│   │   │   ├── init.go
│   │   │   ├── add.go
│   │   │   ├── commit.go
│   │   │   ├── branch.go
│   │   │   ├── checkout.go
│   │   │   ├── status.go
│   │   │   ├── log.go
│   │   │   ├── diff.go
│   │   │   ├── stash.go
│   │   │   ├── tag.go
│   │   │   ├── gc.go
│   │   │   ├── reflog.go
│   │   │   ├── review.go
│   │   │   ├── lock.go
│   │   │   ├── hook.go
│   │   │   ├── compare.go
│   │   │   └── rebuild.go
│   │   ├── core/                      # Ядро системы
│   │   │   ├── storage.go             # Хранилище объектов
│   │   │   ├── refs.go                # Ветки, теги, HEAD
│   │   │   ├── index.go               # Staging area
│   │   │   ├── manifest_store.go      # Метаданные Blender-объектов
│   │   │   ├── review_store.go        # Review комментарии
│   │   │   ├── stash_store.go         # Stash
│   │   │   ├── reflog.go              # Reflog
│   │   │   ├── hashing.go             # Хеширование (SHA256)
│   │   │   ├── compression.go         # Сжатие данных
│   │   │   ├── index.go               # Индекс файлов (staging area)
│   │   │   ├── refs.go                # Управление ссылками (ветки, теги)
│   │   │   ├── locking.go             # Блокировка файлов
│   │   │   └── hooks.go               # Система хуков
│   │   ├── models/                    # Модели данных
│   │   │   ├── commit.go              # Модель коммита
│   │   │   ├── tree.go                # Модель дерева файлов
│   │   │   └── blob.go                # Модель бинарного объекта
│   │   └── utils/                     # Утилиты
│   │       ├── filesystem.go          # Файловые операции
│   │       ├── config.go              # Конфигурация
│   │       ├── validation.go          # Валидация данных
│   │       ├── diff.go                # Алгоритмы diff
│   │       ├── patterns.go            # Паттерны игнорирования
│   │       ├── color.go               # Цветной вывод
│   │       └── mesh_utils.go          # Утилиты для мешей
│   ├── go.mod                         # Go модуль
│   ├── go.sum                         # Checksums зависимостей
│   ├── Makefile                       # Автоматизация сборки
│   ├── LINUX_build.sh                 # Скрипт сборки для Linux
│   ├── MACOS_build.sh                 # Скрипт сборки для macOS
│   └── WINDOWS_build.bat              # Скрипт сборки для Windows
│
├── addons/blender/difference_machine/ # Blender Addon
│   ├── __init__.py                    # Точка входа аддона
│   ├── blender_manifest.toml          # Манифест для Blender
│   ├── preferences.py                 # Настройки аддона
│   ├── operators/                     # Операторы (команды Blender)
│   │   ├── __init__.py
│   │   ├── init_operators.py          # Инициализация репозитория
│   │   ├── commit_operators.py        # Операции с коммитами
│   │   ├── branch_operators.py        # Операции с ветками
│   │   ├── history_operators.py       # Просмотр истории
│   │   ├── stash_operators.py         # Операции со stash
│   │   ├── gc_operators.py            # Garbage Collection
│   │   ├── review_operators.py        # Система review
│   │   ├── lock_operators.py          # Блокировка файлов
│   │   ├── mesh_io.py                 # Импорт/экспорт мешей
│   │   ├── object_export_background.py # Фоновый экспорт объектов
│   │   ├── object_import_background.py # Фоновый импорт объектов
│   │   ├── operator_helpers.py        # Вспомогательные функции
│   │   └── operator_name.py           # Имена операторов
│   ├── properties/                    # Свойства (данные Blender)
│   │   ├── __init__.py
│   │   ├── properties.py              # Основные свойства
│   │   ├── commit_item.py             # Модель элемента коммита
│   │   └── review_properties.py       # Свойства review
│   ├── ui/                            # Пользовательский интерфейс
│   │   ├── __init__.py
│   │   ├── ui_main.py                 # Главный UI
│   │   ├── ui_panels.py               # Панели интерфейса
│   │   └── ui_lists.py                # Списки (коммиты, ветки)
│   └── utils/                         # Утилиты
│       ├── __init__.py
│       ├── forester_cli.py            # Обертка для Forester CLI
│       ├── config_loader.py            # Загрузка конфигурации
│       ├── helpers.py                  # Вспомогательные функции
│       ├── logging_config.py          # Настройка логирования
│       └── viewport_capture.py        # Захват изображений viewport
│
├── forester_api/                      # Python API
│   ├── forester_api/                  # Пакет API
│   │   ├── __init__.py                # Экспорт API
│   │   ├── api.py                     # Главный класс Repository
│   │   ├── backend.py                 # Выбор backend
│   │   ├── backend_cli.py             # Реализация через CLI
│   │   ├── cli_wrapper.py            # Обертка для CLI команд
│   │   └── models.py                  # Dataclasses моделей
│   └── setup.py                       # Установочный скрипт
│
├── builder/                           # Сборка дистрибутива (payload)
│   ├── build.sh                       # Delegate → macos|linux|windows/build.sh
│   ├── dist/payload/                  # Сборка forester, addon, API, GUI
│   ├── setup.cfg.template             # Шаблон конфига для установщика
│   └── scripts/
│       ├── build_forester.sh          # Forester CLI + API → .staging/
│       ├── stage_dist.sh              # Stage → builder/dist/payload
│       ├── copy_addons.sh             # Копирование addons/
│       └── lib/detect_platform.sh     # Определение платформы
│
└── [документация]                     # README, GUIDE, BUILD.md и т.д.
```

### Структура репозитория Forester (после инициализации)

```
project/
├── .DFM/                              # Служебная директория Forester
│   ├── objects/                       # Хранилище объектов (commits, trees, blobs)
│   │   ├── blobs/sha256/
│   │   ├── commits/sha256/
│   │   └── trees/sha256/
│   ├── refs/                          # Ссылки (ветки, теги)
│   │   ├── heads/
│   │   └── tags/
│   ├── index                          # Staging area (JSON)
│   ├── manifests/                     # Метаданные Blender-объектов
│   ├── reviews/                       # Review комментарии и approvals
│   ├── locks/                         # Блокировки файлов
│   ├── stash/                         # Stash
│   └── logs/refs/heads/               # Reflog
├── .dfmignore                         # Файлы для игнорирования (опционально)
└── [файлы проекта]                     # Ваши файлы проекта
```

## Ключевые зависимости

### Forester CLI (Go)
- **Стандартная библиотека Go** — единственная зависимость (`go.mod` без сторонних модулей):
  - `crypto/sha256` — хеширование
  - `compress/gzip` — сжатие
  - `encoding/json` — сериализация
  - `os`, `path/filepath` — файловые операции
  - `sync` — синхронизация и блокировки


### Системные зависимости
- **Go 1.22+** — компилятор Go
- **C compiler** (опционально) — для сборки native API library
- **Blender 4.5.0+** — для аддона (Python 3.10+ встроен в Blender)


## Внешние интеграции

### 1. Forester CLI ↔ Blender Addon
**Тип**: API

**Механизм**:
- Аддон вызывает forester API

**Конфигурация**:
- Путь к forester CLI и native API читаются из `~/.dfm/setup.cfg`
- Путь к Blender addon читается из `~/.dfm/setup.cfg` (секция `[addons]`)

**Примеры команд**:
- `forester init` — инициализация репозитория
- `forester status` — статус репозитория
- `forester commit -m "message"` — создание коммита
- `forester log --json` — история коммитов (JSON)


### 4. Файловые метаданные ↔ Forester Core
**Тип**: JSON и текстовые файлы в `.DFM/`

**Использование**:
- Refs (ветки, теги, HEAD) — `.DFM/refs/`
- Staging index — `.DFM/index`
- Reflog — `.DFM/logs/refs/heads/`
- Blender object manifests — `.DFM/manifests/`
- Locks, reviews, stash — отдельные JSON-файлы


### 5. Файловая система ↔ Forester Storage
**Тип**: Прямой доступ к файлам

**Хранилище объектов**:
- Объекты хранятся по хешам SHA256
- Структура: `.DFM/objects/{type}/sha256/{hash}`
- Дедупликация — одинаковые файлы хранятся один раз
- Поддержка типов: blobs, commits, trees

**Индекс (staging area)**:
- Хранится в `.DFM/index` (JSON)
- Отслеживает файлы, готовые к коммиту
- Двухэтапный процесс: `add` → `commit`


### 6. Конфигурация системы
**Тип**: Конфигурационные файлы

**Локации**:
- `~/.dfm/setup.cfg` — путь к Forester CLI
- `.dfmignore` — файлы для игнорирования (в корне репозитория)
- Настройки аддона — хранятся в Blender preferences

**Формат setup.cfg**:

<Системная папка>:
- Linux: `/opt/DiffMachine/`
- macOS: `/Applications/DiffMachine/`
- Windows: `C:\Program Files\DiffMachine\`

```
[forester]
path = /<Системная папка>/DiffMachine/bin/forester
installed = true

[api]
path = /<Системная папка>/DiffMachine/lib/libforester.so
installed = true

[addons]
diffmachine_path = /<Системная папка>/DiffMachine/addons/blender/difference_machine

[plugins]
blender_enabled = true
```

### 7. Установщик ↔ Система
**Тип**: Shell/Batch скрипты

**Функции**:
- Сборка Forester CLI из исходников
- Установка бинарника в системную директорию
- Копирование аддона в директорию Blender
- Создание конфигурационных файлов
- Настройка путей

**Платформы**:
- Linux: `/opt/DiffMachine/bin/forester`
- macOS: `/Applications/DiffMachine/bin/forester`
- Windows: `C:\Program Files\DiffMachin\bin\forester.exe`


