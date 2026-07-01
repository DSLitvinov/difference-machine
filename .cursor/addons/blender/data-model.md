# Модель данных — Blender Addon

Все custom properties на `bpy.types.Scene` unless noted.

---

## 1. `df_commit_props` — `DFCommitProperties`

| Property | Type | Default | UI / поведение |
|----------|------|---------|----------------|
| `branch` | String | `"main"` | fallback если status недоступен |
| `message` | String | `""` | не используется Save Version |
| `commit_tag` | String | `""` | не используется Save Version |
| `tag_search_filter` | String | `""` | фильтр `df_commits`; update callback |
| `load_commit_tab` | Enum | `PROJECT` | `PROJECT` \| `SELECTED` — Compare panel tabs |
| `offset_axis` | Enum | `X` | Compare Object offset |
| `offset_value` | Float | `2.0` | Compare Object offset; live update linked objs |
| `replace_mode` | Bool | `True` | Retrieve: replace vs append |
| `ghost_mode` | Bool | `False` | Compare Object wireframe |
| `selected_tag` | Enum | `DELETE` | `DELETE` \| `RENAME` \| `MERGE` — Mark To |

---

## 2. Commit list

### `df_commits` / `df_commits_all` — `CollectionProperty(DFCommitItem)`

| Field | Type | Notes |
|-------|------|-------|
| `hash` | String | 64 hex |
| `message` | String | |
| `author` | String | |
| `timestamp` | Int | Unix |
| `commit_type` | String | default `"project"` |
| `selected_mesh_names` | String | JSON (legacy) |
| `screenshot_path` | String | repo-relative |
| `screenshot_hash` | String | deprecated alias |
| `tag` | String | commit tag |
| `is_selected` | Bool | |
| `is_head` | Bool | HEAD indicator in UIList |

- `df_commits_all` — полный список после refresh
- `df_commits` — отфильтрованный по `tag_search_filter`

`df_commit_list_index` — активный коммит в UIList.

---

## 3. Branches

### `df_branches` — `DFBranchItem`

| Field | Notes |
|-------|-------|
| `name` | branch name |
| `commit_count` | from `log.get` limit 200 |
| `last_commit_hash` | |
| `last_commit_message` | |
| `is_current` | |
| `parent_branch` | не заполняется в текущем UI |

`df_branch_list_index` — активная ветка в UIList (панель Compare).

### `df_stashes` — `DFStashItem`

Зарегистрировано; UI stash list не подключён к панелям.

---

## 4. Compare state (Scene)

| Property | Type | Purpose |
|----------|------|---------|
| `df_project_comparison_active` | Bool | Compare Project toggle |
| `df_project_comparison_commit_hash` | String | active compare commit |
| `df_compare_object_active` | Bool | Compare Object toggle |
| `df_compare_object_commit_hash` | String | |
| `df_compare_object_linked_name` | String | legacy single-object |
| `df_compare_object_original_location` | FloatVector[3] | offset baseline |

Module-level `_compare_object_state` / `_replace_state` в `history_operators.py` — runtime linked object refs.

---

## 5. Object marks — `df_objects` (`DFObject`)

| Field | Type | Content |
|-------|------|---------|
| `object_name` | String | Blender object name |
| `object_type` | String | `MESH`, `LIGHT`, … |
| `file_path` | String | repo-relative `.blend` |
| `commit_hash` | String | target commit for mark |
| `tags` | String | JSON array, e.g. `["MERGE"]` |
| `metadata` | String | JSON object, e.g. `{"new_name": "Chair_v2"}` |

`df_object_marks_loaded_key` — cache key для lazy load из manifest (`object_mark_sync`).

### Tag conflicts

- `MERGE` + `DELETE` на одном объекте — запрещено
- Синхронизация: `sync_object_entry_to_forester` → `object.add` с `editor="blender"`

### Target commit resolution

`get_target_commit_hash(context, repo)`:

1. `df_commits[df_commit_list_index].hash` если список не пуст
2. Иначе `status.head`

---

## 6. Object metadata (history)

### Extracted fields (`extract_object_data`)

```json
{
  "matrix": [[4x4]],
  "bbox": { "min": [3], "max": [3] },
  "v_count": 0,
  "type": "MESH"
}
```

### Change types (`object_history.compare_object_history`)

| Type | Условие |
|------|---------|
| `CREATED` | первое появление в file |
| `MAJOR` | значительное изменение геометрии |
| `MINOR` | мелкое изменение |
| `MOVED` | смена transform без геометрии |
| `RECORD` | запись без детектированного diff |

### Storage

- File: `.DFM/objects/{commit_hash}_objects.json`
- Structure: `{ "path/to/file.blend": { "ObjectName": { ...data } } }`
- LRU cache on `load_object_data` (max 32)

`ensure_objects_for_commit` — создаёт JSON из текущей сцены и пушит в manifest если JSON отсутствует.

---

## 7. Asset registry entry

`.DFM/assets_registry.json`:

```json
{
  "assets/props/chair.blend": {
    "object_name": "Chair",
    "object_type": "MESH",
    "category": "props",
    "updated_at": "ISO8601"
  }
}
```

---

## 8. WindowManager transient keys

| Key | Set by | Consumed by |
|-----|--------|-------------|
| `df_current_assets_dir` | save_asset invoke | select_assets_directory |
| `df_selected_assets_dir` | select_assets_directory | save_asset dialog |
