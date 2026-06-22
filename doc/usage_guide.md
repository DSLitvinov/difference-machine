Difference Machine Usage Guide
==============================

This document explains how to use Forester (CLI) and the Blender addon
from repository creation to branch merging.

---

1) Setup and Configuration
--------------------------

### 1.1 Requirements
- Forester binary available in PATH or configured in `~/.dfm/setup.cfg`.
- Blender installed for object-level operations (.blend).
- Blender addon installed (see below).

### 1.2 Global config file
File: `~/.dfm/setup.cfg`

Recommended sections:
```
[forester]
path=/path/to/forester

[api]
path=/path/to/libforester.so

[addons]
diffmachine_path=/path/to/addons/blender/difference_machine

[blender]
path=/path/to/blender
merge_apply_script=/path/to/merge_apply_background.py
```

Notes:
- `merge_apply_script` is used for object-level merge (DELETE/RENAME/MERGE).
- See `builder/setup.cfg.example` for a fuller example.

---

2) Forester CLI: Repository Lifecycle
-------------------------------------

### 2.1 Create repository
```
forester init /path/to/project
```

### 2.2 Status, add, commit
```
forester status
forester add .
forester commit "Initial commit" --author "Name"
```

### 2.3 Branches and switching
```
forester branch                   # list
forester branch feature/ui        # create
forester switch feature/ui        # switch
forester switch -a main           # auto-stash changes
```

### 2.4 Merge
```
forester merge feature/ui
forester merge --abort
forester merge --continue
```

### 2.5 Stash
```
forester stash list
forester stash save "WIP"
forester stash pop
forester stash clear
```

### 2.6 Other useful commands
```
forester log
forester diff
forester show <commit>
forester restore <file>
forester restore-version <commit>   # full overwrite of working dir to match commit
forester reset --mixed <commit>
```

Short and full CLI references:
- `doc/forester_command_short.md`
- `doc/forester_comand.md`

---

3) Blender Addon: Install
-------------------------

1. Open Blender → Preferences → Add-ons → Install.
2. Select addon folder: `addons/blender/difference_machine`.
3. Enable the addon.

After enabling:
- Panel appears in the **3D View > Sidebar > Difference Machine**.

### 3.1 Compare panel (Version History)
- **Load Commits** — load commit list for the current branch.
- **Project** tab: for the selected commit — **Compare** (extract to tmp and open in another Blender), **Restore This Version** (full overwrite of working folder to that commit, create a new commit with message like "Restore version DD.MM.YYYY HH:MM from commit <hash>", then reload the current file).
- **Selected Object** tab: compare or replace the selected object with the version from the chosen commit.

---

4) Blender Addon: Mark To Workflow
----------------------------------

### 4.1 How tags work
Tags are stored in `scene.df_objects` and synced to Forester DB.
Tags supported:
- `MERGE`
- `DELETE`
- `RENAME` (stores `metadata.new_name`)

### 4.2 Mark objects
1. Select objects.
2. Choose tag in **Mark To** panel.
3. Click **Mark**.

### 4.3 Sync tagged objects to DB
Click **Sync Objects to DB**.
This now syncs **all tagged objects** for the selected commit.

If there are old records for the same commit+file, they are cleared first.

---

5) Object-level Merge (Delete/Rename/Merge)
-------------------------------------------

### 5.1 Requirements
- .blend objects must be tagged and synced to DB.
- Blender path and `merge_apply_background.py` must be configured in `~/.dfm/setup.cfg`.

### 5.2 Behavior
During merge with object tags:
1. `forester merge --no-commit`
2. `merge_apply_background.py` applies:
   - DELETE (removes objects)
   - RENAME (renames objects)
   - MERGE (imports objects from "theirs")
3. File is staged and merge continues (`forester add`, then `forester merge --continue`).

---

6) Conflicts and Manual Resolve
-------------------------------

If a merge conflict occurs on `.blend`:
- Open Blender with ours/theirs for manual review.
- Or use automatic resolve if `merge_apply_background.py` is configured.

---

7) Recommended Workflow (End to End)
------------------------------------

1. Init repo (`forester init` or via addon).
2. Add files and commit.
3. Create feature branch.
4. Edit files / Blender objects.
5. In Blender: mark objects (MERGE/DELETE/RENAME).
6. Sync tagged objects to DB.
7. Merge via CLI (`forester merge`) or addon.
8. If needed, resolve conflicts in Blender.

---

8) Notes and Limitations
------------------------

- Object-level operations depend on Blender and `merge_apply_background.py`.
- Object lists for merge come from the Forester DB; no DB sync = no object list.
- For object merge to work, tagged objects must be synced before merge.
