# Покрытие VCS — Blender Addon vs Forester GUI

Аудит на основе [vcs-gui-coverage.md](../../interface/vcs-gui-coverage.md) и кода `sources/addons/blender/difference_machine/`.

**Версия:** Addon 0.8.0 · Forester 0.8.

---

## Легенда

| Статус | Значение |
|--------|----------|
| ✅ | Реализовано в addon |
| 🔶 | Частично / wrapper без UI |
| ❌ | Нет в addon |
| ➖ | Не применимо в Blender context |

---

## Repository

| Функция | GUI | Addon |
|---------|-----|-------|
| Init repository | ✅ init dialog | ✅ `df.init_project` |
| Open / multi-repo | ✅ | ➖ один `.blend` = один repo context |
| Verify / rebuild | — | ✅ `df.verify_repository` |
| Status | ✅ | 🔶 через API в helpers, без отдельной панели |

---

## Commits

| Функция | GUI | Addon |
|---------|-----|-------|
| Create commit (message dialog) | ✅ | 🔶 Save Version — auto datetime message |
| Commit tag | ✅ | ❌ нет UI для tag при коммите (`commit_tag` prop не используется в Save Version) |
| Commit card / screenshot preview | ✅ | ❌ screenshot_path в данных есть, UI превью нет |
| Revert / Reset | ✅ card menu | 🔶 API wrapper only |
| Log / history list | ✅ Sidebar | ✅ Compare panel UIList |
| Tag filter on log | — | 🔶 `tag_search_filter` prop + callback; **нет видимого поля в UI** |
| File-scoped log | ✅ Content Info | ✅ Object History (`log.get` + `path`) |

---

## Branches

| Функция | GUI | Addon |
|---------|-----|-------|
| Branch list | ✅ dropdown | ✅ Compare panel `DF_UL_branch_list` |
| Switch branch | ✅ | ✅ Compare panel `df.switch_branch` |
| Create branch | ✅ dialog | ❌ |
| Rename branch | ✅ dialog | ❌ |
| Delete branch | — | 🔶 wrapper only |
| Load branch commits | — | ✅ `df.load_branch_commits` (кнопка Load Commits) |

---

## Compare & Restore

| Функция | GUI | Addon |
|---------|-----|-------|
| Compare project (extract) | ✅ | ✅ toggle Compare |
| Compare object (ghost) | — | ✅ Compare Object + Ghost Mode |
| Retrieve / Replace objects | — | ✅ Retrieve Objects + Replace Mode |
| Restore whole version | ✅ | ✅ Restore This Version |
| Restore single file | ✅ | 🔶 wrapper only |
| tmp_review cleanup | ✅ | ✅ via compare toggle / compare object cleanup |

---

## Index / Working tree

| Функция | GUI | Addon |
|---------|-----|-------|
| Changed files grid | ✅ | ❌ |
| Stage / unstage | ✅ | ➖ Save Version всегда `add(".")` |
| Diff text/image | ✅ | ❌ |

---

## Merge

| Функция | GUI | Addon |
|---------|-----|-------|
| merge.status banner | ✅ | ❌ |
| merge.start / continue / abort | ✅ dialog | ❌ |
| Object tags DELETE/RENAME/MERGE | ✅ merge dialog | ✅ Mark To panel |
| Background merge apply | — | ✅ `scripts/merge_apply_background.py` (addon; path from `diffmachine_path`) |

---

## Locks

| Функция | GUI | Addon |
|---------|-----|-------|
| List locks | ✅ badge | ✅ panel + `df.list_locks` |
| Acquire / release | ✅ | ✅ Lock/Unlock current blend files |
| Lock other user's file warning | ✅ | 🔶 panel shows up to 5 locks |

---

## Objects / Manifest

| Функция | GUI | Addon |
|---------|-----|-------|
| Object list by file | ✅ merge | 🔶 API only |
| Mark tags | — | ✅ Mark To |
| Object history timeline | ✅ Content Info | ✅ Object History panel |
| Review comments | — | ❌ roadmap 2.8 |

---

## Assets

| Функция | GUI | Addon |
|---------|-----|-------|
| Save object as .blend asset | — | ✅ Save as Asset |
| Replace with link | — | ✅ `replace_with_link` (default true) |
| Asset registry browse | — | 🔶 `.DFM/assets_registry.json`; UI browse ❌ |

---

## Maintenance

| Функция | GUI | Addon |
|---------|-----|-------|
| GC manual | — | ✅ preferences + `df.garbage_collect` |
| GC scheduled | — | ✅ timer + preferences |
| Reflog expire days | — | ✅ preferences → setup.cfg |

---

## Приоритетные пробелы (addon)

1. **Branch management UI** — create/rename/switch (API готов)
2. **Commit message / tag** при Save Version
3. **Tag search field** в Compare (prop есть, UI нет)
4. **Screenshot** при коммите (`viewport_capture.py` не подключён)
5. **Review UI** (Forester store готов)
6. **Asset Registry** browse/search UI
7. **Merge flow** в Blender без GUI merge dialog (только marks + background script)
