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

// MoveTo moves commits from the current branch on top of the specified base branch (rewriting history)
// Usage:
//
//	move-to <base-branch>    - Move current branch commits on top of base branch
func MoveTo(args []string) error {
	if len(args) == 0 {
		return fmt.Errorf("usage: move-to <base-branch>")
	}
	if len(args) > 1 {
		return fmt.Errorf("usage: move-to <base-branch>")
	}
	if strings.HasPrefix(args[0], "-") {
		return fmt.Errorf("usage: move-to <base-branch>")
	}

	baseBranchName := args[0]

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

	// Get current branch
	currentBranch, err := refs.GetCurrentBranch()
	if err != nil || currentBranch == "" {
		currentBranch = "main"
	}

	if baseBranchName == currentBranch {
		return fmt.Errorf("cannot move branch onto itself")
	}

	// Check if branches exist
	branches, err := db.ListBranches()
	if err != nil {
		return fmt.Errorf("failed to list branches: %w", err)
	}

	var currentBranchObj, baseBranchObj *models.Branch
	for _, branch := range branches {
		if branch.Name == currentBranch {
			currentBranchObj = branch
		}
		if branch.Name == baseBranchName {
			baseBranchObj = branch
		}
	}

	if currentBranchObj == nil {
		return fmt.Errorf("current branch '%s' not found", currentBranch)
	}
	if baseBranchObj == nil {
		return fmt.Errorf("base branch '%s' not found", baseBranchName)
	}

	// Get HEAD commits
	currentHead := currentBranchObj.CommitHash
	if currentHead == "" {
		currentHead, _ = refs.GetHead(currentBranch)
	}

	baseHead := baseBranchObj.CommitHash
	if baseHead == "" {
		baseHead, _ = refs.GetHead(baseBranchName)
	}

	if currentHead == "" {
		return fmt.Errorf("current branch '%s' has no commits", currentBranch)
	}
	if baseHead == "" {
		return fmt.Errorf("base branch '%s' has no commits", baseBranchName)
	}

	// Find merge base (common ancestor)
	mergeBase, err := findMergeBase(db, currentHead, baseHead)
	if err != nil {
		return fmt.Errorf("failed to find merge base: %w", err)
	}

	// If merge base is the same as current head, nothing to move
	if mergeBase == currentHead {
		fmt.Printf("Current branch is already on top of '%s'\n", baseBranchName)
		return nil
	}

	// Get all commits from merge base to current HEAD (in chronological order)
	commitsToMove, err := getCommitsBetween(db, mergeBase, currentHead)
	if err != nil {
		return fmt.Errorf("failed to get commits: %w", err)
	}

	if len(commitsToMove) == 0 {
		fmt.Printf("No commits to move\n")
		return nil
	}

	fmt.Printf("Moving %d commit(s) from '%s' on top of '%s'...\n", len(commitsToMove), currentBranch, baseBranchName)

	// Start from base branch HEAD
	newHead := baseHead

	// Apply each commit on top of the new base
	for i, commitToMove := range commitsToMove {
		// Get parent commit (for computing diff)
		if commitToMove.ParentHash == "" {
			return fmt.Errorf("cannot move initial commit")
		}

		parentCommit, err := db.GetCommit(commitToMove.ParentHash)
		if err != nil {
			return fmt.Errorf("parent commit not found: %w", err)
		}

		// Get trees
		commitTreeContent, err := storage.GetTreeContent(commitToMove.TreeHash)
		if err != nil {
			return fmt.Errorf("failed to get commit tree: %w", err)
		}

		parentTreeContent, err := storage.GetTreeContent(parentCommit.TreeHash)
		if err != nil {
			return fmt.Errorf("failed to get parent tree: %w", err)
		}

		var commitTree, parentTree models.Tree
		if err := json.Unmarshal([]byte(commitTreeContent), &commitTree); err != nil {
			return fmt.Errorf("failed to parse commit tree: %w", err)
		}
		if err := json.Unmarshal([]byte(parentTreeContent), &parentTree); err != nil {
			return fmt.Errorf("failed to parse parent tree: %w", err)
		}

		// Get current state tree (from newHead)
		var currentTree models.Tree
		if newHead != "" {
			currentCommit, err := db.GetCommit(newHead)
			if err == nil {
				currentTreeContent, err := storage.GetTreeContent(currentCommit.TreeHash)
				if err == nil {
					json.Unmarshal([]byte(currentTreeContent), &currentTree)
				}
			}
		}

		// Build maps
		commitTreeMap := make(map[string]*models.TreeEntry)
		if err := core.BuildTreeMapRecursive(storage, &commitTree, "", commitTreeMap); err != nil {
			return fmt.Errorf("build tree map (commit): %w", err)
		}

		parentTreeMap := make(map[string]*models.TreeEntry)
		if err := core.BuildTreeMapRecursive(storage, &parentTree, "", parentTreeMap); err != nil {
			return fmt.Errorf("build tree map (parent): %w", err)
		}

		currentTreeMap := make(map[string]*models.TreeEntry)
		if newHead != "" {
			if err := core.BuildTreeMapRecursive(storage, &currentTree, "", currentTreeMap); err != nil {
				return fmt.Errorf("build tree map (current): %w", err)
			}
		}

		// Compute diff: what changed between parent and commit
		// Apply those changes to current state

		index, err := core.NewIndex(repoPath)
		if err != nil {
			return fmt.Errorf("failed to create index: %w", err)
		}

		// Start with current tree as base, then apply changes from commit

		// Process files that were added in commit (add them)
		for name, commitEntry := range commitTreeMap {
			if _, existsInParent := parentTreeMap[name]; !existsInParent {
				// File was added in commit, add it
				relPath := name
				fullPath := filepath.Join(repoPath, relPath)

				// Ensure directory exists
				if err := utils.EnsureDirectory(filepath.Dir(fullPath)); err != nil {
					return fmt.Errorf("failed to create directory for %s: %w", relPath, err)
				}

				// Restore file from commit
				if err := storage.WriteBlobToFile(commitEntry.Hash, fullPath); err != nil {
					return fmt.Errorf("failed to restore file %s: %w", relPath, err)
				}

				// Add to index
				hash, err := core.HashFile(fullPath)
				if err != nil {
					return fmt.Errorf("failed to hash file %s: %w", relPath, err)
				}
				if _, err := storage.StoreBlobFromFile(fullPath); err != nil {
					return fmt.Errorf("failed to store blob for %s: %w", relPath, err)
				}
				index.Add(fullPath, hash)
			}
		}

		// Process files that were deleted in commit (delete them)
		for name := range parentTreeMap {
			if _, existsInCommit := commitTreeMap[name]; !existsInCommit {
				// File was deleted in commit, delete it
				relPath := name
				fullPath := filepath.Join(repoPath, relPath)

				// Remove from index
				index.MarkDeleted(fullPath)

				// Delete file if it exists
				if utils.Exists(fullPath) {
					if err := utils.RemoveRecursive(fullPath); err != nil {
						fmt.Fprintf(os.Stderr, "Warning: failed to delete file %s: %v\n", relPath, err)
					}
				}
			}
		}

		// Process files that were modified in commit (apply changes)
		for name, commitEntry := range commitTreeMap {
			if parentEntry, existsInParent := parentTreeMap[name]; existsInParent {
				if commitEntry.Hash != parentEntry.Hash {
					// File was modified in commit, apply changes
					relPath := name
					fullPath := filepath.Join(repoPath, relPath)

					// Ensure directory exists
					if err := utils.EnsureDirectory(filepath.Dir(fullPath)); err != nil {
						return fmt.Errorf("failed to create directory for %s: %w", relPath, err)
					}

					// Restore file from commit
					if err := storage.WriteBlobToFile(commitEntry.Hash, fullPath); err != nil {
						return fmt.Errorf("failed to apply changes to file %s: %w", relPath, err)
					}

					// Add to index
					hash, err := core.HashFile(fullPath)
					if err != nil {
						return fmt.Errorf("failed to hash file %s: %w", relPath, err)
					}
					if _, err := storage.StoreBlobFromFile(fullPath); err != nil {
						return fmt.Errorf("failed to store blob for %s: %w", relPath, err)
					}
					index.Add(fullPath, hash)
				}
			}
		}

		// Keep files from current tree that weren't changed in commit
		for name := range currentTreeMap {
			commitEntry, existsInCommit := commitTreeMap[name]
			parentEntry, existsInParent := parentTreeMap[name]

			if !existsInCommit {
				// File not in commit - keep from current if it exists
				relPath := name
				fullPath := filepath.Join(repoPath, relPath)
				if utils.Exists(fullPath) {
					hash, err := core.HashFile(fullPath)
					if err == nil {
						if _, err := storage.StoreBlobFromFile(fullPath); err == nil {
							index.Add(fullPath, hash)
						}
					}
				}
			} else if existsInParent && commitEntry.Hash == parentEntry.Hash {
				// File exists in commit and parent with same hash - wasn't changed
				// Keep current version if it exists
				relPath := name
				fullPath := filepath.Join(repoPath, relPath)
				if utils.Exists(fullPath) {
					hash, err := core.HashFile(fullPath)
					if err == nil {
						if _, err := storage.StoreBlobFromFile(fullPath); err == nil {
							index.Add(fullPath, hash)
						}
					}
				}
			}
			// If file was changed in commit, it's already been added above
		}

		// Check if index is empty
		if index.IsEmpty() {
			// Skip empty commits (no changes)
			fmt.Printf("Skipping empty commit %s\n", commitToMove.Hash[:8])
			continue
		}

		// Get author
		author := os.Getenv("FORESTER_AUTHOR")
		if author == "" {
			author = commitToMove.Author
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

		// Create commit with original message
		commit := models.NewCommit()
		commit.ParentHash = newHead
		commit.TreeHash = treeHash
		commit.Author = author
		commit.Message = commitToMove.Message
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

		// Update newHead for next iteration
		newHead = newCommitHash

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

		hashShort := newCommitHash
		if len(hashShort) > 8 {
			hashShort = hashShort[:8]
		}
		fmt.Printf("[%d/%d] %s %s\n", i+1, len(commitsToMove), hashShort, commitToMove.Message)
	}

	// Update current branch HEAD
	oldHead := currentHead
	if err := db.UpdateBranchHeadAtomic(currentBranch, newHead, oldHead); err != nil {
		return fmt.Errorf("failed to update branch head: %w", err)
	}
	if err := refs.SetHead(currentBranch, newHead); err != nil {
		_ = db.SetBranchHead(currentBranch, oldHead)
		return fmt.Errorf("failed to set ref head: %w", err)
	}

	// Restore files from new HEAD
	if newHead != "" {
		newCommit, err := db.GetCommit(newHead)
		if err == nil {
			if err := restoreTreeFromCommit(storage, repoPath, newCommit.TreeHash); err != nil {
				fmt.Fprintf(os.Stderr, "Warning: failed to restore files: %v\n", err)
			}
		}
	}

	// Clear index
	index, _ := core.NewIndex(repoPath)
	index.Clear()

	hashShort := newHead
	if len(hashShort) > 8 {
		hashShort = hashShort[:8]
	}
	fmt.Printf("Successfully moved '%s' on top of '%s' (HEAD: %s)\n", currentBranch, baseBranchName, hashShort)

	return nil
}

// getCommitsBetween gets all commits between mergeBase and head (in chronological order, oldest first)
func getCommitsBetween(db *core.Database, mergeBase, head string) ([]*models.Commit, error) {
	var commits []*models.Commit

	// If merge base is empty, get all commits from head
	if mergeBase == "" {
		current := head
		for current != "" {
			commit, err := db.GetCommit(current)
			if err != nil {
				break
			}
			commits = append([]*models.Commit{commit}, commits...) // Prepend to maintain order
			current = commit.ParentHash
		}
		return commits, nil
	}

	// Build set of all commits from merge base to head
	commitSet := make(map[string]*models.Commit)
	current := head
	for current != "" && current != mergeBase {
		commit, err := db.GetCommit(current)
		if err != nil {
			break
		}
		commitSet[current] = commit
		current = commit.ParentHash
	}

	// If we didn't reach merge base, return error
	if current != mergeBase && mergeBase != "" {
		return nil, fmt.Errorf("merge base not found in commit history")
	}

	// Build ordered list by following parent chain from head
	current = head
	for current != "" && current != mergeBase {
		if commit, exists := commitSet[current]; exists {
			commits = append([]*models.Commit{commit}, commits...) // Prepend to maintain order
			current = commit.ParentHash
		} else {
			break
		}
	}

	return commits, nil
}
