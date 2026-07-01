# Панель Compare

**Класс:** `DF_PT_compare_panel`  
**Расположение:** View3D Sidebar → Difference Machine (`bl_order = 2`)  
**Исходник:** `ui/ui_panels.py`

---

## Poll

Всегда `True`.

---

## Структура (repo initialized)

```
Branch
  { UIList df_branches }       ← DF_UL_branch_list, 4 rows (* = checked out)
  — OR —
  No branches / [ Refresh Branches ]  ← df.refresh_branches (auto on empty)
  [ Refresh ] [ Switch Branch ] [ Load Commits ]
                ↑ hidden when selected row is current (*)

Commits
  { UIList df_commits }        ← DF_UL_commit_list, 5 rows
  — OR —
  No commits / [ Refresh ]     ← df.refresh_history (auto on empty)

  ( Project | Selected Object )  ← load_commit_tab expand

── Tab: Project ──
  Author / Hash / Message / Tag
  HEAD: true (if is_head)
  [ Compare ]                  ← df.compare_project (depress if active)
  [ Restore This Version ]     ← df.restore_version

── Tab: Selected Object ──
  Selected {Type}: {name}
  Commit + Object info
  Offset: ( X | Y | Z ) + value
  Ghost Mode [ ]
  [ Compare Object ]           ← df.compare_object
  Replace Mode [ ]
  [ Retrieve Objects ]         ← df.replace_mesh
  N object(s) selected
```

---

## Branch section

**UIList:** `DF_UL_branch_list`

| Row content | Condition |
|-------------|-----------|
| `* {name}` + commit count | `is_current` (checked-out branch) |
| `{name}` + commit count | otherwise |

**Auto-refresh:** если `len(df_branches)==0` и file saved → `bpy.ops.df.refresh_branches()` (best-effort). После refresh выбирается строка с `is_current`.

| Control | Operator |
|---------|----------|
| Refresh Branches | `df.refresh_branches` — заполняет `df_branches`, выделяет текущую ветку |
| Switch Branch | `df.switch_branch` — `repo.switch` на выбранную строку; reload `.blend`; скрыта для `is_current` |
| Load Commits | `df.load_branch_commits` — log для **выбранной** строки (`df_branch_list_index`); browse-only |

**Switch Branch:** при незакоммиченных изменениях — диалог с `auto_stash` (default on). После switch: refresh branches, load commits, `wm.open_mainfile`.

---

## Commit list

**UIList:** `DF_UL_commit_list`

| Row content | Condition |
|-------------|-----------|
| `HEAD` + message (trunc 50) | `is_head` |
| message + icon COMMUNITY | otherwise |

**Auto-refresh:** если `len(df_commits)==0` и file saved → `bpy.ops.df.refresh_history()` (best-effort).

**Backup model:** refresh заполняет `df_commits_all`, затем копирует в `df_commits` с учётом `tag_search_filter` (поле фильтра в UI **отсутствует** — prop только).

---

## Tab: Project

### Commit details (selected row)

| Label | Source |
|-------|--------|
| Author | `commit.author` |
| Hash | full hash |
| Message | `commit.message` |
| Tag | `commit.tag` or `"(нет)"` |
| HEAD | if `is_head` |

### Compare (project)

Toggle operator `df.compare_project`:

- **On:** `compare.extract(cleanup=false, editor_path=bpy.app.binary_path)` — открывает extracted commit в новом Blender
- **Off:** `compare.extract(cleanup=true)`
- Button `depress` when `df_project_comparison_active` && hash match

### Restore This Version

`df.restore_version` — полный `restore.version`, затем commit «Restore version …», reload `.blend`.

---

## Tab: Selected Object

**Требования:** `context.active_object` + выбранный commit в списке.

### Offset

- `offset_axis`: X / Y / Z (expand)
- `offset_value`: float, default 2.0
- Update callback двигает linked compare objects live

### Compare Object

| Control | Property |
|---------|----------|
| Ghost Mode | `ghost_mode` — wireframe, hide_select |
| Compare Object | toggle; `ghost_mode` passed to operator |

Multi-select: collection `Compare_Reference_{hash16}`.

### Retrieve Objects

| Control | Property |
|---------|----------|
| Replace Mode | `replace_mode` — True: replace selected; False: append |
| Retrieve Objects | `df.replace_mesh` |

Hint lines:
- Replace: removes original objects
- Retrieve: adds without removing

Label: `{N} object(s) selected` when N > 0.

---

## Error / empty states

| Condition | Message |
|-----------|---------|
| No repo | Init Project block |
| No object (Selected tab) | Select an object… |
| No commit selected | Select a commit from the list |

---

## Связанные операторы

См. [operators.md](./operators.md) § History.
