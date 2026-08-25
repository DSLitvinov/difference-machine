# Difference Machine — Blender Addon

Системная документация аддона версии **0.8.0** для Blender **≥ 4.5.0**.

**Исходники:** `sources/addons/blender/difference_machine/`  
**Канон VCS API:** [jsonapi.md](../../gui/gui_backend/jsonapi.md) · пути [path-normalization](../../rules/path-normalization.mdc)  
**Сборка API:** `sources/addons/blender/difference_machine/API_SETUP.md`

---

## 1. Назначение

Аддон встраивает Forester VCS в рабочий процесс Blender: инициализация репозитория, коммиты, сравнение версий проекта и объектов, пометки для merge, блокировки файлов, история объектов, сохранение ассетов.

**Расположение UI:** `View3D > Sidebar (N) > Difference Machine`  
**Транспорт:** нативная библиотека Forester + JSON bindings (`ForesterOpen` / `ForesterCall`), без CLI-fallback.

---

## 2. Модульная структура

```
difference_machine/
├── __init__.py              # register/unregister, timers
├── blender_manifest.toml    # Extension manifest (Blender 4.5+)
├── preferences.py           # AddonPreferences
├── properties/              # Scene PropertyGroups, UIList items
├── operators/               # bpy.ops.df.*
├── scripts/                 # headless helpers (merge_apply_background.py)
├── ui/                      # Panels, UILists
├── utils/                   # API wrapper, helpers, sync, caches
└── api/                     # libforester.* + python/python_bindings_json.py
```

| Модуль | Роль |
|--------|------|
| [preferences.md](./preferences.md) | Автор, GC, auto-save |
| [data-model.md](./data-model.md) | `Scene.df_*`, manifest objects |
| [operators.md](./operators.md) | Каталог `df.*` операторов |
| [api-integration.md](./api-integration.md) | Обёртка Forester API |
| [paths-and-config.md](./paths-and-config.md) | `~/.dfm/setup.cfg`, пути репо |

---

## 3. Панели (порядок `bl_order`)

Панели в одной категории **Difference Machine**, сверху вниз:

| `bl_order` | Панель | Спека | `poll` |
|------------|--------|-------|--------|
| 0 | Save Version | [panel-save-version.md](./panel-save-version.md) | репо инициализировано |
| 1 | Save as Asset | [panel-save-asset.md](./panel-save-asset.md) | всегда |
| 2 | Compare | [panel-compare.md](./panel-compare.md) | всегда |
| 3 | Object History | [panel-object-history.md](./panel-object-history.md) | репо + active object |
| 4 | File Locks | [panel-file-locks.md](./panel-file-locks.md) | всегда |
| 5 | Mark To | [panel-mark-to.md](./panel-mark-to.md) | репо инициализировано |

Если репозиторий не инициализирован, панели **Save as Asset**, **Compare**, **File Locks** показывают блок ошибки + кнопку **Init Project** (кроме случаев, когда файл не сохранён — тогда подсказка «save first»).

---

## 4. Жизненный цикл

### 4.1 Register

1. `preferences` → `properties` → `operators` → `ui`
2. `prefs.load_from_config()` — синхронизация с `~/.dfm/setup.cfg`
3. Таймеры:
   - `auto_save.check_scheduled_gc` — каждые 60 с
   - `auto_save.check_auto_save_version` — каждые 10 с (persistent)

### 4.2 Unregister

1. Снятие таймеров
2. `ui` → `operators` → `properties` → `preferences`
3. `close_api()` — закрытие нативного handle

### 4.3 Логирование

- Файл: `~/blender_addon.log`
- Уровень при старте: `DEBUG`

---

## 5. Предусловия работы

| Условие | Поведение |
|---------|-----------|
| `.blend` не сохранён | Операции с репо отклоняются; Init/Save Version недоступны |
| Нет `.DFM/` вверх по дереву от `.blend` | «Repository not initialized»; **Init Project** создаёт репо в `blend_file.parent` |
| Forester API недоступен | Все VCS-операции fail с «Forester API not available» |
| Путь вне репо | `get_repository_path()` → ошибка |

**Корень репо:** каталог, содержащий `.DFM/` (walk-up от директории `.blend`).

---

## 6. Фоновые процессы

| Процесс | Интервал | Условие |
|---------|----------|---------|
| Auto Save Version | prefs interval (мин) | `auto_save_enabled`, сохранённый `.blend`, репо найден |
| Scheduled GC | prefs hour/minute + interval_days | `gc_schedule_enabled`, репо найден |

Auto Save: `wm.save_mainfile` → `index.add(".")` → `commit.create` с сообщением `YYYY-MM-DD HH:MM:SS`.

---

## 7. Связь с GUI (Wails)

| Область | GUI | Addon |
|---------|-----|-------|
| Project / History views | полный VCS UI | узкий sidebar в Blender |
| Merge dialog | `merge.*`, object list | Mark To + background merge script |
| Branch rename/create/delete | есть | частично (load commits; нет UI rename/create) |
| Diff / preview grid | есть | нет (compare через tmp_review / linked objects) |
| Locks | badge + actions | File Locks panel |
| Object metadata | manifest store | Mark To, Object History |

Полный аудит: [coverage.md](./coverage.md).

---

## 8. Внешние скрипты

| Скрипт | Расположение | Использование |
|--------|--------------|---------------|
| `merge_apply_background.py` | `scripts/` | Merge по тегам DELETE → RENAME → MERGE (background Blender). Forester: `--factory-startup`, timeout 15m, `os._exit` после скрипта. Путь из `[addons] diffmachine_path` |
| `object_export_background.py` | `operators/` | Экспорт объектов в background (вспомогательный) |

Аддон **не** содержит `scripts/focus_object.py` (запланировано в roadmap).

---

## 9. Решения и ограничения

1. **API-only** — нет legacy CLI-пути; в preferences отображается «API-only mode».
2. **Относительные пути** — в API всегда `/` ([paths.md](../../interface/paths.md)).
3. **Commit hash** — строго 64 hex (SHA-256); невалидные записи в log пропускаются.
4. **Compare project** — toggle: повторный клик вызывает `compare.extract(cleanup=True)`.
5. **Compare object** — извлечение в `.DFM/tmp_review`, link через `bpy.data.libraries.load`.
6. **Mark To** — marks привязаны к коммиту из списка Compare (или HEAD); синхронизация в manifest store немедленная.
7. **Object history JSON** — `.DFM/objects/{commit_hash}_objects.json` (локальный кэш); manifest store — канон для Mark To.
8. **Draw/poll не блокируют** — `Panel.draw` / `poll` не вызывают Forester API и не делают `bpy.ops`. Auto-refresh, object history и lock status идут через timer + TTL-кэш.

---

## 10. Roadmap (не в спеках UI)

См. `.cursor/commands/forester_addon_new_features.md`:

- Review UI (2.8)
- Asset Registry UI в панели Save Asset (2.5)
- Универсальный селектор тегов Mark To (2.6)
- `focus_object.py` (2.9)
- Viewport screenshot при коммите (`viewport_capture.py` есть, в commit flow не подключён)
