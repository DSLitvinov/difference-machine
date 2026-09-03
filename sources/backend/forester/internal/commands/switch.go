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

// Switch safely switches to a branch or checks out a specific commit.
// With -a flag, automatically creates a stash before switching and restores it when returning.
// It restores files from the commit's tree to the working directory and executes pre/post-checkout hooks.
func Switch(args []string) error {
	if len(args) == 0 {
		return fmt.Errorf("branch or commit hash required")
	}

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

	// Parse arguments
	autoStash := false
	keepStash := false
	var target string

	for _, arg := range args {
		if arg == "-a" || arg == "--auto-stash" {
			autoStash = true
		} else if arg == "--keep-stash" {
			keepStash = true
		} else if !strings.HasPrefix(arg, "-") {
			if target != "" {
				return fmt.Errorf("multiple targets specified")
			}
			target = arg
		} else {
			return fmt.Errorf("unknown flag: %s", arg)
		}
	}

	if target == "" {
		return fmt.Errorf("branch or commit hash required")
	}

	// Get current branch
	currentBranch, err := refs.GetCurrentBranch()
	if err != nil || currentBranch == "" {
		currentBranch = "main"
	}

	// Determine if it's a branch or commit
	branches, err := repo.ListBranches()
	if err != nil {
		return fmt.Errorf("failed to list branches: %w", err)
	}

	var targetBranchName string
	var commitHash string
	isBranch := false

	for _, branchName := range branches {
		if branchName == target {
			targetBranchName = branchName
			commitHash, _ = repo.GetBranchHead(branchName)
			isBranch = true
			break
		}
	}

	if !isBranch {
		// Try as commit - resolve hash (support HEAD, short hashes)
		resolvedHash, err := resolveCommitHash(repo, currentBranch, target)
		if err != nil {
			return fmt.Errorf("branch or commit '%s' not found", target)
		}
		commitHash = resolvedHash
		// Verify commit exists
		_, err = repo.GetCommit(commitHash)
		if err != nil {
			return fmt.Errorf("commit not found: %s", target)
		}
	}

	// If it's a branch, check if switching to the same branch
	// But allow switching if we're in detached HEAD state (after checkout commit)
	if isBranch && targetBranchName == currentBranch {
		branchHead, _ := repo.GetBranchHead(currentBranch)
		_ = branchHead
	}

	// Check for uncommitted changes
	var stashHash string
	hasChanges, err := hasUncommittedChanges(repoPath, repo, currentBranch)
	if err != nil {
		return fmt.Errorf("failed to check for uncommitted changes: %w", err)
	}

	if hasChanges {
		if !autoStash {
			if isBranch {
				return fmt.Errorf("cannot switch branches: you have uncommitted changes.\nUse 'forester switch -a %s' to automatically stash changes", target)
			} else {
				return fmt.Errorf("cannot checkout commit: you have uncommitted changes.\nUse 'forester switch -a %s' to automatically stash changes", target)
			}
		}

		// Create automatic stash
		stashHash, err = createAutoStash(repoPath, repo, currentBranch)
		if err != nil {
			return fmt.Errorf("failed to create stash: %w", err)
		}
	}

	// Get target commit hash
	var targetCommitHash string
	if isBranch {
		targetCommitHash, _ = repo.GetBranchHead(targetBranchName)
	} else {
		targetCommitHash = commitHash
	}

	// Execute pre-checkout hook
	envVars := []string{
		fmt.Sprintf("FORESTER_REPO_PATH=%s", repoPath),
		fmt.Sprintf("FORESTER_COMMIT_HASH=%s", targetCommitHash),
	}
	success, err := hooks.ExecuteHook(core.HookTypePreCheckout, envVars)
	if err != nil || !success {
		return fmt.Errorf("pre-checkout hook failed")
	}

	// If it's a branch with no commits, just switch
	if isBranch && targetCommitHash == "" {
		if stashHash != "" {
			sourceTree := headTreeHash(repo, repoPath, currentBranch)
			if sourceTree != "" {
				if err := core.RestoreTreeToWorkdir(storage, repoPath, sourceTree); err != nil {
					return fmt.Errorf("failed to restore files: %w", err)
				}
				if err := removeWorkdirPathsNotInTree(repoPath, storage, sourceTree); err != nil {
					return err
				}
			}
			if err := storeAutoStashInfo(repoPath, currentBranch, stashHash); err != nil {
				fmt.Fprintf(os.Stderr, "Warning: failed to store stash info: %v\n", err)
			}
		}
		if err := refs.SetCurrentBranch(targetBranchName); err != nil {
			return fmt.Errorf("failed to set current branch: %w", err)
		}
		fmt.Printf("Switched to branch '%s' (no commits yet)\n", targetBranchName)
		if stashHash != "" {
			fmt.Printf("Stashed changes: %s\n", stashHash[:8])
		}
		if !keepStash {
			restoreAutoStashIfNeeded(repoPath, repo, targetBranchName)
		}
		return nil
	}

	// For commit checkout, we need a commit hash
	if !isBranch && targetCommitHash == "" {
		return fmt.Errorf("commit hash required")
	}

	// Get target commit
	targetCommit, err := repo.GetCommit(targetCommitHash)
	if err != nil {
		return fmt.Errorf("failed to get target commit: %w", err)
	}

	currentTreeHash := headTreeHash(repo, repoPath, currentBranch)
	if hasChanges {
		if err := core.RestoreTreeToWorkdir(storage, repoPath, targetCommit.TreeHash); err != nil {
			return fmt.Errorf("failed to restore files: %w", err)
		}
		if err := removeWorkdirPathsNotInTree(repoPath, storage, targetCommit.TreeHash); err != nil {
			return err
		}
	} else {
		if err := core.RestoreWorkdirDelta(storage, repoPath, currentTreeHash, targetCommit.TreeHash); err != nil {
			return fmt.Errorf("failed to restore files: %w", err)
		}
	}

	// Update HEAD and current branch (only for branches)
	// For commit checkout, we don't update branch HEAD (detached HEAD state)
	if isBranch {
		if err := refs.SetCurrentBranch(targetBranchName); err != nil {
			return fmt.Errorf("failed to set current branch: %w", err)
		}
		if err := core.ClearDetachedHead(repoPath); err != nil {
			return fmt.Errorf("failed to clear detached HEAD: %w", err)
		}
	} else {
		// For commit checkout, we're in detached HEAD state
		if err := core.WriteDetachedHead(repoPath, targetCommitHash, currentBranch); err != nil {
			return fmt.Errorf("failed to record detached HEAD: %w", err)
		}
	}

	// Clear index
	index, err := core.NewIndex(repoPath)
	if err == nil {
		index.Clear()
	}

	// Execute post-checkout hook
	_, _ = hooks.ExecuteHook(core.HookTypePostCheckout, envVars)

	if isBranch {
		fmt.Printf("Switched to branch '%s'\n", targetBranchName)
		if stashHash != "" {
			fmt.Printf("Stashed changes: %s\n", stashHash[:8])
			// Store stash hash for later restoration
			if err := storeAutoStashInfo(repoPath, currentBranch, stashHash); err != nil {
				fmt.Fprintf(os.Stderr, "Warning: failed to store stash info: %v\n", err)
			}
		}
		if !keepStash {
			restoreAutoStashIfNeeded(repoPath, repo, targetBranchName)
		}
	} else {
		hashShort := targetCommitHash
		if len(hashShort) > 8 {
			hashShort = hashShort[:8]
		}
		fmt.Printf("Checked out commit %s\n", hashShort)
		if stashHash != "" {
			fmt.Printf("Stashed changes: %s\n", stashHash[:8])
			// Store stash hash for later restoration when switching back to a branch
			// Use current branch name as key
			if err := storeAutoStashInfo(repoPath, currentBranch, stashHash); err != nil {
				fmt.Fprintf(os.Stderr, "Warning: failed to store stash info: %v\n", err)
			}
		}
	}

	return nil
}

func headTreeHash(repo *core.Repository, repoPath, branch string) string {
	head := ""
	if detached, state, err := core.ReadDetachedHead(repoPath); err == nil && detached {
		head = state.Commit
	} else {
		head, _ = repo.GetBranchHead(branch)
	}
	if head == "" {
		return ""
	}
	commit, err := repo.GetCommit(head)
	if err != nil {
		return ""
	}
	return commit.TreeHash
}

func removeWorkdirPathsNotInTree(repoPath string, storage *core.Storage, treeHash string) error {
	allFiles, err := utils.ListFiles(repoPath, true)
	if err != nil {
		return err
	}
	targetFiles, err := core.TreeBlobPaths(storage, treeHash)
	if err != nil {
		return err
	}
	patterns := utils.NewPatterns()
	ignorePath := filepath.Join(repoPath, ".dfmignore")
	if utils.Exists(ignorePath) {
		patterns.LoadFromFile(ignorePath)
	}
	for _, filePath := range allFiles {
		if strings.Contains(filePath, ".DFM") {
			continue
		}
		relPath, err := utils.GetRelativePath(repoPath, filePath)
		if err != nil {
			continue
		}
		relPath = filepath.ToSlash(relPath)
		if patterns.Matches(relPath) {
			continue
		}
		if targetFiles[relPath] {
			continue
		}
		if utils.Exists(filePath) {
			if err := utils.RemoveRecursive(filePath); err != nil {
				fmt.Fprintf(os.Stderr, "Warning: failed to delete file %s: %v\n", relPath, err)
			}
		}
	}
	return nil
}

// hasUncommittedChanges checks if there are uncommitted changes in working directory or index
func hasUncommittedChanges(repoPath string, repo *core.Repository, branch string) (bool, error) {
	storage := repo.Storage
	headCommit, err := repo.GetBranchHead(branch)
	if detached, state, readErr := core.ReadDetachedHead(repoPath); readErr == nil && detached {
		headCommit = state.Commit
	}

	// Get HEAD tree
	var headTree models.Tree
	if headCommit != "" {
		commit, err := repo.GetCommit(headCommit)
		if err == nil {
			treeContent, err := storage.GetTreeContent(commit.TreeHash)
			if err == nil {
				json.Unmarshal([]byte(treeContent), &headTree)
			}
		}
	}

	// Get index
	index, err := core.NewIndex(repoPath)
	if err != nil {
		return false, err
	}

	// Check if index is not empty
	if !index.IsEmpty() {
		return true, nil
	}

	// Check working directory for changes
	patterns := utils.NewPatterns()
	ignorePath := filepath.Join(repoPath, ".dfmignore")
	if utils.Exists(ignorePath) {
		patterns.LoadFromFile(ignorePath)
	}

	trackedMap := make(map[string]string)
	if headCommit != "" {
		// Use BuildTreeMapRecursive to handle nested trees
		treeMap := make(map[string]*models.TreeEntry)
		if err := core.BuildTreeMapRecursive(storage, &headTree, "", treeMap); err != nil {
			return false, fmt.Errorf("build tree map: %w", err)
		}
		for path, entry := range treeMap {
			if entry.Type == "blob" {
				trackedMap[path] = entry.Hash
			}
		}
	}

	allFiles, err := utils.ListFiles(repoPath, true)
	if err != nil {
		return false, err
	}

	for _, filePath := range allFiles {
		if strings.Contains(filePath, ".DFM") {
			continue
		}

		relPath, err := utils.GetRelativePath(repoPath, filePath)
		if err != nil {
			continue
		}

		// Normalize path separators to match BuildTreeMapRecursive
		normalizedPath := filepath.ToSlash(relPath)

		if patterns.Matches(relPath) {
			continue
		}

		currentHash, err := core.HashFile(filePath)
		if err != nil {
			continue
		}

		if trackedHash, isTracked := trackedMap[normalizedPath]; isTracked {
			if currentHash != trackedHash {
				return true, nil
			}
		} else {
			// Untracked file
			return true, nil
		}
	}

	// Check for deleted tracked files
	for relPath := range trackedMap {
		fullPath := filepath.Join(repoPath, relPath)
		if !utils.Exists(fullPath) {
			return true, nil
		}
	}

	return false, nil
}

// createAutoStash creates an automatic stash for the current branch
func createAutoStash(repoPath string, repo *core.Repository, branch string) (string, error) {
	message := fmt.Sprintf("Auto-stash: switching from %s", branch)
	stash, err := core.CreateStashFromWorkingTree(repo, message)
	if err != nil {
		return "", err
	}
	return stash.Hash, nil
}

// AutoStashStack represents a stack of auto-stash hashes
type AutoStashStack struct {
	Stashes []string `json:"stashes"`
}

// storeAutoStashInfo stores information about auto-stash in a stack for later restoration
func storeAutoStashInfo(repoPath, branch, stashHash string) error {
	stashInfoPath := filepath.Join(repoPath, ".DFM", "auto-stash", branch)
	if err := utils.EnsureDirectory(filepath.Dir(stashInfoPath)); err != nil {
		return err
	}

	// Load existing stack or create new one
	var stack AutoStashStack
	if utils.Exists(stashInfoPath) {
		data, err := utils.ReadFile(stashInfoPath)
		if err == nil {
			json.Unmarshal(data, &stack)
		}
	}
	if stack.Stashes == nil {
		stack.Stashes = []string{}
	}

	// Add new stash to the stack (push)
	stack.Stashes = append(stack.Stashes, stashHash)

	// Save stack back to file
	data, err := json.MarshalIndent(stack, "", "  ")
	if err != nil {
		return err
	}
	return utils.WriteFile(stashInfoPath, data)
}

// ForgetAutoStash removes a stash hash from every auto-stash stack.
func ForgetAutoStash(repoPath, stashHash string) {
	dir := filepath.Join(repoPath, ".DFM", "auto-stash")
	if !utils.Exists(dir) {
		return
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return
	}
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		path := filepath.Join(dir, entry.Name())
		data, err := utils.ReadFile(path)
		if err != nil {
			continue
		}
		var stack AutoStashStack
		if err := json.Unmarshal(data, &stack); err != nil {
			if strings.TrimSpace(string(data)) == stashHash {
				_ = utils.RemoveRecursive(path)
			}
			continue
		}
		kept := make([]string, 0, len(stack.Stashes))
		for _, hash := range stack.Stashes {
			if hash != stashHash {
				kept = append(kept, hash)
			}
		}
		if len(kept) == len(stack.Stashes) {
			continue
		}
		if len(kept) == 0 {
			_ = utils.RemoveRecursive(path)
			continue
		}
		stack.Stashes = kept
		out, err := json.MarshalIndent(stack, "", "  ")
		if err != nil {
			continue
		}
		_ = utils.WriteFile(path, out)
	}
}

// restoreAutoStashIfNeeded checks if there's an auto-stash stack for the current branch and restores stashes in LIFO order
func restoreAutoStashIfNeeded(repoPath string, repo *core.Repository, branch string) {
	stashStore := repo.Stash
	storage := repo.Storage
	stashInfoPath := filepath.Join(repoPath, ".DFM", "auto-stash", branch)
	if !utils.Exists(stashInfoPath) {
		return
	}

	// Load stack
	data, err := utils.ReadFile(stashInfoPath)
	if err != nil {
		return
	}

	var stack AutoStashStack
	if err := json.Unmarshal(data, &stack); err != nil {
		// Try to read as old format (single hash)
		oldHash := strings.TrimSpace(string(data))
		if oldHash != "" {
			stack.Stashes = []string{oldHash}
		} else {
			return
		}
	}

	if len(stack.Stashes) == 0 {
		// Stack is empty, delete file
		utils.RemoveRecursive(stashInfoPath)
		return
	}

	// Restore stashes in reverse order (LIFO - Last In First Out)
	restoredCount := 0
	for i := len(stack.Stashes) - 1; i >= 0; i-- {
		stashHash := stack.Stashes[i]
		if stashHash == "" {
			continue
		}

		// Get stash
		stash, err := stashStore.GetStash(stashHash)
		if err != nil {
			// Stash doesn't exist, skip it
			continue
		}

		if err := core.RestoreTreeToWorkdir(storage, repoPath, stash.TreeHash); err != nil {
			continue
		}

		stashStore.DeleteStash(stashHash)
		restoredCount++

		hashShort := stashHash
		if len(hashShort) > 8 {
			hashShort = hashShort[:8]
		}
		fmt.Printf("Restored auto-stash: %s\n", hashShort)
	}

	// Clear the stack after restoring all stashes
	stack.Stashes = []string{}
	if len(stack.Stashes) == 0 {
		// Stack is empty, delete file
		utils.RemoveRecursive(stashInfoPath)
	} else {
		// Save empty stack (shouldn't happen, but just in case)
		data, _ := json.MarshalIndent(stack, "", "  ")
		utils.WriteFile(stashInfoPath, data)
	}
}
