# GUI roadmap

Build the Difference Machine window from `.cursor/gui` specs, bottom-up: a blank native frame first, then chrome, then empty states, then live Forester data, then every remaining `View /` and dialog.

Sources: `sources/frontend/dfm-gui`.  
Icons and stub illustrations: `sources/frontend/icons`.  
Figma chrome icons (window, menus, placeholders) live next to the frontend after export.  
Parity: [figma-gui-parity](../rules/figma-gui-parity.mdc). Do not invent visible copy.

Mark a phase **done** only when the listed verify check passes. Current work is always the first unchecked phase.

---

## Status

| Phase | Title | Status |
|-------|-------|--------|
| 0 | Wails scaffold | done |
| 1 | Theme tokens and shadcn primitives | done |
| 2 | First Start (static, 640×656) | done |
| 3 | App shell + Empty DFM Project | done |
| 4 | `setup.cfg`, folder picker, Create / Open | done |
| 5 | Empty DFM Folder + Root Folder (no thumbs) | done |
| 6 | Selection, File Info, collapse, File More Info | done |
| 7 | Folder grid + virtual scroll + thumbnails | done |
| 8 | File View (image / text / binary / no history) | done |
| 9 | History sidebar + View Commit | done |
| 10 | Create Commit composer | done |
| 11 | History of File (text / image) | done |
| 12 | Stash placeholder | done |
| 13 | Settings dialog | done |
| 14 | Branches dialogs | done |
| 15 | Merge + detached HEAD banners | done |
| 16 | Search, sort, filter, locks, watcher | done |
| 17 | Polish, i18n, packaging | done |

---

## Phase 0 — Wails scaffold

**Goal:** native window opens with an empty React root.

- Module `sources/frontend/dfm-gui`: Go 1.22+, Wails v2, `outputfilename` `difference-machine`.
- Frontend: React, Vite, TypeScript. `frontend:build` is `npm run build` (no `&&`).
- `replace` Forester to `../../backend/forester`.
- Native window (OS title bar, traffic lights / caption buttons, rounded corners on macOS). Start size **640×656**.
- Application menu File / Edit / Repository / Window: global on macOS, window menu bar on Windows/Linux.
- App icon from `sources/frontend/icons/512/Appicon.svg` via `npm run icons:generate`.

**Verify:** `cd sources/frontend/dfm-gui/frontend && npm run build`; `wails build` embeds `index.html`.

---

## Phase 1 — Theme tokens and shadcn primitives

**Goal:** Inter + CSS variables from Figma; Button / Switch / Tabs / DropdownMenu match atoms, not default shadcn pills.

Tokens (First Start / Empty Project): `#fafafa`, `#ffffff`, `#18181b`, `#09090b`, `#71717a`, `#3f3f46`, `#a1a1aa`, `#e4e4e7`, `#eff6ff`, `#60a5fa`, radius 4 / 8 / 12.

**Verify:** First Start buttons are 40px, radius 8, primary fill `#18181b`.

---

## Phase 2 — First Start (static)

**Spec:** [views/first-start.md](./views/first-start.md) `4382:9252`.

- Close (Header Right Side row, 640×44).
- Hero: Appicon 128, `Difference Machine`, `Prototype 0.8.1`.
- Card: Create / Open / Language. Copy only from the node.
- Language segments persist (`[ui] language` / local). No Clone, no author fields.

**Verify:** pixel layout against Figma screenshot; Close quits.

---

## Phase 3 — App shell + Empty DFM Project

**Spec:** [views/project-browse.md](./views/project-browse.md) `4382:8827`.

- Window resize to **1429×768** when `shell = app`.
- [Header Window](./components/items/header-window.md) 1429×48.
- Left 309: Project view History Null (branch, Uncommitted Un Changed, History/Stash, No History Project, Header Settings).
- Center 1120: Folder Empty + [FolderNullPlaceholder](./components/placeholders/folder-null.md). No right column.
- Derived view selector; do not store the Figma view name.

**Verify:** empty project matches the mockup; Stash tab is visible but empty (no fake stash list).

---

## Phase 4 — Session, cfg, Create / Open

**Specs:** [gui_backend](./gui_backend/architecture.md), [states](./states/architecture.md).

- `~/.dfm/setup.cfg`: `[current repo]`, `[repo] path_N`, `[user]`, `[ui] language`.
- OS folder picker. `repo.init` via `CallStateless`, then `Open`.
- Open: `.DFM/` present → app shell; else stay on First Start, toast API/not-a-repository.
- Header File → Open Folder; Repository → Create repository. Window hide / min-max / close.
- After init: empty workdir → Empty DFM Project; files + no commits → Empty DFM Folder.

**Verify:** Create on an empty folder lands on Empty DFM Project; relaunch restores `[current repo]`.

---

## Phase 5 — Empty DFM Folder + Root Folder

**Specs:** `4385:8956`, `4224:14140`.

- `workdir.entries` (page 0) + `status.get` + `log.get`.
- Files exist, no commits → Null Repository placeholder in commit list; right = File Info Null.
- Commits exist, nothing selected → Root Folder + File Info Null.
- No extra counters.

**Verify:** open a repo with files and no history; open a repo with at least one commit.

---

## Phase 6 — Selection and File Info

**Specs:** [file-info.md](./panels/file-info.md), [select-more-files.md](./panels/select-more-files.md), collapse variants.

- Single file → File Info (`workdir.metadata`). Multi → Select More Files.
- `infoCollapsed` hides right, center 1120, Folder Action Collapse=yes.
- SubFolder when `folderPath` is nested.

**Verify:** click / multi-select / collapse match the three File Info views.

---

## Phase 7 — Folder grid, virtual scroll, thumbnails

**Specs:** [content-view.md](./panels/content-view.md), [virtual-scroll.md](./gui_frontend/virtual-scroll.md), [thumbnails.md](./gui_backend/thumbnails.md).

- CSS Grid `auto-fill` / `minmax(200px, 1fr)`, gap 8, padding 16.
- Tiles: [grid-folder](./components/items/grid-folder.md) (`sources/frontend/icons/48/Folder.svg`), [grid-file](./components/items/grid-file.md) + File-IMG / File-TEXT / File-Binary stubs.
- `workdir.thumbnail` only viewport + 1–2 rows; shared 1–2 in-flight queue.
- Changed switch filters dirty paths of the whole project.
- Double-click / Open → File View (phase 8).

**Verify:** large folder scrolls without loading every thumb; resize changes column count.

---

## Phase 8 — File View

**Spec:** [file-preview.md](./views/file-preview.md).

- Left becomes File view (`log.get` + path). Back to file.
- Center: Img / Text / Binary content. Collapse variants.
- No History File atom when `fileHasHistory` is false.

**Verify:** image, text, binary, and no-history frames.

---

## Phase 9 — History + View Commit

**Specs:** [commit.md](./views/commit.md), [revision-cache.md](./gui_frontend/revision-cache.md).

- Commit cards: title/author/date from `log.get`; `diff.stat` only for visible cards.
- Click commit → center 1120, file list + diff of selected path (text / image / binary stub).
- Memory LRU by hash. No File Info column.

**Verify:** inspect a text commit and an image commit; scroll does not prefetch every blob.

---

## Phase 10 — Create Commit

**Spec:** Create Commit view + [CreateCommitCard](./components/atoms/card-create-commit.md).

- Commit All Files / composer in Uncommitted slot (not a dialog).
- `index.add` dirty paths → `commit.create`. Empty message blocked in UI.
- Cancel restores Uncommitted card.

**Verify:** first commit appears in History; empty composer cannot submit.

---

## Phase 11 — History of File

**Spec:** [file-history.md](./views/file-history.md).

- File Commit Action: Compare (`compare.extract`) + file revert (`restore.file` + destructive confirm).
- Text Unified/Split; image 2-up / Swipe / Overlay. Binary: File View Binary or diff-binary stub (open question 5).

**Verify:** pick a file commit; Compare opens tmp_review.

---

## Phase 12 — Stash

**Spec:** Stash view (Figma Stages). No JSON stash-list entity in 0.8.1.

- Tab label **Stash**. Empty: [NoStagesProject](./components/atoms/card-no-stages-project.md) `6020:12733`. Do not fake a list from `status.get.staged_*`.

**Verify:** Stash tab has no invented rows.

---

## Phase 13 — Settings

**Spec:** [dialogs/settings.md](./dialogs/settings.md).

- Profile (author → avatar initials), Repositories, External editors, Forester paths, remaining tab from node.
- Same dialog from Header Settings gear and Edit → Settings.

**Verify:** save name, avatar updates; `[api] path` is the native library.

---

## Phase 14 — Branches

**Spec:** [dialogs/branches.md](./dialogs/branches.md), [header-select-branch.md](./components/items/header-select-branch.md).

- List / create / rename / delete. Dirty switch → auto_stash dialog only (never silent).

**Verify:** create and switch a branch; dirty switch asks.

---

## Phase 15 — Merge and detached HEAD

**Specs:** [merge.md](./dialogs/merge.md), [states](./states/architecture.md).

- Banners from `merge.status` / `is_detached`. No extra `View / Merge`.
- Merge dialog: start / continue / abort; continue blocked while conflicts remain.

**Verify:** merge with a text conflict; abort returns to ready.

---

## Phase 16 — Search, sort, filter, locks, watcher

- Folder Action search / sort / filter popovers from Figma.
- Locks on File Info. Workdir watcher debounced; ignore `.DFM/`.
- `workdir.open` / rename / delete (OS trash).

**Verify:** search filters the grid; edit a file on disk, status refreshes.

---

## Phase 17 — Polish and packaging

- Remaining copy i18n after Figma RU exists.
- `icons:generate` for `.png` / `.ico`; `builder/scripts/build_gui.sh --gui`.
- Dark theme only if a Figma set exists (do not invert).

**Verify:** `./builder/build.sh --gui` stages the app.

---

## Open design questions (do not invent)

See [views/architecture.md](./views/architecture.md): Empty DFM Folder vs uninitialized folder; First Start vs Empty Project dual Create; Stash API; View Commit with no selected path; binary History of File.

---

## How to continue

1. Tick the phase done in the table above.
2. Implement the next pending phase only; do not skip data layers (e.g. do not add diffs before the grid).
3. Fetch Figma `get_design_context` on the **variant set** for new atoms, not the whole canvas `4191:5772`.
