package commands

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/models"
	"github.com/difference-machine/forester/internal/utils"
)

// ConflictInfo represents a merge conflict
type ConflictInfo struct {
	Path      string
	BaseHash  string
	OurHash   string
	TheirHash string
}

// performMergeCommit performs a merge by creating a merge commit
func performMergeCommit(repoPath string, repo *core.Repository, storage *core.Storage, refs *core.Refs, hooks *core.Hooks,
	currentBranch, currentHead, targetHead, branchToMerge string, opts MergeOptions) error {

	mergeConfig := core.NewMergeConfig(repoPath)

	// Find merge base (common ancestor)
	mergeBase, err := findMergeBase(repo, currentHead, targetHead)
	if err != nil {
		return fmt.Errorf("failed to find merge base: %w", err)
	}

	// Get commits
	currentCommit, err := repo.GetCommit(currentHead)
	if err != nil {
		return fmt.Errorf("failed to get current commit: %w", err)
	}

	targetCommit, err := repo.GetCommit(targetHead)
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
		mergeBaseCommit, err := repo.GetCommit(mergeBase)
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
				if mergeConfig.IsBinaryMergePath(path) {
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
		return performSquashMerge(repoPath, repo, storage, refs, hooks, currentBranch, currentHead, targetHead, branchToMerge, index)
	}

	author := core.AuthorForRepo(repoPath)

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

	newCommitHash, err := storePreparedCommit(repo, commit)
	if err != nil {
		return err
	}

	oldHead := currentHead
	if err := repo.SetBranchHead(currentBranch, newCommitHash, oldHead); err != nil {
		return fmt.Errorf("failed to update branch head: %w", err)
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
func performSquashMerge(repoPath string, repo *core.Repository, storage *core.Storage, refs *core.Refs, hooks *core.Hooks,
	currentBranch, currentHead, targetHead, branchToMerge string, index *core.Index) error {

	author := core.AuthorForRepo(repoPath)

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

	newCommitHash, err := storePreparedCommit(repo, commit)
	if err != nil {
		return err
	}

	oldHead := currentHead
	if err := repo.SetBranchHead(currentBranch, newCommitHash, oldHead); err != nil {
		return fmt.Errorf("failed to update branch head: %w", err)
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

