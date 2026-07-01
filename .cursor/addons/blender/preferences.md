# Addon Preferences

**Класс:** `DifferenceMachinePreferences`  
**bl_idname:** package name (`difference_machine`)  
**Исходник:** `preferences.py`

Доступ: Edit → Preferences → Add-ons → Difference Machine.

---

## Sections

### Save Version

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `auto_save_enabled` | Bool | False | Auto save + commit |
| `auto_save_interval` | Int | 5 | Minutes (1–60) |

Info line: *When enabled, file is saved and committed automatically*

### Commit Settings

| Property | Default | Sync |
|----------|---------|------|
| `default_author` | `"Unknown"` | → `setup.cfg` `[user] name` |
| `user_email` | `""` | → `[user] email` |

**Status box:** *API-only mode: legacy features disabled*

**Sync with Config** — `df.sync_preferences` reload from cfg.

### Garbage Collection

Visible when saved `.blend` in initialized repo.

| Property | Default | Notes |
|----------|---------|-------|
| Garbage Collect Now | button | `df.garbage_collect(dry_run=False)` |
| `reflog_expire_days` | 90 | 1–3650; → cfg |
| `gc_schedule_enabled` | False | enables timer |
| `gc_schedule_hour` | 2 | 0–23 |
| `gc_schedule_minute` | 0 | 0–59 |
| `gc_schedule_interval_days` | 7 | 1–365 |
| `gc_last_run` | 0.0 | timestamp display if > 0 |

If no repo: *Save Blender file to enable garbage collection tools*

### Repository Maintenance

| Control | Operator |
|---------|----------|
| Verify Repository | `df.verify_repository` → `repo.rebuild` |

Info: *Scan object store and report counts*

---

## load_from_config

On addon register:

- `get_user_config()` → author, email
- `get_gc_config()` → reflog_expire_days, interval_days

---

## Update callbacks

| Property change | Action |
|-----------------|--------|
| default_author | `save_user_config` |
| user_email | `save_user_config` |
| reflog_expire_days | `save_gc_config` |
| gc_schedule_interval_days | `save_gc_config` |
