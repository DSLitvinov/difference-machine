# Forester API — интеграция в Blender Addon

Канон методов: [jsonapi.md](../../gui/gui_backend/jsonapi.md), dispatch: `sources/backend/forester/internal/jsonapi/dispatch.go`.

Обёртка: `utils/forester_api.py` → singleton `get_api()` / `close_api()`.

---

## 1. Загрузка библиотеки

Порядок разрешения `api` path ([paths-and-config.md](./paths-and-config.md)):

1. `~/.dfm/setup.cfg` → `[api] path`
2. Sibling `lib/` от `[forester] path` (portable install)
3. `addon/api/libforester.*` / `forester.dll`

Python bindings: **только** `addon/api/python/python_bindings_json.py` (синхрон с `sources/forester/api/python_bindings_json.py`).

При `ImportError` — `_API_AVAILABLE = False`; все методы wrapper возвращают ошибку «Forester API not available».

---

## 2. Методы, используемые аддоном

| Wrapper method | JSON method | Использование в addon |
|----------------|-------------|----------------------|
| `init` | `repo.init` | Init Project |
| `status` | `status.get` | branch/head, poll панелей |
| `add` | `index.add` | Save Version, Restore, Auto Save |
| `commit` | `commit.create` | Save Version, Restore, Auto Save |
| `log` | `log.get` | Compare panel, Object History (`path` filter) |
| `switch` | `repo.switch` | Compare panel `df.switch_branch` |
| `get_branches` | `branch.list` | `df.refresh_branches` |
| `create_branch` | `branch.create` | wrapper only |
| `delete_branch` | `branch.delete` | wrapper only |
| `rename_branch` | `branch.rename` | wrapper only |
| `compare_extract` | `compare.extract` | Compare Project (toggle) |
| `restore_version` | `restore.version` | Restore This Version |
| `restore_file` | `restore.file` | wrapper only |
| `get_commit` | `commit.get` | wrapper only |
| `gc` | `gc.run` | Garbage Collect |
| `rebuild` | `repo.rebuild` | Verify Repository |
| `list_locks` | `lock.list` | File Locks panel |
| `acquire_lock` | `lock.acquire` | Lock Files |
| `release_lock` | `lock.release` | Unlock Files |
| `add_object` | `object.add` | Mark To sync |
| `get_object` | `object.get` | object_mark_sync load |
| `get_objects_by_commit` | `object.list` | Mark To load |
| `get_objects_by_file` | `object.list_by_file` | wrapper |
| `add_tag_to_object` | object tag methods | via `add_object` |
| `remove_tag_from_object` | object tag methods | via sync |
| `delete_object` | `object.delete` | Delete mark |
| `delete_objects_by_file` | `object.delete_by_file` | Clean all marks |
| `set_object_metadata` | object metadata methods | RENAME `new_name` |
| `revert_commit` | `commit.revert` | wrapper only |
| `reset_commit` | `commit.reset` | wrapper only |

---

## 3. Не используемые в addon (есть в Forester)

| Область | Методы | Примечание |
|---------|--------|------------|
| Merge | `merge.status`, `merge.start`, `merge.continue`, `merge.abort` | merge через Mark To + background script |
| Workdir / preview | `workdir.*` | GUI-only |
| Diff | `diff.*`, `blob.get` | GUI-only |
| Review | review store API | roadmap 2.8 |

---

## 4. Контракты вызовов по сценариям

### 4.1 Save Version

```
wm.save_mainfile
→ index.add(repo, ["."])
→ commit.create(repo, message=datetime, author=prefs.default_author)
```

Auto Save — тот же pipeline без ручного нажатия.

### 4.2 Compare Project (on)

```
compare.extract(repo, commit_hash, cleanup=false, editor_path=bpy.app.binary_path)
→ scene.df_project_comparison_active = true
```

### 4.3 Compare Project (off / toggle)

```
compare.extract(repo, commit_hash, cleanup=true)
→ scene.df_project_comparison_active = false
```

### 4.4 Restore This Version

```
restore.version(repo, commit_hash)
→ index.add(repo, ["."])
→ commit.create(repo, "Restore version … from commit …")
→ wm.open_mainfile(same path)  # reload from disk
```

### 4.5 Compare Object

1. Extract commit → `.DFM/tmp_review` (внутренний helper `_extract_commit_to_tmp_review`)
2. `bpy.data.libraries.load(tmp_blend, link=True)` — linked reference objects
3. Offset по `df_commit_props.offset_axis/value`
4. Ghost mode: `display_type=WIRE`, `hide_select=True`
5. Cleanup: удаление collection `Compare_Reference_{hash}`

### 4.6 Retrieve Objects (`df.replace_mesh`)

1. Extract to tmp_review
2. `libraries.load` — append или replace по `replace_mode`
3. `asset_path.fix_retrieved_assets` — пути images/libraries/sounds/…

### 4.7 Mark To

```
get_target_commit_hash()  # selected commit in Compare list OR status.head
→ add_object(editor="blender", file_path, object_name, type, commit_hash, object_data, tags, metadata)
```

Удаление последнего тега → `object.delete`.

### 4.8 Locks

- Lock scope: `get_blender_files()` — текущий `.blend` + внешние текстуры (`bpy.data.images`, не packed)
- Author: `format_author_name(prefs.default_author, prefs.user_email)`
- `lock_type=0` (exclusive), `expire_hours=0`

---

## 5. Нормализация ответов

`ForesterAPIWrapper._commit_dict` приводит commit к:

```python
{
  "hash", "message", "author", "tag", "timestamp",
  "screenshot_path", "screenshot_hash",  # screenshot_hash = fallback
  "is_head",
}
```

`status` → `{ branch, head, modified, deleted, untracked }` (упрощённо для UI).

---

## 6. Ошибки

- Все публичные методы: `Tuple[bool, …, Optional[str] error]`
- UI: `operator.report({'ERROR'|'WARNING'|'INFO'}, msg)`
- Нет silent fallback на файловые операции без API
