# Info History Section

Секция **History** в Content Info: file log, branch/commit pickers, Revert / Compare.

**Видимость:** только при **single file** selection (`PreviewSelection.paths.length === 1`). При multiselect (`paths.length > 1`) секция **не рендерится**.

**API:** [api-contract.md](./api-contract.md) — `log.get`+`path`, `restore.file`, `compare.extract`, `lock.list`

**Figma:** single [`4027:5041`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4027-5041)

**Связанные документы:** [content-info-project-view.md](./content-info-project-view.md)

---

## 1. Header

Collapsible; default **expanded**. Title `History` + chevron.

---

## 2. Controls

### 2.1 Branch combobox

- `Combobox` / `Popover` + `Command`
- Options: **all branches** from `branch.list` (v1)
- Placeholder: `Select branch...`
- Default: `currentBranch` or saved `dfm.info.historyBranch`

### 2.2 Commit combobox

- Source: **`log.get`** with `{ branch, path: filePath, max_count }` — commits where file blob changed
- Placeholder: `Select commit...`
- Item label: short hash + truncated message + relative date
- Default: latest commit in filtered log

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
| Commit combobox | no file log entries |
| Revert | no commit selected |
| Compare | no commit selected |

---

## 6. Props

```ts
interface InfoHistorySectionProps {
  filePath: string
  branch: string | null
  commitHash: string | null
  fileLog: FileLogEntry[]
  onBranchChange: (b: string) => void
  onCommitChange: (h: string) => void
  onRevert: () => void
  onCompare: () => void
  loading?: boolean
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
| Branch switch | reload `log.get`; clear commit selection |
| User cancels dialog | no-op |
