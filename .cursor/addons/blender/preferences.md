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

Тот же `~/.dfm/setup.cfg` `[gc]`, что GUI Settings [`6056:12410`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=6056-12410).

| Property / control | Default | Notes |
|----------|---------|-------|
| `gc_enabled` | False | → `[gc] enabled` — Delete commits in the reflog (days) |
| `reflog_expire_days` | 90 | 1–3650; → `[gc] reflog.expire.days` |
| `gc_schedule_enabled` | False | → `[gc] schedule.enabled` — Delete on a schedule |
| `gc_interval_days` | 7 | 1–365; → `[gc] interval.day` — Every days |
| `gc_schedule_time` | `07:00` | → `[gc] schedule.hour` / `schedule.minute` — Time (24 h) |
| Remove now | button | `df.garbage_collect(dry_run=False)` → `gc.run`; пишет `[gc] last.run`. Disabled без репо |

Автозапуск, если `schedule.enabled`, прошло `interval.day` дней с `last.run`, и локальное время ≥ `schedule.hour`:`schedule.minute`. Если `last.run` = 0, автозапуск не стартует.

If no repo: *Save Blender file to run garbage collection*

### Repository Maintenance

| Control | Operator |
|---------|----------|
| Verify Repository | `df.verify_repository` → `repo.rebuild` |

Info: *Scan object store and report counts*

---

## load_from_config

On addon register:

- `get_user_config()` → author, email
- `get_gc_config()` → enabled, reflog_expire_days, schedule_enabled, interval_days, schedule_hour, schedule_minute, last_run

---

## Update callbacks

| Property change | Action |
|-----------------|--------|
| default_author | `save_user_config` |
| user_email | `save_user_config` |
| gc_enabled | `save_gc_config` |
| reflog_expire_days | `save_gc_config` |
| gc_schedule_enabled | `save_gc_config` |
| gc_interval_days | `save_gc_config` |
| gc_schedule_time | `save_gc_config` |
