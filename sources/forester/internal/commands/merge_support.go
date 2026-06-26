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

// markConflictInFile marks conflict in a file
func markConflictInFile(storage *core.Storage, filePath string, ourHash, theirHash, baseHash string) error {
	ourContentBytes, err := storage.GetBlobContent(ourHash)
	if err != nil {
		return fmt.Errorf("get our version for %s: %w", filePath, err)
	}
	ourContent := string(ourContentBytes)

	theirContentBytes, err := storage.GetBlobContent(theirHash)
	if err != nil {
		return fmt.Errorf("get their version for %s: %w", filePath, err)
	}
	theirContent := string(theirContentBytes)

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
func continueMerge(repoPath string, repo *core.Repository, hooks *core.Hooks) error {
	storage := repo.Storage
	refs := repo.Refs
	state, err := loadMergeState(repoPath)
	if err != nil {
		return err
	}

	currentHead, err := mergeStateString(state, "current_head")
	if err != nil {
		return err
	}
	targetHead, err := mergeStateString(state, "target_head")
	if err != nil {
		return err
	}
	branchToMerge, err := mergeStateString(state, "branch")
	if err != nil {
		return err
	}

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
	return performMergeCommitAfterContinue(repoPath, repo, storage, refs, hooks, currentBranch, currentHead, targetHead, branchToMerge, opts, index)
}

// performMergeCommitAfterContinue performs merge commit after continue (with pre-built index)
func performMergeCommitAfterContinue(repoPath string, repo *core.Repository, storage *core.Storage, refs *core.Refs, hooks *core.Hooks,
	currentBranch, currentHead, targetHead, branchToMerge string, opts MergeOptions, index *core.Index) error {

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
func findMergeBase(repo *core.Repository, commit1, commit2 string) (string, error) {
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
		c, err := repo.GetCommit(commit)
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
		c, err := repo.GetCommit(commit)
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
func isAncestor(repo *core.Repository, ancestor, commit string) bool {
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
		commit, err := repo.GetCommit(c)
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
func abortMerge(repoPath string, repo *core.Repository) error {
	refs := repo.Refs
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
			oldHead, _ := repo.GetBranchHead(currentBranch)
			_ = repo.SetBranchHead(currentBranch, currentHead, oldHead)
		}
	}

	// Remove merge state and binary conflict staging
	utils.RemoveRecursive(mergeStatePath)
	mergeTheirsDir := filepath.Join(repoPath, ".DFM", "merge_theirs")
	utils.RemoveRecursive(mergeTheirsDir)

	fmt.Println("Merge aborted")
	return nil
}

func mergeStateString(state map[string]interface{}, key string) (string, error) {
	value, ok := state[key]
	if !ok {
		return "", fmt.Errorf("merge state missing %q", key)
	}
	text, ok := value.(string)
	if !ok || text == "" {
		return "", fmt.Errorf("merge state invalid %q", key)
	}
	return text, nil
}
