package commands

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/models"
	"github.com/difference-machine/forester/internal/utils"
)

// Stash manages stashes
func Stash(args []string) error {
	repoPath, err := utils.FindRepositoryRoot(".")
	if err != nil {
		return fmt.Errorf("not a Forester repository")
	}

	repo, err := core.OpenRepository(repoPath)
	if err != nil {
		return fmt.Errorf("failed to open repository: %w", err)
	}
	defer repo.Close()

	stashStore := repo.Stash
	storage := repo.Storage

	if len(args) == 0 || args[0] == "list" {
		if len(args) > 1 {
			return fmt.Errorf("usage: forester stash [list]")
		}
		// List stashes
		stashes, err := stashStore.ListStashes()
		if err != nil {
			return fmt.Errorf("failed to list stashes: %w", err)
		}

		if len(stashes) == 0 {
			fmt.Println("No stashes found")
			return nil
		}

		for _, stash := range stashes {
			hashShort := stash.Hash
			if len(hashShort) > 8 {
				hashShort = hashShort[:8]
			}
			fmt.Printf("stash{%s}: %s\n", hashShort, stash.Message)
		}
		return nil
	}

	command := args[0]

	if command == "save" {
		// Save stash
		message := "Stash"
		if len(args) > 2 {
			return fmt.Errorf("usage: forester stash save [message]")
		}
		if len(args) > 1 {
			message = args[1]
		}

		stash, err := core.CreateStashFromWorkingTree(repo, message)
		if err != nil {
			return fmt.Errorf("failed to create stash: %w", err)
		}

		hashShort := stash.Hash
		if len(hashShort) > 8 {
			hashShort = hashShort[:8]
		}
		fmt.Printf("Saved stash %s\n", hashShort)
		return nil
	}

	if command == "pop" || command == "apply" {
		// Apply stash
		var stashHash string
		if len(args) > 2 {
			return fmt.Errorf("usage: forester stash %s [stash_hash]", command)
		}
		if len(args) > 1 {
			stashHash = args[1]
			// Resolve short hash if needed
			resolved, err := stashStore.ResolveHash(stashHash)
			if err != nil {
				return fmt.Errorf("stash not found: %s", stashHash)
			}
			stashHash = resolved
		} else {
			// Get latest stash
			stashes, err := stashStore.ListStashes()
			if err != nil {
				return fmt.Errorf("failed to list stashes: %w", err)
			}
			if len(stashes) == 0 {
				return fmt.Errorf("no stashes found")
			}
			stashHash = stashes[0].Hash
		}

		stash, err := stashStore.GetStash(stashHash)
		if err != nil {
			return fmt.Errorf("failed to get stash: %w", err)
		}

		if err := core.RestoreTreeToWorkdir(storage, repoPath, stash.TreeHash); err != nil {
			return fmt.Errorf("failed to restore stash: %w", err)
		}

		hashShort := stashHash
		if len(hashShort) > 8 {
			hashShort = hashShort[:8]
		}

		if command == "pop" {
			if err := stashStore.DeleteStash(stashHash); err != nil {
				return fmt.Errorf("failed to delete stash: %w", err)
			}
			fmt.Printf("Popped stash %s\n", hashShort)
		} else {
			fmt.Printf("Applied stash %s\n", hashShort)
		}
		return nil
	}

	if command == "drop" {
		// Delete stash
		if len(args) < 2 {
			return fmt.Errorf("stash hash required")
		}
		if len(args) > 2 {
			return fmt.Errorf("usage: forester stash drop <stash_hash>")
		}

		stashHash := args[1]
		// Resolve short hash if needed
		resolved, err := stashStore.ResolveHash(stashHash)
		if err != nil {
			return fmt.Errorf("stash not found: %s", stashHash)
		}
		stashHash = resolved

		if err := stashStore.DeleteStash(stashHash); err != nil {
			return fmt.Errorf("failed to delete stash: %w", err)
		}

		hashShort := stashHash
		if len(hashShort) > 8 {
			hashShort = hashShort[:8]
		}
		fmt.Printf("Dropped stash %s\n", hashShort)
		return nil
	}

	if command == "clear" {
		if len(args) > 1 {
			return fmt.Errorf("usage: forester stash clear")
		}
		// Delete all stashes
		stashes, err := stashStore.ListStashes()
		if err != nil {
			return fmt.Errorf("failed to list stashes: %w", err)
		}

		if len(stashes) == 0 {
			fmt.Println("No stashes to clear")
			return nil
		}

		for _, stash := range stashes {
			if err := stashStore.DeleteStash(stash.Hash); err != nil {
				fmt.Fprintf(os.Stderr, "Warning: failed to delete stash %s: %v\n", stash.Hash[:8], err)
			}
		}

		fmt.Printf("Cleared %d stash(es)\n", len(stashes))
		return nil
	}

	if command == "show" {
		// Show stash changes
		var stashHash string
		if len(args) > 2 {
			return fmt.Errorf("usage: forester stash show [stash_hash]")
		}
		if len(args) > 1 {
			stashHash = args[1]
			// Resolve short hash if needed
			resolved, err := stashStore.ResolveHash(stashHash)
			if err != nil {
				return fmt.Errorf("stash not found: %s", stashHash)
			}
			stashHash = resolved
		} else {
			// Get latest stash
			stashes, err := stashStore.ListStashes()
			if err != nil {
				return fmt.Errorf("failed to list stashes: %w", err)
			}
			if len(stashes) == 0 {
				return fmt.Errorf("no stashes found")
			}
			stashHash = stashes[0].Hash
		}

		stash, err := stashStore.GetStash(stashHash)
		if err != nil {
			return fmt.Errorf("failed to get stash: %w", err)
		}

		hashShort := stashHash
		if len(hashShort) > 8 {
			hashShort = hashShort[:8]
		}

		fmt.Printf("stash{%s}: %s\n", hashShort, stash.Message)

		// Get current HEAD to compare
		refs := repo.Refs
		currentBranch, err := refs.GetCurrentBranch()
		if err != nil || currentBranch == "" {
			currentBranch = "main"
		}

		currentHead, err := repo.GetBranchHead(currentBranch)

		// Get stash tree
		treeContent, err := storage.GetTreeContent(stash.TreeHash)
		if err != nil {
			return fmt.Errorf("failed to get tree content: %w", err)
		}

		var stashTree models.Tree
		if err := json.Unmarshal([]byte(treeContent), &stashTree); err != nil {
			return fmt.Errorf("failed to parse tree: %w", err)
		}

		// Get current HEAD tree
		var currentTree models.Tree
		if currentHead != "" {
			commit, err := repo.GetCommit(currentHead)
			if err == nil {
				currentTreeContent, err := storage.GetTreeContent(commit.TreeHash)
				if err == nil {
					json.Unmarshal([]byte(currentTreeContent), &currentTree)
				}
			}
		}

		// Build maps
		stashTreeMap := make(map[string]*models.TreeEntry)
		if err := core.BuildTreeMapRecursive(storage, &stashTree, "", stashTreeMap); err != nil {
			return fmt.Errorf("build tree map (stash): %w", err)
		}

		currentTreeMap := make(map[string]*models.TreeEntry)
		if err := core.BuildTreeMapRecursive(storage, &currentTree, "", currentTreeMap); err != nil {
			return fmt.Errorf("build tree map (current): %w", err)
		}

		// Find differences
		var added, modified, deleted []string

		for name, stashEntry := range stashTreeMap {
			if stashEntry.Type == "blob" {
				currentEntry, exists := currentTreeMap[name]
				if !exists {
					added = append(added, name)
				} else if currentEntry.Hash != stashEntry.Hash {
					modified = append(modified, name)
				}
			}
		}

		for name, currentEntry := range currentTreeMap {
			if currentEntry.Type == "blob" {
				if _, exists := stashTreeMap[name]; !exists {
					deleted = append(deleted, name)
				}
			}
		}

		// Print changes
		if len(added) == 0 && len(modified) == 0 && len(deleted) == 0 {
			fmt.Println("No changes in stash")
			return nil
		}

		if len(added) > 0 {
			fmt.Println("Added files:")
			for _, file := range added {
				fmt.Printf("  + %s\n", file)
			}
		}

		if len(modified) > 0 {
			fmt.Println("Modified files:")
			for _, file := range modified {
				fmt.Printf("  M %s\n", file)
			}
		}

		if len(deleted) > 0 {
			fmt.Println("Deleted files:")
			for _, file := range deleted {
				fmt.Printf("  - %s\n", file)
			}
		}

		return nil
	}

	if command == "branch" {
		// Create branch from stash
		if len(args) < 2 {
			return fmt.Errorf("branch name required")
		}
		if len(args) > 3 {
			return fmt.Errorf("usage: forester stash branch <branch_name> [stash_hash]")
		}

		branchName := args[1]
		var stashHash string

		if len(args) > 2 {
			stashHash = args[2]
			// Resolve short hash if needed
			resolved, err := stashStore.ResolveHash(stashHash)
			if err != nil {
				return fmt.Errorf("stash not found: %s", stashHash)
			}
			stashHash = resolved
		} else {
			// Get latest stash
			stashes, err := stashStore.ListStashes()
			if err != nil {
				return fmt.Errorf("failed to list stashes: %w", err)
			}
			if len(stashes) == 0 {
				return fmt.Errorf("no stashes found")
			}
			stashHash = stashes[0].Hash
		}

		stash, err := stashStore.GetStash(stashHash)
		if err != nil {
			return fmt.Errorf("failed to get stash: %w", err)
		}

		// Check if branch already exists
		branches, err := repo.ListBranches()
		if err == nil {
			for _, name := range branches {
				if name == branchName {
					return fmt.Errorf("branch '%s' already exists", branchName)
				}
			}
		}

		// Create commit from stash tree
		author := core.AuthorForRepo(repoPath)

		commit := models.NewCommit()
		commit.ParentHash = "" // Stash branch starts from empty
		commit.TreeHash = stash.TreeHash
		commit.Author = author
		commit.Message = fmt.Sprintf("Stash: %s", stash.Message)
		commit.Type = models.CommitTypeProject

		commitHash, err := core.FinalizeCommit(repo, commit)
		if err != nil {
			return fmt.Errorf("failed to store commit: %w", err)
		}

		if err := repo.CreateBranch(branchName, commitHash); err != nil {
			return fmt.Errorf("failed to create branch: %w", err)
		}

		hashShort := stashHash
		if len(hashShort) > 8 {
			hashShort = hashShort[:8]
		}
		fmt.Printf("Created branch '%s' from stash{%s}\n", branchName, hashShort)
		return nil
	}

	return fmt.Errorf("unknown stash command: %s\nUsage: forester stash [save|list|pop|apply|drop|show|clear|branch]", command)
}
