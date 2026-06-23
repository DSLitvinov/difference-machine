# Info History Section

Секция **History** в Content Info: file log, branch/commit pickers, Revert / Compare.

**Видимость:** только при **single file** selection (`PreviewSelection.paths.length === 1`). При multiselect (`paths.length > 1`) секция **не рендерится**.

**API:** [api-contract.md](./api-contract.md) — `log.get`+`path`, `restore.file`, `compare.extract`, `lock.list`

**Figma:** single [`4027:5041`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4027-5041)

**Связанные документы:** [content-info-project-view.md](./content-info-project-view.md) · [design-tokens.md §4.5](./design-tokens.md)

---

## 1. Header

Collapsible; default **expanded**. Title `History` + chevron.

---

## 2. Controls

Dropdowns — канон [design-tokens.md §4.5](./design-tokens.md) (`DropdownSelector`). **Не** нативный `<select>`.

### 2.1 Branch picker

- Компонент: `DropdownSelector` + иконка `GitBranch`
- Label поля: `Branch` (`text-xs text-muted-foreground`)
- Options: **all branches** from `branch.list` (v1)
- Placeholder: `Select branch…`
- Default: `currentBranch` or saved `dfm.info.fileHistoryBranch` ([paths.md §10](./paths.md))
- **Read-only filter** — меняет только `log.get`+`path` для файла; **не** вызывает `repo.switch` (в отличие от History `BranchSelector` — [sidebar-history-view.md §2.6](./sidebar-history-view.md))

### 2.2 Commit picker

- Компонент: `DropdownSelector` (без иконки)
- Label поля: `Commit`
- Source: **`log.get`** with `{ branch, path: filePath, max_count }` — commits where file blob changed
- Placeholder: `No commits for this file` / `Loading…`
- **Trigger label:** `{shortHash} · {truncated subject}` (truncate в кнопке)
- **Tooltip (`title`):** полная строка + `formatTimestamp`
- Default: latest commit in filtered log (первый в списке)
- При `capped: true` от API — toast «Showing latest 100 commits for this file»

---

## 3. Actions

Two buttons `flex gap-2`, equal width:

| Button | Variant | Action |
|--------|---------|--------|
| **Revert** | `secondary` / accent bg | §4.1 |
| **Compare** | `outline` | §4.2 |

---

## 4. API flows

### 4.1 Revert

1. Require `historyCommit` selected
2. `lock.list` — block if **another user's** lock on file; allow **own** lock
3. `AlertDialog`: «Overwrite file in working directory with version from commit {shortHash}?»
4. On confirm: `restore.file({ commit_hash, paths: [filePath] })`
5. Success toast; refresh `status.get` + Preview + Metadata

Maps to CLI: `restore --source=<commit> <file>`

### 4.2 Compare

1. Require `historyCommit` selected
2. `compare.extract({ commit_hash })` → whole commit to `.DFM/tmp_review`
3. Success **toast**: «Extracted to .DFM/tmp_review» (show path)
4. **Не** открывать Blender автоматически

---

## 5. Disabled states

| Control | Disabled when |
|---------|---------------|
| Branch picker | loading branches / empty list |
| Commit picker | loading / no file log entries |
| Revert | no commit selected |
| Compare | no commit selected |

---

## 6. Props (implementation)

```ts
interface InfoHistorySectionProps {
  filePath: string
  currentUser: string          // for lock check vs lock.list
  onRestored: () => void       // refresh metadata after revert
}
```

---

## 7. Corner cases

| Case | Поведение |
|------|-----------|
| Multiselect (2+ files) | секция **не монтируется** (`paths.length > 1`) |
| File never committed | empty commit list; actions disabled |
| Revert + file deleted on disk | restore recreates from commit blob |
| Revert + foreign lock | toast; no API call |
| Compare + concurrent extract | last wins; toast |
| Branch change | reload `log.get`; reset commit to latest in new list |
| User cancels dialog | no-op |
| Click outside dropdown | close panel (mousedown on document) |
