# Панель Mark To

**Класс:** `DF_PT_mark_to_panel`  
**Расположение:** View3D Sidebar → Difference Machine (`bl_order = 5`)  
**Исходник:** `ui/ui_panels.py`, `operators/mark_operators.py`

---

## Poll

`is_repository_initialized(context)`

---

## Layout

```
{ N } object(s) selected        ← always shown (N may be 0)

Tag Operations
  Tag: [ DELETE ▼ ]             ← selected_tag enum
  [ Mark ]  [ Delete Mark ]
  [ Clean all Mark ]

Tagged Objects                  ← if df_objects non-empty
  {name}  DELETE MERGE …
    → {new_name}                ← if RENAME metadata
  — OR —
  No tags on selected objects
```

При `draw`: `schedule_ensure_marks_loaded(context, repo_path)` — lazy load из manifest.

---

## Target commit

Marks применяются к:

1. Commit, выбранный в **Compare** UIList (`df_commit_list_index`)
2. Иначе **HEAD** (`status.get`)

Ошибка если commit не определён: *"No commit selected. Select a commit in Compare panel or ensure HEAD exists."*

---

## Tags

| Tag | Enum | Special behavior |
|-----|------|------------------|
| DELETE | DELETE | mark for deletion on merge |
| RENAME | RENAME | dialog `new_name` → metadata |
| MERGE | MERGE | mark for retrieve on merge |

**Conflicts:** DELETE ↔ MERGE на одном объекте запрещены.

---

## Operators

| Button | Operator | Notes |
|--------|----------|-------|
| Mark | `df.tag_mark` | RENAME opens dialog; enabled if selection |
| Delete Mark | `df.tag_delete_mark` | removes `selected_tag` |
| Clean all Mark | `df.tag_clean_all_marks` | confirm dialog; scope = current file + target commit |

Legacy operators (registered, not in panel buttons):

- `df.tag_rename` → delegates to tag_mark
- `df.tag_merge` → sets MERGE + tag_mark

---

## Tagged Objects list

Фильтр: `entry.commit_hash == get_target_commit_hash()`.

Для каждой записи:

- object name
- tags with icons (DELETE→TRASH, RENAME→SORTALPHA, MERGE→ARROW_LEFTRIGHT)
- arrow line `→ new_name` if RENAME metadata

---

## Sync

Каждое изменение → `sync_object_entry_to_forester`:

- `object.add(editor="blender", …)` with `extract_object_data`
- Пустые tags → `object.delete`

См. [api-integration.md](./api-integration.md) § Mark To.

---

## Roadmap gaps

- Универсальный tag selector (не только DELETE/RENAME/MERGE)
- Фильтрация списка по тегам
- `df.tag_object` universal operator

См. `.cursor/commands/forester_addon_new_features.md` § 2.6.

---

## Selection UX note

Tag Operations visible always; кнопки **Mark** / **Delete Mark** disabled без selection. При отсутствии selection показывается info box «No objects selected».
