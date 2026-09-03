# Панель Save as Asset

**Класс:** `DF_PT_save_asset_panel`  
**Расположение:** View3D Sidebar → Difference Machine (`bl_order = 1`)  
**Исходник:** `ui/ui_panels.py`, оператор `operators/commit_operators.py`

---

## Poll

Всегда `True`.

---

## States

### A. Repository not initialized

```
┌─────────────────────────────┐
│ ⚠ Repository not initialized│
│ ℹ Please save the Blender   │  (если нет filepath)
│   file first                │
│ ─ OR ─                      │
│ ┌─────────────────────────┐ │
│ │     Init Project        │ │  ← df.init_project
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

### B. No object selected

```
┌─────────────────────────────┐
│ ℹ No object selected        │
│   Select an object to save  │
│   as asset                  │
└─────────────────────────────┘
```

### C. Object selected, repo OK

```
┌─────────────────────────────┐
│ Save as Asset               │
│ ┌─────────────────────────┐ │
│ │ Save Selected Object    │ │  ← df.save_asset
│ └─────────────────────────┘ │
│ ℹ Save {Type} as separate │
│   .blend file               │
└─────────────────────────────┘
```

---

## Диалог `df.save_asset`

Открывается через `invoke_props_dialog` (width 400).

| Field | Default | Notes |
|-------|---------|-------|
| Object type | read-only label | из выбранного объекта |
| Assets Directory | `"assets"` | + кнопка `df.select_assets_directory` (FILEBROWSER) |
| Category | map по типу | mesh→props, light→lights, camera→cameras, … |
| Asset Name | имя объекта | sanitized для FS |
| Replace with Link | `True` | после save — link вместо original |

---

## Execute flow

1. Сохранить объект в `{repo}/{assets_dir}/{category}/{name}.blend` (`mesh_io._save_object_to_blend`)
2. `add_asset_to_registry` → `.DFM/assets_registry.json`
3. Если `replace_with_link`:
   - Запомнить collections оригинала
   - Удалить оригинал
   - `libraries.load(link=True)`
   - Переименовать linked → original name
   - Вернуть в те же collections, select active
4. On error — попытка восстановить оригинал

---

## Не в UI (roadmap)

- Секция Asset Registry (browse/search)
- Предупреждение missing asset при load commit

См. [coverage.md](./coverage.md) § Assets.
