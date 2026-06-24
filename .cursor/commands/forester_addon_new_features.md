# План добавления новых функций в Forester и Addon

**Версии компонентов:** Forester 0.8, Blender Addon 0.8.

## Обзор

Этот документ описывает план добавления новых функций в **Forester** (Go) и **Blender Addon** (Python), выделенных из общего roadmap. Задачи сгруппированы по компонентам и приоритетам.

**Связь с roadmap:** см. `.cursor/commands/roadmap.md`. Этапы roadmap: 9 (Replace/Retrieve), 10 (Ghost), 11 (History), 12 (screenshots), 13 (Save Asset), 14 (Mark To), 16 (Review) — соответствуют разделам 1.x и 2.x ниже.

---

## Часть 1: Forester (Go) — хранилища метаданных и API

### Приоритет: Высокий

#### 1.1 Синхронизация screenshot_hash ↔ screenshot_path ✅
**Файлы:**
- `forester/internal/core/storage.go`, `forester/internal/commands/commit.go` (обновить)
- `forester/api/capi.go` (обновить, если нужно)

**Задачи:**
- [x] Добавить поле `screenshot_path` в структуру Commit (если еще нет) ✅
- [x] При создании коммита: сохранять screenshot_path в формате `.DFM/screenshots/{commit_hash}.png` ✅
- [x] Обновить методы создания/обновления коммитов для поддержки screenshot_path ✅
- [x] Добавить миграцию для старых коммитов (если screenshot_hash есть, но screenshot_path нет) ✅
- [x] Обновить API методы для возврата screenshot_path вместе с commit данными ✅

**Зависимости:** Нет

**Оценка:** 2-3 часа

---

#### 1.2 Manifest store `objects` для реестра объектов и Mark To ✅
**Файлы:**
- `forester/internal/core/manifest_store.go`
- `forester/internal/models/object.go` (новый, опционально)

**Задачи:**

**Создание таблицы:**
- [x] Создать таблицу `objects` со структурой ✅
- [x] Создать индексы ✅

**Методы Database:**
- [x] `AddObject(obj *Object) error` - добавить объект ✅
- [x] `UpdateObject(obj *Object) error` - обновить объект ✅
- [x] `GetObject(commit_hash, file_path, object_name string) (*Object, error)` - получить объект ✅
- [x] `DeleteObject(commit_hash, file_path, object_name string) error` - удалить объект ✅
- [x] `GetObjectsByCommit(commit_hash string) ([]*Object, error)` - все объекты коммита ✅
- [x] `GetObjectsByFile(file_path, commit_hash string) ([]*Object, error)` - объекты файла ✅
- [x] `GetObjectsByTag(tag, commit_hash string) ([]*Object, error)` - объекты с тегом ✅
- [x] `GetObjectsByTags(tags []string, commit_hash string) ([]*Object, error)` - объекты с любым из тегов ✅
- [x] `AddTagToObject(commit_hash, file_path, object_name, tag string) error` - добавить тег ✅
- [x] `RemoveTagFromObject(commit_hash, file_path, object_name, tag string) error` - убрать тег ✅
- [x] `SetObjectTags(commit_hash, file_path, object_name string, tags []string) error` - установить теги ✅
- [x] `SetObjectMetadata(commit_hash, file_path, object_name, key, value string) error` - установить метаданные ✅
- [x] `GetObjectMetadata(commit_hash, file_path, object_name string) (map[string]string, error)` - получить метаданные ✅

**Структура Object:**
- [x] Создана структура `Object` в `forester/internal/models/commit.go` ✅

**Зависимости:** Нет

**Оценка:** 6-8 часов

---

### Приоритет: Низкий

#### 1.3 Review store для Review системы ✅
**Файлы:**
- `forester/internal/core/review_store.go`
- `forester/internal/models/review.go` (новый, опционально)

**Задачи:**

**Создание таблицы:**
- [x] Создать таблицу `reviews` ✅
- [x] Создать индексы ✅

**Методы Database:**
- [x] `AddReview(review *Review) error` - добавить review ✅
- [x] `GetReviews() ([]*Review, error)` - все reviews ✅
- [x] `GetReviewsByCommit(commit_hash string) ([]*Review, error)` - reviews для коммита ✅
- [x] `GetReviewsByObject(commit_hash, file_path, object_name string) ([]*Review, error)` - reviews для объекта ✅
- [x] `GetReviewsByFile(commit_hash, file_path string) ([]*Review, error)` - reviews для файла ✅
- [x] `DeleteReview(id int64) error` - удалить review ✅

**Структура Review:**
- [x] Создана структура `Review` в `forester/internal/models/commit.go` ✅

**Зависимости:** Нет

**Оценка:** 2-3 часа

---

## Часть 2: Addon (Blender Python) - Операторы и утилиты

### Приоритет: Средний

#### 2.1 Расширение Replace Object с функциональностью Retrieve ✅
**Файлы:**
- `addons/blender/difference_machine/operators/history_operators.py` (обновить `DF_OT_replace_mesh`) ✅
- `addons/blender/difference_machine/utils/asset_path.py` (новый) ✅
- `addons/blender/difference_machine/ui/ui_panels.py` (обновить) ✅

**Задачи:**

**Оператор:**
- [x] Расширить `DF_OT_replace_mesh` для поддержки множественного выбора (`context.selected_objects`) ✅
- [x] Добавить `BoolProperty replace_mode` (по умолчанию `True` для обратной совместимости) ✅
- [x] Реализовать логику:
  - `replace_mode=True`: заменяет выбранные объекты объектами из коммита ✅
  - `replace_mode=False`: добавляет объекты из коммита, не удаляя существующие ✅
- [x] Использовать `bpy.data.libraries.load()` вместо `bpy.ops.wm.append()` для лучшего контроля ✅
- [x] Сохранить обратную совместимость ✅

**Исправление путей к ассетам:**
- [x] Создать `asset_path.py` с функциями:
  - `fix_retrieved_assets(assets)` - исправление путей для списка ассетов ✅
  - `_transform_path_from_history(path)` - убирает `//../../` префикс ✅
- [x] Обработать типы ассетов:
  - Images, Libraries, Sounds, Fonts, Volumes, Texts, VSE sequences ✅
- [x] Интегрировать в оператор после загрузки объектов ✅
- [x] Добавить логирование ✅

**UI:**
- [x] Обновить кнопку "Replace Object" → "Retrieve Objects" (или добавить чекбокс) ✅
- [x] Добавить чекбокс `replace_mode` в UI ✅
- [x] Показывать количество выбранных объектов ✅
- [x] Добавить подсказки для режимов ✅

**Зависимости:** Нет

**Оценка:** 7-10 часов (9.1: 4-5ч, 9.2: 2-3ч, 9.3: 1-2ч)

---

#### 2.2 Расширение Compare Object (Ghost Objects) ✅
**Файлы:**
- `addons/blender/difference_machine/operators/history_operators.py` (обновить `DF_OT_compare_object`) ✅
- `addons/blender/difference_machine/ui/ui_panels.py` (обновить) ✅

**Задачи:**

**Поддержка нескольких объектов:**
- [x] Расширить `DF_OT_compare_object` для работы с несколькими объектами ✅
- [x] Если выбрано несколько объектов → загружать все как linked ✅
- [x] Создавать коллекцию `Compare_Reference_{commit_hash}` для группировки ✅
- [x] Применять offset ко всем объектам в коллекции ✅
- [x] Сохранить обратную совместимость (один объект работает как сейчас) ✅

**Ghost режим:**
- [x] Добавить `BoolProperty ghost_mode` (опционально) ✅
- [x] Если `ghost_mode=True`:
  - Установить `display_type='WIRE'` для всех linked объектов ✅
  - Установить `hide_select=True` ✅
  - Установить `show_in_front=False` (или опционально `True`) ✅
- [x] Добавить переключатель в UI ✅
- [x] При cleanup удалять всю коллекцию Compare_Reference ✅

**Зависимости:** Нет

**Оценка:** 5-7 часов (10.1: 3-4ч, 10.2: 2-3ч)

---

#### 2.3 История объектов ✅
**Файлы:**
- `addons/blender/difference_machine/utils/object_data.py` (новый) ✅
- `addons/blender/difference_machine/utils/object_history.py` (новый) ✅
- `addons/blender/difference_machine/ui/ui_panels.py` (обновить) ✅
- `addons/blender/difference_machine/ui/ui_lists.py` (обновить)

**Задачи:**

**Метаданные объектов:**
- [x] Реализовать `extract_object_data(obj, depsgraph)`:
  - `matrix` - матрица трансформации (4x4) ✅
  - `bbox` - bounding box (min/max точки) ✅
  - `v_count` - количество вершин (для MESH) ✅
- [x] Реализовать `save_object_data(version_id, objects)` - сохранение в JSON ✅
- [x] Реализовать `load_object_data(version_id)` - загрузка из JSON ✅
- [x] Использовать LRU cache для оптимизации ✅
- [x] Интегрировать в процесс создания коммита ✅

**Сравнение версий:**
- [x] Реализовать `compare_object_history(obj, include_change_not_detected=False)` ✅
- [x] Определять типы изменений:
  - `CHANGE_TYPE_CREATED`, `CHANGE_TYPE_MAJOR`, `CHANGE_TYPE_MINOR`, `CHANGE_TYPE_MOVED`, `CHANGE_TYPE_RECORD` ✅
- [x] Возвращать список версий с типом изменения и деталями ✅
- [x] Сортировать от старых к новым ✅

**UI:**
- [x] Создать панель или вкладку "Object History" ✅
- [x] Показывать timeline изменений выбранного объекта ✅
- [x] Визуализировать типы изменений (иконки/цвета) ✅
- [x] Показывать детали изменений (количество вершин, дата, коммит) ✅
- [x] Добавить возможность перейти к коммиту из истории ✅

**Зависимости:** Нет

**Оценка:** 9-12 часов (11.1: 3-4ч, 11.2: 2-3ч, 11.3: 4-5ч)

---

#### 2.4 Улучшенная работа со скриншотами ✅
**Файлы:**
- `addons/blender/difference_machine/operators/commit_operators.py` (обновить) ✅
- `addons/blender/difference_machine/utils/forester_api.py` (обновить) ✅

**Задачи:**
- [x] При создании коммита: сохранять screenshot_hash в forester как screenshot_path ✅
- [x] Формат пути: `.DFM/screenshots/{commit_hash}.png` ✅
- [x] Обновить Forester API wrapper для поддержки screenshot_path в commit ✅
- [x] При загрузке коммитов: использовать screenshot_path для загрузки превью ✅
- [x] Обработать миграцию старых коммитов (если screenshot_hash есть, но screenshot_path нет) ✅

**Зависимости:** 1.1 (Forester)

**Оценка:** 2-3 часа

---

#### 2.5 Улучшение Save Asset ✅
**Файлы:**
- `addons/blender/difference_machine/operators/commit_operators.py` (обновить `DF_OT_save_asset`) ✅
- `addons/blender/difference_machine/utils/asset_registry.py` (новый) ✅
- `addons/blender/difference_machine/ui/ui_panels.py` (обновить)

**Задачи:**

**Автоматическая замена на link:**
- [x] После сохранения ассета:
  1. Сохранить имя и коллекции оригинального объекта ✅
  2. Удалить оригинальный объект из сцены ✅
  3. Загрузить сохраненный ассет как linked (`bpy.data.libraries.load(link=True)`) ✅
  4. Переименовать linked объект в имя оригинала ✅
  5. Добавить linked объект в те же коллекции ✅
  6. Выбрать linked объект как active ✅
- [x] Добавить `BoolProperty replace_with_link` (по умолчанию `True`) ✅
- [x] Если `replace_with_link=False`, оставить оригинальный объект ✅
- [x] Обработка ошибок (восстановление оригинального объекта) ✅

**Реестр ассетов:**
- [x] Создать `asset_registry.py` с функциями:
  - `update_asset_registry(repo_path, asset_path, object_name, object_type, category)` ✅
  - `add_asset_to_registry()` - добавить/обновить запись ✅
  - `find_asset_in_registry(object_name)` - найти ассет ✅
  - `list_assets_by_category(category)` - список по категории ✅
  - `search_assets(query)` - поиск ✅
- [x] Формат реестра: JSON файл `.DFM/assets_registry.json` ✅
- [x] Интегрировать в `DF_OT_save_asset` ✅
- [x] **Синхронизация с manifest store** (если объект из коммита) ✅

**UI:**
- [ ] Добавить секцию "Asset Registry" в панель Save Asset
- [ ] Показывать количество ассетов в реестре
- [ ] Добавить кнопку "Browse Assets"
- [ ] Добавить поиск по реестру
- [ ] Показывать найденные ассеты с возможностью загрузить (link)

**Интеграция с коммитами:**
- [ ] При создании коммита: сохранять информацию о linked ассетах
- [ ] При загрузке коммита: проверять наличие ассетов в реестре
- [ ] Показывать предупреждение, если ассет не найден
- [ ] Функция поиска объектов в коммитах через реестр

**API для работы с objects:**
- [x] Добавлены C API функции для работы с objects ✅
- [x] Добавлены Python bindings для всех функций ✅
- [x] Обновлен forester_api.py в аддоне ✅

**Зависимости:** 1.2 (Forester - таблица objects)

**Оценка:** 11-15 часов (13.1: 3-4ч, 13.2: 3-4ч, 13.3: 2-3ч, 13.4: 3-4ч)

---

### Приоритет: Средний (требует Forester 1.2)

#### 2.6 Реестр редакторов и Mark To панель ✅
**Файлы:**
- `addons/blender/difference_machine/utils/object_data.py` (новый, если еще не создан) ✅
- `addons/blender/difference_machine/properties/object_mark.py` (новый) ✅
- `addons/blender/difference_machine/operators/mark_operators.py` (новый) ✅
- `addons/blender/difference_machine/ui/ui_panels.py` (обновить) ✅
- `addons/blender/difference_machine/ui/ui_lists.py` (обновить)
- `addons/blender/difference_machine/utils/forester_api.py` (обновить)

**Задачи:**

**JSON manifests (`.DFM/manifests/`):**
- [x] Реализовать `extract_object_data(obj, depsgraph)` - извлечение метаданных ✅
- [x] Реализовать `save_object_data(commit_hash, objects, file_path)` - сохранение в JSON ✅
  - Формат: `.DFM/objects/{commit_hash}_objects.json` ✅
  - Структура: `{"file_path": {"object_name": {data}}}` ✅
- [x] Реализовать `load_object_data(commit_hash)` - загрузка из JSON ✅
- [x] Использовать LRU cache для оптимизации ✅
- [x] Интегрировать в процесс создания коммита ✅
- [x] **Manifest store**: объекты сохраняются через `manifest_store.go` / Forester API ✅

**Модель данных для пометок:**
- [x] Создать PropertyGroup `DFObject` с полями:
  - `object_name`, `object_type`, `file_path`, `commit_hash` ✅
  - `tags` (StringProperty - JSON массив тегов) ✅
  - `metadata` (StringProperty - JSON объект) ✅
- [x] Создать CollectionProperty `df_objects` в Scene ✅
- [x] Реализовать функции синхронизации с manifest store через Forester API: ✅
  - [x] `sync_objects_from_manifest(commit_hash)` — загрузить объекты из manifest store ✅
  - [x] `save_object_to_manifest(obj)` — сохранить объект через API ✅
  - [x] `add_tag_to_object(object_name, tag, commit_hash)` - добавить тег ✅
  - [x] `remove_tag_from_object(object_name, tag, commit_hash)` - убрать тег ✅
  - [x] `set_object_metadata(object_name, key, value, commit_hash)` - установить метаданные ✅

**Операторы для работы с тегами:**
- [x] Создать оператор `DF_OT_tag_delete` - добавить тег 'DELETE' ✅
- [x] Создать оператор `DF_OT_tag_rename` - добавить тег 'RENAME' (с диалогом для нового имени) ✅
- [x] Создать оператор `DF_OT_tag_merge` - добавить тег 'MERGE' ✅
- [x] Создать оператор `DF_OT_tag_remove` - убрать тег ✅
- [ ] Создать универсальный оператор `DF_OT_tag_object` - добавить/убрать любой тег
- [x] Поддержка множественного выбора объектов (для всех операторов) ✅
- [x] Обработка ошибок при работе с manifest store ✅

**UI панель Mark To:**
- [x] Создать панель `DF_PT_mark_to_panel` в категории "Difference Machine" ✅
- [x] Показывать панель только если есть выбранные объекты ✅
- [x] Добавить кнопки для добавления тегов merge-операций:
  - "Tag: Delete" (иконка 'TRASH') ✅
  - "Tag: Rename" (иконка 'SORTALPHA') ✅
  - "Tag: Merge" (иконка 'ARROW_LEFTRIGHT') ✅
- [ ] Добавить универсальный селектор тегов (ComboBox или меню)
- [x] Показывать список объектов с их тегами:
  - Имя объекта, список тегов, новое имя (если RENAME), файл, коммит ✅
- [x] Добавить возможность убрать тег из списка ✅
- [ ] Загружать объекты из manifest store при открытии панели
- [ ] Фильтрация объектов по тегам

**Зависимости:** 1.2 (Forester - таблица objects)

**Оценка:** 15-20 часов (14.1 JSON: 3-4ч, 14.2: 2-3ч, 14.3: 4-5ч, 14.4: 3-4ч, синхронизация: 3-4ч)

---

#### 2.7 Background скрипты для merge операций
**Файлы:**
- `addons/blender/difference_machine/scripts/merge_apply_background.py` (новый)

**Задачи:**
- [ ] Создать скрипт для выполнения merge операций в background Blender
- [ ] Принимает аргументы:
  - `--blend_file` - путь к .blend файлу
  - `--objects_json` - JSON файл с объектами и их тегами
  - `--output_file` - путь для сохранения результата (опционально)
- [ ] Логика выполнения:
  1. Открыть .blend файл
  2. Прочитать объекты с тегами из JSON
  3. Применить в порядке: Delete → Rename → Merge
     - Delete: удалить объекты с тегом 'DELETE'
     - Rename: переименовать объекты с тегом 'RENAME' (использовать metadata.new_name)
     - Merge: заменить/добавить объекты с тегом 'MERGE' (использовать retrieve логику)
  4. Сохранить результат
- [ ] Обработка ошибок и логирование
- [ ] Возврат кода ошибки для обработки в addon UI

**Зависимости:** 2.1 (Replace Object), 2.6 (Mark To операторы)

**Оценка:** 6-7 часов

---

### Приоритет: Низкий

#### 2.8 Review UI в Addon
**Файлы:**
- `addons/blender/difference_machine/ui/ui_panels.py` (обновить)
- `addons/blender/difference_machine/operators/review_operators.py` (новый)
- `addons/blender/difference_machine/utils/forester_api.py` (обновить)

**Задачи:**
- [ ] Добавить секцию Review в панель Compare
- [ ] Показывать review комментарии для выбранного объекта (или текущего файла)
- [ ] Кнопка "Add Review" - добавить комментарий:
  - Диалог для ввода комментария
  - Автоматически определять `file_path` и `object_name`
  - Сохранять через Forester API (manifest store)
- [ ] Список review комментариев с автором и датой
- [ ] Синхронизация с manifest store через Forester API

**Зависимости:** 1.3 (Forester - таблица reviews)

**Оценка:** 3-4 часа

---

#### 2.9 Скрипт для открытия редактора с фокусом на объекте
**Файлы:**
- `addons/blender/difference_machine/scripts/focus_object.py` (новый)

**Задачи:**
- [ ] Создать скрипт для Blender:
  - Принимает: `--blend_file`, `--object_name`
  - Открывает .blend файл
  - Выбирает объект по имени
  - Устанавливает фокус на объект (`bpy.ops.view3d.view_selected()`)
  - Опционально: запускает Blender в GUI режиме (не background) для просмотра

**Зависимости:** Нет

**Оценка:** 1-2 часа

---

## Приоритеты и последовательность

### Критический путь (MVP для Forester + Addon):

1. **Forester 1.1** - Синхронизация screenshot_hash ↔ screenshot_path ✅ (частично)
2. **Addon 2.4** - Обновление API wrapper для screenshot_path
3. **Forester 1.2** - Manifest store `objects` ✅
4. **Addon 2.6** - Реестр редакторов и Mark To панель

**Итого MVP:** ~25-34 часа

### Второстепенные функции (можно делать параллельно):

- **Addon 2.1** - Расширение Replace Object ✅ (выполнено)
- **Addon 2.2** - Расширение Compare Object ✅ (выполнено)
- **Addon 2.3** - История объектов ✅ (выполнено)
- **Addon 2.4** - Улучшенная работа со скриншотами ✅ (выполнено)
- **Addon 2.5** - Улучшение Save Asset ✅ (выполнено)
- **Addon 2.6** - Реестр объектов и Mark To панель ✅ (выполнено)
- **Addon 2.7** - Background скрипты для merge (6-7ч)

### Низкий приоритет:

- **Forester 1.3** - Review store ✅ (выполнено)
- **Addon 2.8** - Review UI в Addon (3-4ч)
- **Addon 2.9** - Скрипт focus_object (1-2ч)

---

## Оценка времени

### Минимальная версия (MVP):
- Forester: ✅ 8-11 часов (выполнено)
- Addon: 17-23 часа
- **Итого:** ~17-23 часа (осталось)

### Расширенная версия (с объектами и merge):
- Forester: ✅ 8-11 часов (выполнено)
- Addon: 53-71 час (2.1 и 2.2 выполнены: -12-16ч)
- **Итого:** ~41-55 часов (осталось)

### Полная версия (все функции):
- Forester: ✅ 10-14 часов (выполнено)
- Addon: 58-78 часов (2.1 и 2.2 выполнены: -12-16ч)
- **Итого:** ~46-62 часа (осталось)

---

## Заметки

1. **Обратная совместимость**: Все изменения должны сохранять обратную совместимость. Replace Object и Compare Object должны работать как раньше при использовании по умолчанию.

2. **Manifest store**: метаданные Blender-объектов в `.DFM/manifests/` — единый источник истины.

3. **Теги объектов**: Единая система тегов для объектов: 'DELETE', 'RENAME', 'MERGE', 'STABLE', 'EXPERIMENT', 'BUG', etc. Теги привязаны к коммиту.

4. **Порядок применения при merge**: Delete → Rename → Merge (по тегам)

5. **Ассеты**: Всегда исправлять пути к ассетам при извлечении объектов из коммитов (как в savepoints)

6. **Background скрипты**: Используются для выполнения merge операций без открытия GUI редактора

---

## Следующие шаги

**Выполнено:**
1. ✅ **Forester 1.1** — синхронизация screenshot_hash ↔ screenshot_path (roadmap 12.1)
2. ✅ **Forester 1.2** — manifest store `objects` (roadmap 14.1)
3. ✅ **Forester 1.3** — review store (roadmap 16.1)
4. ✅ **Addon 2.1** — Replace Object → Retrieve Objects (roadmap 9)
5. ✅ **Addon 2.2** — Compare Object → Ghost Objects (roadmap 10)
6. ✅ **Addon 2.3** — История объектов (roadmap 11)
7. ✅ **Addon 2.4** — Улучшенная работа со скриншотами (roadmap 12.1)
8. ✅ **Addon 2.5** — Save Asset: замена на link + реестр (roadmap 13.1–13.2). Остаётся: UI реестра (13.3), интеграция с коммитами (13.4)
9. ✅ **Addon 2.6** — Mark To: manifest store, объекты, операторы, панель (roadmap 14). Остаётся: DF_OT_tag_object, загрузка при открытии, фильтр по тегам, универсальный селектор тегов

**В работе / приоритет:**
10. **Addon 2.7** — Background скрипты для merge (roadmap 15.3)
11. **Addon 2.8** — Review UI в Addon (roadmap 16.3)
12. **Addon 2.9** — Скрипт focus_object (roadmap 16.4)
13. **Addon 2.5** — секция "Asset Registry" в UI, интеграция реестра с коммитами (roadmap 13.3–13.4)
14. **Addon 2.6** — универсальный селектор тегов, загрузка из manifest store при открытии панели, фильтрация по тегам
