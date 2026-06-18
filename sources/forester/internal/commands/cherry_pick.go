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

// CherryPick applies changes from a specified commit to the current branch.
func CherryPick(args []string) error {
	if len(args) == 0 {
		return fmt.Errorf("commit hash required")
	}
	if len(args) > 1 {
		return fmt.Errorf("unexpected arguments after commit hash")
	}

	commitHash := args[0]

	repoPath, err := utils.FindRepositoryRoot(".")
	if err != nil {
		return fmt.Errorf("not a Forester repository")
	}

	repo, err := core.OpenRepository(repoPath)
	if err != nil {
		return fmt.Errorf("failed to open repository: %w", err)
	}
	defer repo.Close()

	storage := repo.Storage
	refs := repo.Refs
	hooks := core.NewHooks(repoPath)

	// Get current branch
	currentBranch, err := refs.GetCurrentBranch()
	if err != nil || currentBranch == "" {
		currentBranch = "main"
	}

	// Resolve commit hash (support HEAD, short hashes)
	resolvedHash, err := resolveCommitHash(repo, currentBranch, commitHash)
	if err != nil {
		return err
	}
	commitHash = resolvedHash

	// Get commit to cherry-pick
	commitToPick, err := repo.GetCommit(commitHash)
	if err != nil {
		return fmt.Errorf("commit not found: %s", commitHash)
	}

	// Get parent commit
	if commitToPick.ParentHash == "" {
		return fmt.Errorf("cannot cherry-pick initial commit")
	}

	parentCommit, err := repo.GetCommit(commitToPick.ParentHash)
	if err != nil {
		return fmt.Errorf("parent commit not found: %s", commitToPick.ParentHash)
	}

	currentHead, err := repo.GetBranchHead(currentBranch)

	// Get trees
	commitTreeContent, err := storage.GetTreeContent(commitToPick.TreeHash)
	if err != nil {
		return fmt.Errorf("failed to get tree content for commit: %w", err)
	}

	parentTreeContent, err := storage.GetTreeContent(parentCommit.TreeHash)
	if err != nil {
		return fmt.Errorf("failed to get tree content for parent: %w", err)
	}

	var commitTree, parentTree models.Tree
	if err := json.Unmarshal([]byte(commitTreeContent), &commitTree); err != nil {
		return fmt.Errorf("failed to parse commit tree: %w", err)
	}
	if err := json.Unmarshal([]byte(parentTreeContent), &parentTree); err != nil {
		return fmt.Errorf("failed to parse parent tree: %w", err)
	}

	// Get current HEAD tree
	var currentTree models.Tree
	if currentHead != "" {
		currentCommit, err := repo.GetCommit(currentHead)
		if err == nil {
			currentTreeContent, err := storage.GetTreeContent(currentCommit.TreeHash)
			if err == nil {
				json.Unmarshal([]byte(currentTreeContent), &currentTree)
			}
		}
	}

	// Build maps
	commitTreeMap := make(map[string]*models.TreeEntry)
	for _, entry := range commitTree.Entries {
		commitTreeMap[entry.Name] = entry
	}

	parentTreeMap := make(map[string]*models.TreeEntry)
	for _, entry := range parentTree.Entries {
		parentTreeMap[entry.Name] = entry
	}

	currentTreeMap := make(map[string]*models.TreeEntry)
	for _, entry := range currentTree.Entries {
		currentTreeMap[entry.Name] = entry
	}

	// Load .dfmignore
	patterns := utils.NewPatterns()
	ignorePath := filepath.Join(repoPath, ".dfmignore")
	if utils.Exists(ignorePath) {
		patterns.LoadFromFile(ignorePath)
	}

	// Compute diff: what changed between parent and commit
	// Apply those changes to current state

	index, err := core.NewIndex(repoPath)
	if err != nil {
		return fmt.Errorf("failed to create index: %w", err)
	}

	// Start with current tree as base
	// Then apply changes from commit

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

			// Remove from index (mark as deleted)
			index.MarkDeleted(fullPath)

			// Delete file if it exists
			if utils.Exists(fullPath) {
				if err := utils.RemoveRecursive(fullPath); err != nil {
					// Log warning but continue
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
		return fmt.Errorf("nothing to commit after cherry-pick")
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

	// Create commit with original message
	commit := models.NewCommit()
	commit.ParentHash = currentHead
	commit.TreeHash = treeHash
	commit.Author = author
	commit.Message = commitToPick.Message
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

	if _, err := repo.StoreCommit(commit); err != nil {
		return fmt.Errorf("failed to store commit: %w", err)
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
	originalHashShort := commitHash
	if len(originalHashShort) > 8 {
		originalHashShort = originalHashShort[:8]
	}
	fmt.Printf("[%s %s] %s (cherry-picked from %s)\n", currentBranch, hashShort, commit.Message, originalHashShort)

	return nil
}
