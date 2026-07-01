# Операторы — каталог `df.*`

Все операторы: `bl_options` включает `REGISTER`; большинство — `UNDO`.

Префикс: `df.` (`bl_idname`).

---

## Init

| ID | Label | Module | Описание |
|----|-------|--------|----------|
| `df.init_project` | Init Project | init_operators | `repo.init` в `blend_file.parent` |

---

## Commit / Asset

| ID | Label | Module | Описание |
|----|-------|--------|----------|
| `df.save_version` | Save Version | commit_operators | save + add + commit (datetime msg) |
| `df.save_asset` | Save as Asset | commit_operators | dialog → export .blend + optional link |
| `df.select_assets_directory` | Select Assets Directory | commit_operators | file browser for assets_dir |
| `df.clear_tag_filter` | Clear Tag Filter | commit_operators | clears `tag_search_filter` |

---

## History / Compare

| ID | Label | Module | Properties |
|----|-------|--------|------------|
| `df.refresh_history` | Refresh History | history_operators | reload log current branch |
| `df.compare_project` | Compare | history_operators | `commit_hash` |
| `df.restore_version` | Restore This Version | history_operators | `commit_hash` |
| `df.compare_object` | Compare Object | history_operators | `commit_hash`, `ghost_mode` |
| `df.replace_mesh` | Retrieve Objects | history_operators | `commit_hash`, `replace_mode` |

### compare_object behavior

- Toggle off if same commit already active
- Extract → link → offset collection
- Ghost: WIRE + hide_select

### replace_mesh behavior

- Multi `context.selected_objects`
- `replace_mode=True`: remove originals after load
- `fix_retrieved_assets` for linked data paths

---

## Branches

| ID | Label | Module | Properties |
|----|-------|--------|------------|
| `df.refresh_branches` | Refresh Branches | branch_operators | fills `df_branches` |
| `df.load_branch_commits` | Load Branch Commits | branch_operators | `branch_name` |
| `df.switch_branch` | Switch Branch | branch_operators | `branch_name`, `auto_stash` |

---

## Locks

| ID | Label | Module |
|----|-------|--------|
| `df.check_locks` | Check Locks | lock_operators |
| `df.list_locks` | List Locks | lock_operators |
| `df.lock_current_blend` | Lock Files | lock_operators |
| `df.unlock_current_blend` | Unlock Files | lock_operators |

---

## GC / Maintenance

| ID | Label | Module | Properties |
|----|-------|--------|------------|
| `df.garbage_collect` | Garbage Collect | gc_operators | `dry_run` |
| `df.verify_repository` | Verify Repository | gc_operators | — |

---

## Config

| ID | Label | Module |
|----|-------|--------|
| `df.sync_preferences` | Sync with Config | config_operators |

---

## Mark To

| ID | Label | Module | Notes |
|----|-------|--------|-------|
| `df.tag_mark` | Mark | mark_operators | uses `selected_tag`; RENAME dialog |
| `df.tag_delete_mark` | Delete Mark | mark_operators | |
| `df.tag_clean_all_marks` | Clean All Marks | mark_operators | confirm |
| `df.tag_rename` | Tag: Rename | mark_operators | legacy → tag_mark |
| `df.tag_merge` | Tag: Merge | mark_operators | legacy → tag_mark |

---

## UILists (не операторы)

| ID | Data |
|----|------|
| `DF_UL_commit_list` | `scene.df_commits` |
| `DF_UL_branch_list` | `scene.df_branches` |
| `DF_UL_stash_list` | `scene.df_stashes` (no panel) |

---

## Background helpers (не bpy.ops)

| Module | Role |
|--------|------|
| `mesh_io.py` | save/load object to .blend |
| `object_export_background.py` | headless export |

**Forester script:** `sources/forester/scripts/merge_apply_background.py`

Args: `--blend_file`, `--objects_json`, `--output_file`

Order: Delete → Rename → Merge.
