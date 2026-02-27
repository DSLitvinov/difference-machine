package commands

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/models"
	"github.com/difference-machine/forester/internal/utils"
)

// MergeOptions holds all merge options
type MergeOptions struct {
	NoFF          bool
	FFOnly        bool
	Squash        bool
	NoCommit      bool
	Abort         bool
	Continue      bool
	Strategy      string // "ours", "theirs", "ort", "recursive"
	StrategyOpt   string // "ours", "theirs" for -X
	BranchToMerge string
}

// Merge merges a branch into the current branch
// Usage:
//
//	merge <branch> [options]
//	merge --abort
//	merge --continue
func Merge(args []string) error {
	if len(args) == 0 {
		return fmt.Errorf("usage: merge <branch> [--no-ff|--ff-only|--squash|--no-commit|-s <strategy>|-X <option>] or merge --abort or merge --continue")
	}

	repoPath, err := utils.FindRepositoryRoot(".")
	if err != nil {
		return fmt.Errorf("not a Forester repository")
	}

	dbPath := filepath.Join(repoPath, ".DFM", "database.db")
	db, err := core.NewDatabase(dbPath)
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}
	defer db.Close()

	storage, err := core.NewStorage(repoPath)
	if err != nil {
		return fmt.Errorf("failed to create storage: %w", err)
	}

	refs := core.NewRefs(repoPath)
	hooks := core.NewHooks(repoPath)

	// Parse arguments
	opts, err := parseMergeArgs(args)
	if err != nil {
		return err
	}

	if opts.Abort && opts.Continue {
		return fmt.Errorf("flags --abort and --continue are mutually exclusive")
	}
	if opts.Abort || opts.Continue {
		if opts.BranchToMerge != "" || opts.NoFF || opts.FFOnly || opts.Squash || opts.NoCommit || opts.Strategy != "" || opts.StrategyOpt != "" {
			return fmt.Errorf("flags --abort/--continue cannot be combined with other options")
		}
	}
	if opts.NoFF && opts.FFOnly {
		return fmt.Errorf("flags --no-ff and --ff-only are mutually exclusive")
	}
	if opts.Squash && opts.NoCommit {
		return fmt.Errorf("flags --squash and --no-commit are mutually exclusive")
	}

	// Handle abort
	if opts.Abort {
		return abortMerge(repoPath, db, refs)
	}

	// Handle continue
	if opts.Continue {
		return continueMerge(repoPath, db, storage, refs, hooks)
	}

	if opts.BranchToMerge == "" {
		return fmt.Errorf("branch name required")
	}

	// Get current branch
	currentBranch, err := refs.GetCurrentBranch()
	if err != nil || currentBranch == "" {
		currentBranch = "main"
	}

	if opts.BranchToMerge == currentBranch {
		return fmt.Errorf("cannot merge branch into itself")
	}

	// Check if branch exists
	branches, err := db.ListBranches()
	if err != nil {
		return fmt.Errorf("failed to list branches: %w", err)
	}

	var targetBranch *models.Branch
	for _, branch := range branches {
		if branch.Name == opts.BranchToMerge {
			targetBranch = branch
			break
		}
	}

	if targetBranch == nil {
		return fmt.Errorf("branch '%s' not found", opts.BranchToMerge)
	}

	// Get current HEAD
	currentHead, err := db.GetBranchHead(currentBranch)
	if err != nil || currentHead == "" {
		currentHead, _ = refs.GetHead(currentBranch)
	}

	// Get target branch HEAD
	targetHead := targetBranch.CommitHash
	if targetHead == "" {
		targetHead, _ = refs.GetHead(opts.BranchToMerge)
	}

	if targetHead == "" {
		return fmt.Errorf("branch '%s' has no commits", opts.BranchToMerge)
	}

	// Check if already merged
	if currentHead == targetHead {
		fmt.Printf("Already up to date with '%s'\n", opts.BranchToMerge)
		return nil
	}

	// Check if current HEAD is ancestor of target (fast-forward possible)
	if currentHead != "" {
		if isAncestor(db, currentHead, targetHead) {
			// Fast-forward merge
			if opts.FFOnly {
				// Fast-forward only: proceed with fast-forward
				return performFastForward(repoPath, db, refs, currentBranch, targetHead)
			}
			if opts.NoFF {
				// Force merge commit even for fast-forward
				return performMergeCommit(repoPath, db, storage, refs, hooks, currentBranch, currentHead, targetHead, opts.BranchToMerge, opts)
			}
			// Normal fast-forward
			return performFastForward(repoPath, db, refs, currentBranch, targetHead)
		}
	}

	// FF-only mode: fail if fast-forward not possible
	if opts.FFOnly {
		return fmt.Errorf("not possible to fast-forward merge; merge aborted")
	}

	// Perform merge commit
	return performMergeCommit(repoPath, db, storage, refs, hooks, currentBranch, currentHead, targetHead, opts.BranchToMerge, opts)
}

// parseMergeArgs parses merge command arguments
func parseMergeArgs(args []string) (MergeOptions, error) {
	opts := MergeOptions{}

	for i := 0; i < len(args); i++ {
		arg := args[i]
		switch arg {
		case "--no-ff":
			opts.NoFF = true
		case "--ff-only":
			opts.FFOnly = true
		case "--squash":
			opts.Squash = true
		case "--no-commit":
			opts.NoCommit = true
		case "--abort":
			opts.Abort = true
		case "--continue":
			opts.Continue = true
		case "-s", "--strategy":
			if i+1 >= len(args) {
				return opts, fmt.Errorf("flag %s requires a value", arg)
			}
			opts.Strategy = args[i+1]
			i++
		case "-X", "--strategy-option":
			if i+1 >= len(args) {
				return opts, fmt.Errorf("flag %s requires a value", arg)
			}
			opts.StrategyOpt = args[i+1]
			i++
		default:
			if strings.HasPrefix(arg, "-") {
				return opts, fmt.Errorf("unknown flag: %s", arg)
			}
			if opts.BranchToMerge != "" {
				return opts, fmt.Errorf("multiple branch names provided")
			}
			opts.BranchToMerge = arg
		}
	}

	return opts, nil
}

// performFastForward performs a fast-forward merge
func performFastForward(repoPath string, db *core.Database, refs *core.Refs, currentBranch, targetHead string) error {
	// Update HEAD
	if err := db.SetBranchHead(currentBranch, targetHead); err != nil {
		return fmt.Errorf("failed to update branch head: %w", err)
	}
	if err := refs.SetHead(currentBranch, targetHead); err != nil {
		return fmt.Errorf("failed to set ref head: %w", err)
	}

	// Restore files from target commit
	storage, err := core.NewStorage(repoPath)
	if err != nil {
		return fmt.Errorf("failed to create storage: %w", err)
	}

	targetCommit, err := db.GetCommit(targetHead)
	if err != nil {
		return fmt.Errorf("failed to get target commit: %w", err)
	}

	// Restore files
	if err := restoreTreeFromCommit(storage, repoPath, targetCommit.TreeHash); err != nil {
		return fmt.Errorf("failed to restore files: %w", err)
	}

	// Clear index
	index, _ := core.NewIndex(repoPath)
	index.Clear()

	hashShort := targetHead
	if len(hashShort) > 8 {
		hashShort = hashShort[:8]
	}
	fmt.Printf("Fast-forward merge: HEAD is now at %s\n", hashShort)
	return nil
}

// ConflictInfo represents a merge conflict
type ConflictInfo struct {
	Path      string
	BaseHash  string
	OurHash   string
	TheirHash string
}

// performMergeCommit performs a merge by creating a merge commit
func performMergeCommit(repoPath string, db *core.Database, storage *core.Storage, refs *core.Refs, hooks *core.Hooks,
	currentBranch, currentHead, targetHead, branchToMerge string, opts MergeOptions) error {

	// Find merge base (common ancestor)
	mergeBase, err := findMergeBase(db, currentHead, targetHead)
	if err != nil {
		return fmt.Errorf("failed to find merge base: %w", err)
	}

	// Get commits
	currentCommit, err := db.GetCommit(currentHead)
	if err != nil {
		return fmt.Errorf("failed to get current commit: %w", err)
	}

	targetCommit, err := db.GetCommit(targetHead)
	if err != nil {
		return fmt.Errorf("failed to get target commit: %w", err)
	}

	// Get trees
	currentTreeContent, err := storage.GetTreeContent(currentCommit.TreeHash)
	if err != nil {
		return fmt.Errorf("failed to get current tree: %w", err)
	}

	targetTreeContent, err := storage.GetTreeContent(targetCommit.TreeHash)
	if err != nil {
		return fmt.Errorf("failed to get target tree: %w", err)
	}

	var mergeBaseTree models.Tree
	if mergeBase != "" {
		mergeBaseCommit, err := db.GetCommit(mergeBase)
		if err == nil {
			mergeBaseTreeContent, err := storage.GetTreeContent(mergeBaseCommit.TreeHash)
			if err == nil {
				json.Unmarshal([]byte(mergeBaseTreeContent), &mergeBaseTree)
			}
		}
	}

	var currentTree, targetTree models.Tree
	if err := json.Unmarshal([]byte(currentTreeContent), &currentTree); err != nil {
		return fmt.Errorf("failed to parse current tree: %w", err)
	}
	if err := json.Unmarshal([]byte(targetTreeContent), &targetTree); err != nil {
		return fmt.Errorf("failed to parse target tree: %w", err)
	}

	// Build maps
	currentTreeMap := make(map[string]*models.TreeEntry)
	if err := core.BuildTreeMapRecursive(storage, &currentTree, "", currentTreeMap); err != nil {
		return fmt.Errorf("build tree map (current): %w", err)
	}

	targetTreeMap := make(map[string]*models.TreeEntry)
	if err := core.BuildTreeMapRecursive(storage, &targetTree, "", targetTreeMap); err != nil {
		return fmt.Errorf("build tree map (target): %w", err)
	}

	mergeBaseTreeMap := make(map[string]*models.TreeEntry)
	if mergeBase != "" {
		if err := core.BuildTreeMapRecursive(storage, &mergeBaseTree, "", mergeBaseTreeMap); err != nil {
			return fmt.Errorf("build tree map (merge base): %w", err)
		}
	}

	index, err := core.NewIndex(repoPath)
	if err != nil {
		return fmt.Errorf("failed to create index: %w", err)
	}

	// Collect all files
	allFiles := make(map[string]bool)
	for path := range currentTreeMap {
		allFiles[path] = true
	}
	for path := range targetTreeMap {
		allFiles[path] = true
	}

	var conflicts []ConflictInfo

	// Merge files
	for path := range allFiles {
		currentEntry, inCurrent := currentTreeMap[path]
		targetEntry, inTarget := targetTreeMap[path]
		baseEntry, inBase := mergeBaseTreeMap[path]

		var finalEntry *models.TreeEntry
		var hasConflict bool

		// Apply strategy
		if opts.Strategy == "ours" {
			// Strategy ours: ignore all changes from target
			if inCurrent {
				finalEntry = currentEntry
			}
		} else if opts.Strategy == "theirs" {
			// Strategy theirs: take all from target
			if inTarget {
				finalEntry = targetEntry
			}
		} else {
			// Normal merge logic
			if !inCurrent {
				// File only in target: take from target
				finalEntry = targetEntry
			} else if !inTarget {
				// File only in current: keep current
				finalEntry = currentEntry
			} else {
				// File in both: check if changed
				currentChanged := !inBase || (inBase && currentEntry.Hash != baseEntry.Hash)
				targetChanged := !inBase || (inBase && targetEntry.Hash != baseEntry.Hash)

				if currentChanged && targetChanged && currentEntry.Hash != targetEntry.Hash {
					// Conflict detected
					hasConflict = true
					conflicts = append(conflicts, ConflictInfo{
						Path:      path,
						BaseHash:  baseEntry.Hash,
						OurHash:   currentEntry.Hash,
						TheirHash: targetEntry.Hash,
					})

					// Apply strategy option
					if opts.StrategyOpt == "ours" {
						finalEntry = currentEntry
						hasConflict = false
					} else if opts.StrategyOpt == "theirs" {
						finalEntry = targetEntry
						hasConflict = false
					} else {
						// Mark conflict in file
						finalEntry = currentEntry // Use current as base, will be marked with conflict markers
					}
				} else if targetChanged {
					// Only target changed: take target
					finalEntry = targetEntry
				} else {
					// Only current changed or neither: keep current
					finalEntry = currentEntry
				}
			}
		}

		if finalEntry != nil && finalEntry.Type == "blob" {
			fullPath := filepath.Join(repoPath, path)

			if hasConflict {
				baseHash := ""
				if inBase && baseEntry != nil {
					baseHash = baseEntry.Hash
				}
				if isBinaryConflictPath(path) {
					// .blend etc.: do not write text markers; keep ours, write theirs under .DFM/merge_theirs/
					if err := storage.WriteBlobToFile(currentEntry.Hash, fullPath); err != nil {
						return fmt.Errorf("failed to write ours for %s: %w", path, err)
					}
					theirsPath := filepath.Join(repoPath, ".DFM", "merge_theirs", path)
					if err := utils.EnsureDirectory(filepath.Dir(theirsPath)); err != nil {
						return fmt.Errorf("failed to create merge_theirs dir: %w", err)
					}
					if err := storage.WriteBlobToFile(targetEntry.Hash, theirsPath); err != nil {
						return fmt.Errorf("failed to write theirs for %s: %w", path, err)
					}
					if err := saveMergeState(repoPath, currentHead, targetHead, branchToMerge, conflicts); err != nil {
						return fmt.Errorf("failed to save merge state: %w", err)
					}
					fmt.Fprintf(os.Stderr, "CONFLICT (content): Binary merge conflict in %s (theirs: .DFM/merge_theirs/%s)\n", path, path)
				} else {
					// Text file: use conflict markers
					if err := markConflictInFile(storage, fullPath, currentEntry.Hash, targetEntry.Hash, baseHash); err != nil {
						return fmt.Errorf("failed to mark conflict in file %s: %w", path, err)
					}
					if err := saveMergeState(repoPath, currentHead, targetHead, branchToMerge, conflicts); err != nil {
						return fmt.Errorf("failed to save merge state: %w", err)
					}
					fmt.Fprintf(os.Stderr, "CONFLICT (content): Merge conflict in %s\n", path)
				}
			} else {
				// Determine which tree to restore from
				if inTarget && finalEntry == targetEntry {
					if err := storage.WriteBlobToFile(targetEntry.Hash, fullPath); err != nil {
						return fmt.Errorf("failed to restore file %s: %w", path, err)
					}
				} else if inCurrent && finalEntry == currentEntry {
					if err := storage.WriteBlobToFile(currentEntry.Hash, fullPath); err != nil {
						return fmt.Errorf("failed to restore file %s: %w", path, err)
					}
				}

				// Add to index
				hash, err := core.HashFile(fullPath)
				if err != nil {
					return fmt.Errorf("failed to hash file: %w", err)
				}
				if _, err := storage.StoreBlobFromFile(fullPath); err != nil {
					return fmt.Errorf("failed to store blob: %w", err)
				}
				index.Add(fullPath, hash)
			}
		}
	}

	// Remove files that were deleted in both branches
	for path := range mergeBaseTreeMap {
		_, inCurrent := currentTreeMap[path]
		_, inTarget := targetTreeMap[path]
		if !inCurrent && !inTarget {
			// Deleted in both: remove from index and disk
			fullPath := filepath.Join(repoPath, path)
			index.MarkDeleted(fullPath)
			if utils.Exists(fullPath) {
				utils.RemoveRecursive(fullPath)
			}
		}
	}

	// If there are conflicts, stop here
	if len(conflicts) > 0 {
		fmt.Fprintf(os.Stderr, "Automatic merge failed; fix conflicts and then commit the result.\n")
		return fmt.Errorf("merge conflicts detected")
	}

	// Check if index is empty
	if index.IsEmpty() {
		fmt.Printf("Already up to date with '%s'\n", branchToMerge)
		return nil
	}

	// If --no-commit, stop here
	if opts.NoCommit {
		fmt.Printf("Merge prepared. Use 'merge --continue' to complete the merge.\n")
		return saveMergeState(repoPath, currentHead, targetHead, branchToMerge, conflicts)
	}

	// If --squash, create a single commit with all changes
	if opts.Squash {
		return performSquashMerge(repoPath, db, storage, refs, hooks, currentBranch, currentHead, targetHead, branchToMerge, index)
	}

	// Get author
	author := os.Getenv("FORESTER_AUTHOR")
	if author == "" {
		author = "Unknown"
	}

	// Execute pre-commit hook
	envVars := []string{
		fmt.Sprintf("FORESTER_REPO_PATH=%s", repoPath),
		fmt.Sprintf("FORESTER_BRANCH=%s", currentBranch),
	}
	success, err := hooks.ExecuteHook(core.HookTypePreCommit, envVars)
	if err != nil || !success {
		return fmt.Errorf("pre-commit hook failed")
	}

	// Create tree from index
	tree := models.NewTree()
	indexEntries := index.GetEntries()

	for relPath, hash := range indexEntries {
		if core.IsDeletedHash(hash) {
			continue
		}
		entry := models.NewTreeEntry(hash, relPath, "blob")
		tree.AddEntry(entry)
	}

	// Store tree
	treeJSON, err := tree.ToJSON()
	if err != nil {
		return fmt.Errorf("failed to serialize tree: %w", err)
	}

	treeHash, err := storage.StoreTree(treeJSON)
	if err != nil {
		return fmt.Errorf("failed to store tree: %w", err)
	}
	tree.Hash = treeHash

	// Create merge commit with multiple parents
	commit := models.NewCommit()
	commit.ParentHashes = []string{currentHead, targetHead}
	commit.ParentHash = currentHead // First parent for backward compatibility
	commit.TreeHash = treeHash
	commit.Author = author
	commit.Message = fmt.Sprintf("Merge branch '%s' into %s", branchToMerge, currentBranch)
	commit.Type = models.CommitTypeProject

	// Calculate commit hash
	commitJSONWithoutHash, err := commit.ToJSON()
	if err != nil {
		return fmt.Errorf("failed to serialize commit: %w", err)
	}

	var commitMap map[string]interface{}
	if err := json.Unmarshal([]byte(commitJSONWithoutHash), &commitMap); err != nil {
		return fmt.Errorf("failed to parse commit JSON: %w", err)
	}
	delete(commitMap, "hash")
	commitJSONForHash, err := json.Marshal(commitMap)
	if err != nil {
		return fmt.Errorf("failed to marshal commit for hash: %w", err)
	}

	newCommitHash := core.HashString(string(commitJSONForHash))
	commit.Hash = newCommitHash
	commitJSON, err := commit.ToJSON()
	if err != nil {
		return fmt.Errorf("failed to serialize final commit: %w", err)
	}

	// Store commit
	if _, err := storage.StoreCommit(commitJSON); err != nil {
		return fmt.Errorf("failed to store commit: %w", err)
	}

	if _, err := db.CreateCommit(commit); err != nil {
		return fmt.Errorf("failed to create commit: %w", err)
	}

	// Update branch HEAD
	oldHead := currentHead
	if err := db.UpdateBranchHeadAtomic(currentBranch, newCommitHash, oldHead); err != nil {
		return fmt.Errorf("failed to update branch head: %w", err)
	}
	if err := refs.SetHead(currentBranch, newCommitHash); err != nil {
		_ = db.SetBranchHead(currentBranch, oldHead)
		return fmt.Errorf("failed to set ref head: %w", err)
	}

	// Execute post-commit hook
	envVars = []string{
		fmt.Sprintf("FORESTER_REPO_PATH=%s", repoPath),
		fmt.Sprintf("FORESTER_BRANCH=%s", currentBranch),
		fmt.Sprintf("FORESTER_COMMIT_HASH=%s", newCommitHash),
	}
	hooks.ExecuteHook(core.HookTypePostCommit, envVars)

	// Clear index
	if err := index.Clear(); err != nil {
		fmt.Fprintf(os.Stderr, "Warning: failed to clear index: %v\n", err)
	}

	// Print result
	hashShort := newCommitHash
	if len(hashShort) > 8 {
		hashShort = hashShort[:8]
	}
	fmt.Printf("Merge completed: %s\n", hashShort)

	return nil
}

// performSquashMerge creates a single commit with all changes from the branch
func performSquashMerge(repoPath string, db *core.Database, storage *core.Storage, refs *core.Refs, hooks *core.Hooks,
	currentBranch, currentHead, targetHead, branchToMerge string, index *core.Index) error {

	// Get author
	author := os.Getenv("FORESTER_AUTHOR")
	if author == "" {
		author = "Unknown"
	}

	// Execute pre-commit hook
	envVars := []string{
		fmt.Sprintf("FORESTER_REPO_PATH=%s", repoPath),
		fmt.Sprintf("FORESTER_BRANCH=%s", currentBranch),
	}
	success, err := hooks.ExecuteHook(core.HookTypePreCommit, envVars)
	if err != nil || !success {
		return fmt.Errorf("pre-commit hook failed")
	}

	// Create tree from index
	tree := models.NewTree()
	indexEntries := index.GetEntries()

	for relPath, hash := range indexEntries {
		if core.IsDeletedHash(hash) {
			continue
		}
		entry := models.NewTreeEntry(hash, relPath, "blob")
		tree.AddEntry(entry)
	}

	// Store tree
	treeJSON, err := tree.ToJSON()
	if err != nil {
		return fmt.Errorf("failed to serialize tree: %w", err)
	}

	treeHash, err := storage.StoreTree(treeJSON)
	if err != nil {
		return fmt.Errorf("failed to store tree: %w", err)
	}
	tree.Hash = treeHash

	// Create squash commit (single parent, not a merge commit)
	commit := models.NewCommit()
	commit.ParentHash = currentHead
	commit.ParentHashes = []string{currentHead}
	commit.TreeHash = treeHash
	commit.Author = author
	commit.Message = fmt.Sprintf("Squashed commit of branch '%s'", branchToMerge)
	commit.Type = models.CommitTypeProject

	// Calculate commit hash
	commitJSONWithoutHash, err := commit.ToJSON()
	if err != nil {
		return fmt.Errorf("failed to serialize commit: %w", err)
	}

	var commitMap map[string]interface{}
	if err := json.Unmarshal([]byte(commitJSONWithoutHash), &commitMap); err != nil {
		return fmt.Errorf("failed to parse commit JSON: %w", err)
	}
	delete(commitMap, "hash")
	commitJSONForHash, err := json.Marshal(commitMap)
	if err != nil {
		return fmt.Errorf("failed to marshal commit for hash: %w", err)
	}

	newCommitHash := core.HashString(string(commitJSONForHash))
	commit.Hash = newCommitHash
	commitJSON, err := commit.ToJSON()
	if err != nil {
		return fmt.Errorf("failed to serialize final commit: %w", err)
	}

	// Store commit
	if _, err := storage.StoreCommit(commitJSON); err != nil {
		return fmt.Errorf("failed to store commit: %w", err)
	}

	if _, err := db.CreateCommit(commit); err != nil {
		return fmt.Errorf("failed to create commit: %w", err)
	}

	// Update branch HEAD
	oldHead := currentHead
	if err := db.UpdateBranchHeadAtomic(currentBranch, newCommitHash, oldHead); err != nil {
		return fmt.Errorf("failed to update branch head: %w", err)
	}
	if err := refs.SetHead(currentBranch, newCommitHash); err != nil {
		_ = db.SetBranchHead(currentBranch, oldHead)
		return fmt.Errorf("failed to set ref head: %w", err)
	}

	// Execute post-commit hook
	envVars = []string{
		fmt.Sprintf("FORESTER_REPO_PATH=%s", repoPath),
		fmt.Sprintf("FORESTER_BRANCH=%s", currentBranch),
		fmt.Sprintf("FORESTER_COMMIT_HASH=%s", newCommitHash),
	}
	hooks.ExecuteHook(core.HookTypePostCommit, envVars)

	// Clear index
	if err := index.Clear(); err != nil {
		fmt.Fprintf(os.Stderr, "Warning: failed to clear index: %v\n", err)
	}

	// Print result
	hashShort := newCommitHash
	if len(hashShort) > 8 {
		hashShort = hashShort[:8]
	}
	fmt.Printf("Squash merge completed: %s\n", hashShort)

	return nil
}

// isBinaryConflictPath reports whether the path is a binary file (e.g. .blend) that must not get text conflict markers.
func isBinaryConflictPath(path string) bool {
	lower := strings.ToLower(path)
	return strings.HasSuffix(lower, ".blend")
}

// markConflictInFile marks conflict in a file
func markConflictInFile(storage *core.Storage, filePath string, ourHash, theirHash, baseHash string) error {
	// Get our version
	ourContentBytes, err := storage.GetBlobContent(ourHash)
	ourContent := ""
	if err == nil {
		ourContent = string(ourContentBytes)
	}

	// Get their version
	theirContentBytes, err := storage.GetBlobContent(theirHash)
	theirContent := ""
	if err == nil {
		theirContent = string(theirContentBytes)
	}

	// Create conflict markers
	conflictContent := fmt.Sprintf("<<<<<<< HEAD\n%s=======\n%s>>>>>>> merged branch\n", ourContent, theirContent)

	// Write to file
	if err := utils.EnsureDirectory(filepath.Dir(filePath)); err != nil {
		return err
	}
	return os.WriteFile(filePath, []byte(conflictContent), 0644)
}

// saveMergeState saves merge state to file
func saveMergeState(repoPath string, currentHead, targetHead, branchToMerge string, conflicts []ConflictInfo) error {
	mergeStatePath := filepath.Join(repoPath, ".DFM", "MERGE_HEAD")
	state := map[string]interface{}{
		"current_head": currentHead,
		"target_head":  targetHead,
		"branch":       branchToMerge,
		"conflicts":    conflicts,
	}
	data, err := json.Marshal(state)
	if err != nil {
		return err
	}
	return os.WriteFile(mergeStatePath, data, 0644)
}

// loadMergeState loads merge state from file
func loadMergeState(repoPath string) (map[string]interface{}, error) {
	mergeStatePath := filepath.Join(repoPath, ".DFM", "MERGE_HEAD")
	if !utils.Exists(mergeStatePath) {
		return nil, fmt.Errorf("no merge in progress")
	}
	data, err := os.ReadFile(mergeStatePath)
	if err != nil {
		return nil, err
	}
	var state map[string]interface{}
	if err := json.Unmarshal(data, &state); err != nil {
		return nil, err
	}
	return state, nil
}

// continueMerge continues a merge after resolving conflicts
func continueMerge(repoPath string, db *core.Database, storage *core.Storage, refs *core.Refs, hooks *core.Hooks) error {
	state, err := loadMergeState(repoPath)
	if err != nil {
		return err
	}

	currentHead := state["current_head"].(string)
	targetHead := state["target_head"].(string)
	branchToMerge := state["branch"].(string)

	// Get current branch
	currentBranch, err := refs.GetCurrentBranch()
	if err != nil || currentBranch == "" {
		currentBranch = "main"
	}

	// Rebuild index from working directory
	index, err := core.NewIndex(repoPath)
	if err != nil {
		return fmt.Errorf("failed to create index: %w", err)
	}
	index.Clear()

	// Add all files from working directory
	if err := filepath.Walk(repoPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			if strings.HasPrefix(filepath.Base(path), ".") && path != repoPath {
				return filepath.SkipDir
			}
			return nil
		}
		relPath, err := filepath.Rel(repoPath, path)
		if err != nil {
			return err
		}
		if strings.HasPrefix(relPath, ".DFM") {
			return nil
		}
		hash, err := core.HashFile(path)
		if err != nil {
			return err
		}
		if _, err := storage.StoreBlobFromFile(path); err != nil {
			return err
		}
		index.Add(path, hash)
		return nil
	}); err != nil {
		return fmt.Errorf("failed to rebuild index: %w", err)
	}

	// Check if there are still conflicts (files with conflict markers)
	hasConflicts := false
	if err := filepath.Walk(repoPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}
		relPath, err := filepath.Rel(repoPath, path)
		if err != nil || strings.HasPrefix(relPath, ".DFM") {
			return nil
		}
		content, err := os.ReadFile(path)
		if err != nil {
			return nil
		}
		if strings.Contains(string(content), "<<<<<<< HEAD") {
			hasConflicts = true
			fmt.Fprintf(os.Stderr, "CONFLICT (content): Merge conflict in %s\n", relPath)
		}
		return nil
	}); err == nil && hasConflicts {
		return fmt.Errorf("merge conflicts not resolved")
	}

	// Create merge commit
	opts := MergeOptions{}
	return performMergeCommitAfterContinue(repoPath, db, storage, refs, hooks, currentBranch, currentHead, targetHead, branchToMerge, opts, index)
}

// performMergeCommitAfterContinue performs merge commit after continue (with pre-built index)
func performMergeCommitAfterContinue(repoPath string, db *core.Database, storage *core.Storage, refs *core.Refs, hooks *core.Hooks,
	currentBranch, currentHead, targetHead, branchToMerge string, opts MergeOptions, index *core.Index) error {

	// Get author
	author := os.Getenv("FORESTER_AUTHOR")
	if author == "" {
		author = "Unknown"
	}

	// Execute pre-commit hook
	envVars := []string{
		fmt.Sprintf("FORESTER_REPO_PATH=%s", repoPath),
		fmt.Sprintf("FORESTER_BRANCH=%s", currentBranch),
	}
	success, err := hooks.ExecuteHook(core.HookTypePreCommit, envVars)
	if err != nil || !success {
		return fmt.Errorf("pre-commit hook failed")
	}

	// Create tree from index
	tree := models.NewTree()
	indexEntries := index.GetEntries()

	for relPath, hash := range indexEntries {
		if core.IsDeletedHash(hash) {
			continue
		}
		entry := models.NewTreeEntry(hash, relPath, "blob")
		tree.AddEntry(entry)
	}

	// Store tree
	treeJSON, err := tree.ToJSON()
	if err != nil {
		return fmt.Errorf("failed to serialize tree: %w", err)
	}

	treeHash, err := storage.StoreTree(treeJSON)
	if err != nil {
		return fmt.Errorf("failed to store tree: %w", err)
	}
	tree.Hash = treeHash

	// Create merge commit with multiple parents
	commit := models.NewCommit()
	commit.ParentHashes = []string{currentHead, targetHead}
	commit.ParentHash = currentHead // First parent for backward compatibility
	commit.TreeHash = treeHash
	commit.Author = author
	commit.Message = fmt.Sprintf("Merge branch '%s' into %s", branchToMerge, currentBranch)
	commit.Type = models.CommitTypeProject

	// Calculate commit hash
	commitJSONWithoutHash, err := commit.ToJSON()
	if err != nil {
		return fmt.Errorf("failed to serialize commit: %w", err)
	}

	var commitMap map[string]interface{}
	if err := json.Unmarshal([]byte(commitJSONWithoutHash), &commitMap); err != nil {
		return fmt.Errorf("failed to parse commit JSON: %w", err)
	}
	delete(commitMap, "hash")
	commitJSONForHash, err := json.Marshal(commitMap)
	if err != nil {
		return fmt.Errorf("failed to marshal commit for hash: %w", err)
	}

	newCommitHash := core.HashString(string(commitJSONForHash))
	commit.Hash = newCommitHash
	commitJSON, err := commit.ToJSON()
	if err != nil {
		return fmt.Errorf("failed to serialize final commit: %w", err)
	}

	// Store commit
	if _, err := storage.StoreCommit(commitJSON); err != nil {
		return fmt.Errorf("failed to store commit: %w", err)
	}

	if _, err := db.CreateCommit(commit); err != nil {
		return fmt.Errorf("failed to create commit: %w", err)
	}

	// Update branch HEAD
	oldHead := currentHead
	if err := db.UpdateBranchHeadAtomic(currentBranch, newCommitHash, oldHead); err != nil {
		return fmt.Errorf("failed to update branch head: %w", err)
	}
	if err := refs.SetHead(currentBranch, newCommitHash); err != nil {
		_ = db.SetBranchHead(currentBranch, oldHead)
		return fmt.Errorf("failed to set ref head: %w", err)
	}

	// Remove merge state and binary conflict staging
	mergeStatePath := filepath.Join(repoPath, ".DFM", "MERGE_HEAD")
	utils.RemoveRecursive(mergeStatePath)
	mergeTheirsDir := filepath.Join(repoPath, ".DFM", "merge_theirs")
	utils.RemoveRecursive(mergeTheirsDir)

	// Execute post-commit hook
	envVars = []string{
		fmt.Sprintf("FORESTER_REPO_PATH=%s", repoPath),
		fmt.Sprintf("FORESTER_BRANCH=%s", currentBranch),
		fmt.Sprintf("FORESTER_COMMIT_HASH=%s", newCommitHash),
	}
	hooks.ExecuteHook(core.HookTypePostCommit, envVars)

	// Clear index
	if err := index.Clear(); err != nil {
		fmt.Fprintf(os.Stderr, "Warning: failed to clear index: %v\n", err)
	}

	// Print result
	hashShort := newCommitHash
	if len(hashShort) > 8 {
		hashShort = hashShort[:8]
	}
	fmt.Printf("Merge completed: %s\n", hashShort)

	return nil
}

// findMergeBase finds the common ancestor of two commits
func findMergeBase(db *core.Database, commit1, commit2 string) (string, error) {
	if commit1 == "" || commit2 == "" {
		return "", nil
	}

	// Simple algorithm: find the first common ancestor by walking both histories
	visited := make(map[string]bool)

	// Walk commit1's history (including merge commits)
	var walkHistory func(string) error
	walkHistory = func(commit string) error {
		if commit == "" {
			return nil
		}
		visited[commit] = true
		c, err := db.GetCommit(commit)
		if err != nil {
			return err
		}
		// Walk all parents
		if len(c.ParentHashes) > 0 {
			for _, parent := range c.ParentHashes {
				if !visited[parent] {
					walkHistory(parent)
				}
			}
		} else if c.ParentHash != "" {
			walkHistory(c.ParentHash)
		}
		return nil
	}

	if err := walkHistory(commit1); err != nil {
		return "", err
	}

	// Walk commit2's history until we find a visited commit
	var findCommon func(string) (string, error)
	findCommon = func(commit string) (string, error) {
		if commit == "" {
			return "", nil
		}
		if visited[commit] {
			return commit, nil
		}
		c, err := db.GetCommit(commit)
		if err != nil {
			return "", err
		}
		// Check all parents
		if len(c.ParentHashes) > 0 {
			for _, parent := range c.ParentHashes {
				if result, err := findCommon(parent); err == nil && result != "" {
					return result, nil
				}
			}
		} else if c.ParentHash != "" {
			return findCommon(c.ParentHash)
		}
		return "", nil
	}

	return findCommon(commit2)
}

// isAncestor checks if ancestor is an ancestor of commit
func isAncestor(db *core.Database, ancestor, commit string) bool {
	visited := make(map[string]bool)
	var check func(string) bool
	check = func(c string) bool {
		if c == "" {
			return false
		}
		if c == ancestor {
			return true
		}
		if visited[c] {
			return false
		}
		visited[c] = true
		commit, err := db.GetCommit(c)
		if err != nil {
			return false
		}
		// Check all parents
		if len(commit.ParentHashes) > 0 {
			for _, parent := range commit.ParentHashes {
				if check(parent) {
					return true
				}
			}
		} else if commit.ParentHash != "" {
			return check(commit.ParentHash)
		}
		return false
	}
	return check(commit)
}

// abortMerge aborts an in-progress merge
func abortMerge(repoPath string, db *core.Database, refs *core.Refs) error {
	mergeStatePath := filepath.Join(repoPath, ".DFM", "MERGE_HEAD")
	if !utils.Exists(mergeStatePath) {
		return fmt.Errorf("no merge in progress")
	}

	// Load state to restore HEAD if needed
	state, err := loadMergeState(repoPath)
	if err == nil {
		if currentHead, ok := state["current_head"].(string); ok && currentHead != "" {
			currentBranch, _ := refs.GetCurrentBranch()
			if currentBranch == "" {
				currentBranch = "main"
			}
			_ = db.SetBranchHead(currentBranch, currentHead)
			_ = refs.SetHead(currentBranch, currentHead)
		}
	}

	// Remove merge state and binary conflict staging
	utils.RemoveRecursive(mergeStatePath)
	mergeTheirsDir := filepath.Join(repoPath, ".DFM", "merge_theirs")
	utils.RemoveRecursive(mergeTheirsDir)

	fmt.Println("Merge aborted")
	return nil
}
