# Панель File Locks

**Класс:** `DF_PT_lock_panel`  
**Расположение:** View3D Sidebar → Difference Machine (`bl_order = 4`)  
**Исходник:** `ui/ui_panels.py`, `operators/lock_operators.py`

---

## Poll

Всегда `True`.

---

## States

### Repository not initialized

```
⚠ Repository not initialized
```

(без Init button — в отличие от Save Asset / Compare)

### Repository OK

```
┌─────────────────────────────┐
│ [ Check Current Files ]     │  df.check_locks
│ [ Lock Files ]              │  df.lock_current_blend (needs filepath)
│ [ Unlock Files ]            │  df.unlock_current_blend
│ [ List All Locks ]          │  df.list_locks
│ ─────────────────────────── │
│ Lock status box             │
└─────────────────────────────┘
```

---

## Lock status box

`check_locked_files(repo_path)` при каждом draw:

**If locked (Blender-relevant files):**

```
⚠️ {N} file(s) locked:
  {filename} (exclusive|shared) by {user} until {datetime}
  … up to 5 entries
  … and {M} more
```

**If none:**

```
✓ No locked files
```

---

## Lock scope

`get_blender_files()`:

1. Current `.blend`
2. External image textures (not packed)

---

## Lock author

`format_author_name(prefs.default_author, prefs.user_email)` — must match for unlock.

`is_lock_owner` compares full string and display name part.

---

## API

| Action | Method | Params |
|--------|--------|--------|
| Lock | `lock.acquire` | exclusive (`lock_type=0`), `expire_hours=0` |
| Unlock | `lock.release` | only if owner |
| List | `lock.list` | all branch locks |

---

## Operators reports

| Operator | Success | Failure |
|----------|---------|---------|
| check_locks | INFO no locks / WARNING N locked | ERROR no repo |
| list_locks | INFO count | ERROR API |
| lock_current_blend | INFO N locked | WARNING partial fail |
| unlock_current_blend | INFO N unlocked | WARNING not owner / not locked |
