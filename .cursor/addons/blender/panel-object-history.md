# Панель Object History

**Класс:** `DF_PT_object_history_panel`  
**Расположение:** View3D Sidebar → Difference Machine (`bl_order = 3`)  
**Исходник:** `ui/ui_panels.py`, `utils/object_history.py`

---

## Poll

- `is_repository_initialized(context)`
- `context.active_object is not None`

---

## Layout

```
Object: {name}
Type: {type}
File: {repo_relative_blend_path}

History Timeline
  [icon] {hash16}… {CHANGE_TYPE} {N verts}
    message… by author        (first 5 entries)
    [ View Commit ]           (df.refresh_history — jump not implemented)
  …
```

Показывается до **10** версий (most recent first в UI; данные sorted old→new в util).

---

## Data source

1. `schedule_object_history` — кэш + timer; `compare_object_history` **не** вызывается из `draw()`
2. `log.get(path=file_relative)` — commits touching file
3. For each commit: `load_object_data(commit_hash)` from `.DFM/objects/{hash}_objects.json`
4. Diff vs previous → change type

---

## Change type icons

| Type | Blender icon |
|------|--------------|
| CREATED | ADD |
| MAJOR | MODIFIER_ON |
| MINOR | GREASEPENCIL |
| MOVED | ARROW_LEFTRIGHT |
| RECORD | FILE_BLEND |
| (default) | DOT |

---

## Empty states

| State | Copy |
|-------|------|
| No object | No object selected |
| No repo | Repository not found |
| Unsaved blend | Please save the Blender file first |
| No history | No history found / Object history will appear after commits |
| Error | Error loading history + exception text |

---

## View Commit button

Вызывает `df.refresh_history` — **не** позиционирует список на конкретный commit (noted in code comment). Спека: кнопка informational until dedicated operator exists.

---

## Связь с object JSON

История зависит от наличия `.DFM/objects/{commit}_objects.json`. Создание:

- `save_object_data` при commit flow (если подключено)
- `ensure_objects_for_commit` — fallback из текущей сцены

См. [data-model.md](./data-model.md) § Object metadata.
