# Info History Section

Секция **History** в Content Info: file log, branch/commit pickers, Revert / Compare.

**Figma:** single [`4027:5041`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4027-5041) · multi [`4037:1898`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4037-1898)

**Связанные документы:** [content-info-project-view.md](./content-info-project-view.md)

---

## 1. Header

Collapsible; default **expanded**. Title `History` + chevron.

---

## 2. Controls

### 2.1 Branch combobox

- `Combobox` / `Popover` + `Command`
- Options: branches where file exists in tip tree **или** all branches (v1: **all branches** from `branch.list`)
- Placeholder: `Select branch...`
- Default: `currentBranch` or saved `dfm.info.historyBranch`

### 2.2 Commit combobox

- Source: **`file.log`** for `(branch, filePath)` — only commits that **touched this file**
- Placeholder: `Select commit...`
- Item label: short hash + truncated message + relative date
- Default: latest commit in file log

Multiselect: **one** shared branch/commit context for batch Revert (primary file path for file log — **first path alphabetically** or first in selection; v1: **first in sorted paths**).

---

## 3. Actions

### 3.1 Single file layout

Two buttons `flex gap-2`, equal width:

| Button | Variant | Action |
|--------|---------|--------|
| **Revert** | `secondary` / accent bg | §4.1 |
| **Compare** | `outline` | §4.2 |

### 3.2 Multiselect layout

Single full-width **Revert** only — **no Compare** (макет `4037:1898`).

---

## 4. API flows

### 4.1 Revert

1. Require `historyCommit` selected
2. `AlertDialog`: «Overwrite {n} file(s) in working directory with version from commit {shortHash}?»
3. On confirm: `RestoreFileFromCommit(repoPath, commitHash, paths[])`
   - Single: `[filePath]`
   - Multi: all `selectedPaths`
4. Success toast; refresh Preview + Metadata + status

Maps to CLI: `restore --source=<commit> <file>…`

### 4.2 Compare

1. Require `historyCommit` selected
2. **Single only**
3. `CompareExtract(repoPath, commitHash)` → `compare.extract`
4. Success **toast**: «Extracted to .DFM/tmp_review» (show path)
5. **Не** открывать Blender автоматически

Extracts **whole commit** to tmp_review (existing Forester behavior).

---

## 5. Disabled states

| Control | Disabled when |
|---------|---------------|
| Commit combobox | no file log entries |
| Revert | no commit selected |
| Compare | no commit selected (single only) |
| Entire section | multiselect: Compare hidden, not disabled |

---

## 6. Props

```ts
interface InfoHistorySectionProps {
  mode: 'single' | 'multi'
  filePaths: string[]           // single: [path], multi: all selected
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
| File never committed | empty commit list; actions disabled |
| Revert + file deleted on disk | restore recreates from commit blob |
| Compare + concurrent extract | last wins; toast |
| Branch switch | reload file log; clear commit selection |
| User cancels dialog | no-op |
