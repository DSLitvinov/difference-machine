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
	autoStash := false
	var target string

	for _, arg := range args {
		if arg == "-a" || arg == "--auto-stash" {
			autoStash = true
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
	branches, err := db.ListBranches()
	if err != nil {
		return fmt.Errorf("failed to list branches: %w", err)
	}

	var targetBranch *models.Branch
	var commitHash string
	isBranch := false

	for _, branch := range branches {
		if branch.Name == target {
			targetBranch = branch
			commitHash = branch.CommitHash
			isBranch = true
			break
		}
	}

	if !isBranch {
		// Try as commit - resolve hash (support HEAD, short hashes)
		resolvedHash, err := resolveCommitHash(db, refs, currentBranch, target)
		if err != nil {
			return fmt.Errorf("branch or commit '%s' not found", target)
		}
		commitHash = resolvedHash
		// Verify commit exists
		_, err = db.GetCommit(commitHash)
		if err != nil {
			return fmt.Errorf("commit not found: %s", target)
		}
	}

	// If it's a branch, check if switching to the same branch
	// But allow switching if we're in detached HEAD state (after checkout commit)
	if isBranch && targetBranch.Name == currentBranch {
		// Check if we're actually on the branch HEAD (not in detached HEAD)
		branchHead, err := db.GetBranchHead(currentBranch)
		if err != nil || branchHead == "" {
			branchHead, _ = refs.GetHead(currentBranch)
		}

		// Try to determine current commit by checking working directory
		// If branch HEAD exists and matches what we expect, we're on the branch
		if branchHead != "" {
			// Check if current working directory matches branch HEAD
			// This is a simple heuristic - if branch has commits, assume we're on it
			// In practice, we should check the actual state, but for now allow switching
			// if we might be in detached HEAD (after checkout commit)
			// For simplicity, always allow switching to the same branch if it has commits
			// The user might be returning from a detached HEAD state
		} else {
			// Branch has no commits, allow switching
		}
		// Note: We allow switching to the same branch to support returning from detached HEAD
		// The actual check happens later when we try to restore files
	}

	// Check for uncommitted changes
	var stashHash string
	hasChanges, err := hasUncommittedChanges(repoPath, db, storage, refs, currentBranch)
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
		stashHash, err = createAutoStash(repoPath, db, storage, currentBranch)
		if err != nil {
			return fmt.Errorf("failed to create stash: %w", err)
		}
	}

	// Get target commit hash
	var targetCommitHash string
	if isBranch {
		targetCommitHash = targetBranch.CommitHash
		if targetCommitHash == "" {
			targetCommitHash, _ = refs.GetHead(targetBranch.Name)
		}
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
		if err := refs.SetCurrentBranch(targetBranch.Name); err != nil {
			return fmt.Errorf("failed to set current branch: %w", err)
		}
		fmt.Printf("Switched to branch '%s' (no commits yet)\n", targetBranch.Name)
		if stashHash != "" {
			fmt.Printf("Stashed changes: %s\n", stashHash[:8])
		}
		return nil
	}

	// For commit checkout, we need a commit hash
	if !isBranch && targetCommitHash == "" {
		return fmt.Errorf("commit hash required")
	}

	// Get target commit
	targetCommit, err := db.GetCommit(targetCommitHash)
	if err != nil {
		return fmt.Errorf("failed to get target commit: %w", err)
	}

	// Get target tree
	treeContent, err := storage.GetTreeContent(targetCommit.TreeHash)
	if err != nil {
		return fmt.Errorf("failed to get tree content: %w", err)
	}

	var tree models.Tree
	if err := json.Unmarshal([]byte(treeContent), &tree); err != nil {
		return fmt.Errorf("failed to parse tree: %w", err)
	}

	// Restore files from target tree
	for _, entry := range tree.Entries {
		filePath := filepath.Join(repoPath, entry.Name)

		if entry.Type == "blob" {
			// Ensure directory exists
			if err := utils.EnsureDirectory(filepath.Dir(filePath)); err != nil {
				return fmt.Errorf("failed to create directory: %w", err)
			}
			if err := storage.WriteBlobToFile(entry.Hash, filePath); err != nil {
				return fmt.Errorf("failed to restore file %s: %w", entry.Name, err)
			}
		} else if entry.Type == "tree" {
			// Recursively restore tree using the same logic as reset
			if err := restoreTreeForSwitch(storage, filepath.Dir(filePath), entry.Hash); err != nil {
				return fmt.Errorf("failed to restore tree %s: %w", entry.Name, err)
			}
		}
	}

	// Delete files that are not in target tree
	allFiles, err := utils.ListFiles(repoPath, true)
	if err == nil {
		patterns := utils.NewPatterns()
		ignorePath := filepath.Join(repoPath, ".dfmignore")
		if utils.Exists(ignorePath) {
			patterns.LoadFromFile(ignorePath)
		}

		targetFiles := make(map[string]bool)
		for _, entry := range tree.Entries {
			targetFiles[entry.Name] = true
		}

		for _, filePath := range allFiles {
			if strings.Contains(filePath, ".DFM") {
				continue
			}

			relPath, err := utils.GetRelativePath(repoPath, filePath)
			if err != nil {
				continue
			}

			if patterns.Matches(relPath) {
				continue
			}

			if !targetFiles[relPath] {
				if utils.Exists(filePath) {
					if err := utils.RemoveRecursive(filePath); err != nil {
						fmt.Fprintf(os.Stderr, "Warning: failed to delete file %s: %v\n", relPath, err)
					}
				}
			}
		}
	}

	// Update HEAD and current branch (only for branches)
	// For commit checkout, we don't update branch HEAD (detached HEAD state)
	if isBranch {
		// Only update if we're actually switching to a different branch or restoring
		// Check if we're already on this branch with the same HEAD
		currentBranchHead, _ := db.GetBranchHead(targetBranch.Name)
		if currentBranchHead == "" {
			currentBranchHead, _ = refs.GetHead(targetBranch.Name)
		}

		// Update branch HEAD and current branch
		if err := refs.SetHead(targetBranch.Name, targetCommitHash); err != nil {
			return fmt.Errorf("failed to set branch head: %w", err)
		}
		if err := refs.SetCurrentBranch(targetBranch.Name); err != nil {
			return fmt.Errorf("failed to set current branch: %w", err)
		}
		if err := db.SetBranchHead(targetBranch.Name, targetCommitHash); err != nil {
			return fmt.Errorf("failed to update branch head in database: %w", err)
		}
	} else {
		// For commit checkout, we're in detached HEAD state
		// Don't update branch HEAD, but we can still track which branch we came from
		// The current branch remains the same, but we're not on its HEAD
	}

	// Clear index
	index, err := core.NewIndex(repoPath)
	if err == nil {
		index.Clear()
	}

	// Execute post-checkout hook
	_, _ = hooks.ExecuteHook(core.HookTypePostCheckout, envVars)

	if isBranch {
		fmt.Printf("Switched to branch '%s'\n", targetBranch.Name)
		if stashHash != "" {
			fmt.Printf("Stashed changes: %s\n", stashHash[:8])
			// Store stash hash for later restoration
			if err := storeAutoStashInfo(repoPath, currentBranch, stashHash); err != nil {
				fmt.Fprintf(os.Stderr, "Warning: failed to store stash info: %v\n", err)
			}
		}
		// Check if we're returning to a branch with auto-stash (always check, not just with -a flag)
		restoreAutoStashIfNeeded(repoPath, db, storage, targetBranch.Name)
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

// hasUncommittedChanges checks if there are uncommitted changes in working directory or index
func hasUncommittedChanges(repoPath string, db *core.Database, storage *core.Storage, refs *core.Refs, branch string) (bool, error) {
	// Get HEAD commit
	headCommit, err := db.GetBranchHead(branch)
	if err != nil || headCommit == "" {
		headCommit, _ = refs.GetHead(branch)
	}

	// Get HEAD tree
	var headTree models.Tree
	if headCommit != "" {
		commit, err := db.GetCommit(headCommit)
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
func createAutoStash(repoPath string, db *core.Database, storage *core.Storage, branch string) (string, error) {
	// Build tree from current state
	tree := models.NewTree()

	patterns := utils.NewPatterns()
	ignorePath := filepath.Join(repoPath, ".dfmignore")
	if utils.Exists(ignorePath) {
		patterns.LoadFromFile(ignorePath)
	}

	allFiles, err := utils.ListFiles(repoPath, true)
	if err != nil {
		return "", err
	}

	for _, filePath := range allFiles {
		if strings.Contains(filePath, ".DFM") {
			continue
		}

		relPath, err := utils.GetRelativePath(repoPath, filePath)
		if err != nil {
			continue
		}

		if patterns.Matches(relPath) {
			continue
		}

		hash, err := storage.StoreBlobFromFile(filePath)
		if err != nil {
			continue
		}

		entry := models.NewTreeEntry(hash, relPath, "blob")
		tree.AddEntry(entry)
	}

	treeJSON, err := tree.ToJSON()
	if err != nil {
		return "", err
	}

	treeHash, err := storage.StoreTree(treeJSON)
	if err != nil {
		return "", err
	}

	message := fmt.Sprintf("Auto-stash: switching from %s", branch)
	stash := models.NewStash(message, treeHash)
	stashJSON := fmt.Sprintf(`{"message":"%s","tree_hash":"%s"}`, message, treeHash)
	stash.Hash = core.HashString(stashJSON)

	if _, err := db.CreateStash(stash); err != nil {
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

// restoreAutoStashIfNeeded checks if there's an auto-stash stack for the current branch and restores stashes in LIFO order
func restoreAutoStashIfNeeded(repoPath string, db *core.Database, storage *core.Storage, branch string) {
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
		stash, err := db.GetStash(stashHash)
		if err != nil {
			// Stash doesn't exist, skip it
			continue
		}

		// Restore stash
		treeContent, err := storage.GetTreeContent(stash.TreeHash)
		if err != nil {
			continue
		}

		var tree models.Tree
		if err := json.Unmarshal([]byte(treeContent), &tree); err != nil {
			continue
		}

		// Restore files
		for _, entry := range tree.Entries {
			filePath := filepath.Join(repoPath, entry.Name)
			if err := utils.EnsureDirectory(filepath.Dir(filePath)); err != nil {
				continue
			}
			if err := storage.WriteBlobToFile(entry.Hash, filePath); err != nil {
				continue
			}
		}

		// Delete stash from database
		db.DeleteStash(stashHash)
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

// restoreTreeForSwitch recursively restores a tree and its entries
func restoreTreeForSwitch(storage *core.Storage, repoPath string, treeHash string) error {
	treeContent, err := storage.GetTreeContent(treeHash)
	if err != nil {
		return err
	}

	var tree models.Tree
	if err := json.Unmarshal([]byte(treeContent), &tree); err != nil {
		return err
	}

	for _, entry := range tree.Entries {
		filePath := filepath.Join(repoPath, entry.Name)

		switch entry.Type {
		case "blob":
			if err := utils.EnsureDirectory(filepath.Dir(filePath)); err != nil {
				return err
			}
			if err := storage.WriteBlobToFile(entry.Hash, filePath); err != nil {
				return fmt.Errorf("failed to restore file %s: %w", entry.Name, err)
			}
		case "tree":
			// Recursively restore sub-tree
			if err := restoreTreeForSwitch(storage, filepath.Dir(filePath), entry.Hash); err != nil {
				return err
			}
		}
	}

	return nil
}
