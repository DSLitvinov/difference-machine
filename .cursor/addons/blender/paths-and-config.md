# Пути и конфигурация — Blender Addon

Канон нормализации: [paths.md](../../interface/paths.md).

---

## 1. Репозиторий Forester

| Концепт | Путь | Примечание |
|---------|------|------------|
| Repo root | каталог с `.DFM/` | `find_repository_root()` — walk-up от `blend_file.parent` |
| Object JSON cache | `.DFM/objects/{commit_hash}_objects.json` | локальная история объектов |
| Asset registry | `.DFM/assets_registry.json` | реестр Save Asset |
| Manifest objects | `.DFM/manifests/` | канон для Mark To (через API) |
| Screenshots | `.DFM/screenshots/{commit_hash}.png` | формат Forester; addon не пишет при коммите |
| tmp_review | `.DFM/tmp_review` | compare object / retrieve |
| Setup user config | `~/.dfm/setup.cfg` | shared с GUI |

---

## 2. Относительные пути (API / manifest)

- Всегда **forward slashes**: `assets/props/chair.blend`
- Нормализация: `helpers.repo_relative_path(repo, path)` — `ReplaceAll` `\` → `/`
- `get_blend_file_path(repo)` — путь текущего `.blend` относительно repo

---

## 3. `~/.dfm/setup.cfg`

Читается `utils/config_loader.py`. Секции:

| Section | Keys | Использование в addon |
|---------|------|----------------------|
| `user` | `name`, `email` | author коммитов, lock user |
| `gc` | `reflog.expire.days`, `interval.day` | GC preferences |
| `api` | `path` | путь к `libforester.*` / `forester.dll` |
| `forester` | `path` | CLI path → derive `../lib/` |
| `blender` | `path` | `get_blender_executable()` (background scripts) |

Запись из addon:

- `save_user_config` — при смене author/email в preferences
- `save_gc_config` — при смене reflog/interval
- `df.sync_preferences` — reload из cfg

---

## 4. API bundle (addon)

```
difference_machine/api/
├── libforester.so | .dylib | forester.dll   # platform-specific
└── python/
    └── python_bindings_json.py
```

Сборка: `./builder/build.sh` копирует артефакты автоматически.

---

## 5. Логи

| Файл | Содержимое |
|------|------------|
| `~/blender_addon.log` | addon DEBUG log |

---

## 6. Blender files scope (locks / status)

`get_blender_files()`:

1. Текущий `bpy.data.filepath` (если exists)
2. Внешние `bpy.data.images` с `filepath`, не `packed_file`

Packed textures **не** входят в lock scope.

---

## 7. Assets directory resolution

`Save Asset` — `assets_dir` относительно repo root или absolute (с warning если вне repo):

```
repo_path / assets_dir / category / {asset_name}.blend
```

Default: `assets/{category}/` где category из map типа объекта (mesh→props, light→lights, …).
