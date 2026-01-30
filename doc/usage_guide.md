Difference Machine Usage Guide
==============================

This document explains how to use Forester (CLI), the Blender addon, and the GUI
from repository creation to branch merging.

---

1) Setup and Configuration
--------------------------

### 1.1 Requirements
- Forester binary available in PATH or configured in `~/.dfm/setup.cfg`.
- Blender installed for object-level operations (.blend).
- Difference Machine GUI installed.
- Blender addon installed (see below).

### 1.2 Global config file
File: `~/.dfm/setup.cfg`

Recommended sections:
```
[forester]
binary=/path/to/forester

[blender]
path=/path/to/blender
merge_apply_script=/path/to/merge_apply_background.py
```

Notes:
- `binary` is used by GUI for merge, stash clear, and other CLI calls.
- `merge_apply_script` is used for object-level merge (DELETE/RENAME/MERGE).

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
forester reset --mixed <commit>
```

Short and full CLI references:
- `doc/forester_command_short.md`
- `doc/forester_comand.md`

---

3) GUI: Overview
---------------

### 3.1 Open repository
Menu: **Repository → Open**  
Choose the folder that contains `.DFM`.

### 3.2 Commit (GUI)
1. Select files in Explorer or Changed list.
2. Press **Commit** and enter message/author.
3. GUI runs `forester add` then `forester commit`.

### 3.3 Branch selection
Use the branch dropdown in the top bar.
- The **Current** label is shown only for the branch you explicitly switched to via menu.

### 3.4 Branch merge
Menu: **Branch → Merge branches**
1. Select target branch.
2. Choose files and objects (for .blend).
3. Click **Merge**.

If .blend has object tags in DB, GUI runs:
- `forester merge --no-commit`
- `merge_apply_background.py` (Delete/Rename/Merge)
- `forester add` and `forester merge --continue`

---

4) Blender Addon: Install
-------------------------

1. Open Blender → Preferences → Add-ons → Install.
2. Select addon folder: `addons/blender/diffmachine`.
3. Enable the addon.

After enabling:
- Panel appears in the **3D View > Sidebar > Difference Machine**.

---

5) Blender Addon: Mark To Workflow
----------------------------------

### 5.1 How tags work
Tags are stored in `scene.df_objects` and synced to Forester DB.
Tags supported:
- `MERGE`
- `DELETE`
- `RENAME` (stores `metadata.new_name`)

### 5.2 Mark objects
1. Select objects.
2. Choose tag in **Mark To** panel.
3. Click **Mark**.

### 5.3 Sync tagged objects to DB
Click **Sync Objects to DB**.
This now syncs **all tagged objects** for the selected commit.

If there are old records for the same commit+file, they are cleared first.

---

6) Object-level Merge (Delete/Rename/Merge)
-------------------------------------------

### 6.1 Requirements
- .blend objects must be tagged and synced to DB.
- GUI must know Blender path and `merge_apply_background.py`.

### 6.2 Behavior
During GUI merge:
1. `forester merge --no-commit`
2. `merge_apply_background.py` applies:
   - DELETE (removes objects)
   - RENAME (renames objects)
   - MERGE (imports objects from "theirs")
3. File is staged and merge continues.

---

7) Conflicts and Manual Resolve
-------------------------------

If a merge conflict occurs on `.blend`:
- GUI can open Blender with ours/theirs.
- Or use **Resolve automatically** if merge_apply_background is configured.

---

8) Stash Management in GUI
--------------------------

Menu: **Repository → Delete old stash states**  
Runs `forester stash clear` and removes old stash entries.

---

9) Recommended Workflow (End to End)
------------------------------------

1. Init repo (CLI or GUI).
2. Add files and commit.
3. Create feature branch.
4. Edit files / Blender objects.
5. In Blender: mark objects (MERGE/DELETE/RENAME).
6. Sync tagged objects to DB.
7. Merge in GUI.
8. If needed, resolve conflicts in Blender.

---

10) Notes and Limitations
-------------------------

- Object-level operations depend on Blender and `merge_apply_background.py`.
- GUI uses Forester DB for object lists; no DB = no objects list.
- For object merge to work, tagged objects must be synced before merge.

