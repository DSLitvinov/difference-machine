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

// Revert creates a new commit that undoes the changes from a specified commit.
// It computes the reverse diff and applies it to create a revert commit.
func Revert(args []string) error {
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

	// Get commit to revert
	commitToRevert, err := repo.GetCommit(commitHash)
	if err != nil {
		return fmt.Errorf("commit not found: %s", commitHash)
	}

	// Get parent commit (what was before the changes)
	if commitToRevert.ParentHash == "" {
		return fmt.Errorf("cannot revert initial commit")
	}

	parentCommit, err := repo.GetCommit(commitToRevert.ParentHash)
	if err != nil {
		return fmt.Errorf("parent commit not found: %s", commitToRevert.ParentHash)
	}

	currentHead, err := repo.GetBranchHead(currentBranch)

	// Get trees
	treeToRevertContent, err := storage.GetTreeContent(commitToRevert.TreeHash)
	if err != nil {
		return fmt.Errorf("failed to get tree content for commit to revert: %w", err)
	}

	parentTreeContent, err := storage.GetTreeContent(parentCommit.TreeHash)
	if err != nil {
		return fmt.Errorf("failed to get tree content for parent commit: %w", err)
	}

	var treeToRevert, parentTree models.Tree
	if err := json.Unmarshal([]byte(treeToRevertContent), &treeToRevert); err != nil {
		return fmt.Errorf("failed to parse tree to revert: %w", err)
	}
	if err := json.Unmarshal([]byte(parentTreeContent), &parentTree); err != nil {
		return fmt.Errorf("failed to parse parent tree: %w", err)
	}

	// Build maps
	treeToRevertMap := make(map[string]*models.TreeEntry)
	for _, entry := range treeToRevert.Entries {
		treeToRevertMap[entry.Name] = entry
	}

	parentTreeMap := make(map[string]*models.TreeEntry)
	for _, entry := range parentTree.Entries {
		parentTreeMap[entry.Name] = entry
	}

	// Get current HEAD tree for applying changes
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

	// Compute reverse diff: what to add/remove/modify
	// Files added in commitToRevert should be deleted
	// Files deleted in commitToRevert should be restored from parent
	// Files modified in commitToRevert should be reverted to parent version

	index, err := core.NewIndex(repoPath)
	if err != nil {
		return fmt.Errorf("failed to create index: %w", err)
	}

	// Process files that were added in commitToRevert (delete them)
	for name := range treeToRevertMap {
		if _, existsInParent := parentTreeMap[name]; !existsInParent {
			// File was added in commitToRevert, should be deleted
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

	// Process files that were deleted in commitToRevert (restore them)
	for name, parentEntry := range parentTreeMap {
		if _, existsInRevert := treeToRevertMap[name]; !existsInRevert {
			// File was deleted in commitToRevert, should be restored
			relPath := name
			fullPath := filepath.Join(repoPath, relPath)

			// Ensure directory exists
			if err := utils.EnsureDirectory(filepath.Dir(fullPath)); err != nil {
				return fmt.Errorf("failed to create directory for %s: %w", relPath, err)
			}

			// Restore file from parent
			if err := storage.WriteBlobToFile(parentEntry.Hash, fullPath); err != nil {
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

	// Process files that were modified in commitToRevert (revert to parent)
	for name, revertEntry := range treeToRevertMap {
		if parentEntry, existsInParent := parentTreeMap[name]; existsInParent {
			if revertEntry.Hash != parentEntry.Hash {
				// File was modified in commitToRevert, should be reverted
				relPath := name
				fullPath := filepath.Join(repoPath, relPath)

				// Restore file from parent
				if err := storage.WriteBlobToFile(parentEntry.Hash, fullPath); err != nil {
					return fmt.Errorf("failed to revert file %s: %w", relPath, err)
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

	// Check if index is empty (nothing to revert)
	if index.IsEmpty() {
		return fmt.Errorf("nothing to revert")
	}

	// Get author
	author := core.DefaultAuthor()

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

	// Create commit with revert message
	commit := models.NewCommit()
	commit.ParentHash = currentHead
	commit.TreeHash = treeHash
	commit.Author = author
	commit.Message = fmt.Sprintf("Revert \"%s\"", commitToRevert.Message)
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
	fmt.Printf("[%s %s] %s\n", currentBranch, hashShort, commit.Message)

	return nil
}
