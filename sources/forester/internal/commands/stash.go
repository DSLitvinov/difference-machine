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

// Stash manages stashes
func Stash(args []string) error {
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

	if len(args) == 0 || args[0] == "list" {
		if len(args) > 1 {
			return fmt.Errorf("usage: forester stash [list]")
		}
		// List stashes
		stashes, err := db.ListStashes()
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

		// Build tree from current state
		tree := models.NewTree()

		patterns := utils.NewPatterns()
		ignorePath := filepath.Join(repoPath, ".dfmignore")
		if utils.Exists(ignorePath) {
			if err := patterns.LoadFromFile(ignorePath); err != nil {
				// Ignore error
			}
		}

		allFiles, err := utils.ListFiles(repoPath, true)
		if err != nil {
			return fmt.Errorf("failed to list files: %w", err)
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
			return fmt.Errorf("failed to serialize tree: %w", err)
		}

		treeHash, err := storage.StoreTree(treeJSON)
		if err != nil {
			return fmt.Errorf("failed to store tree: %w", err)
		}

		stash := models.NewStash(message, treeHash)
		stashJSON := fmt.Sprintf(`{"message":"%s","tree_hash":"%s"}`, message, treeHash)
		stash.Hash = core.HashString(stashJSON)

		if _, err := db.CreateStash(stash); err != nil {
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
			resolved, err := resolveStashHash(db, stashHash)
			if err != nil {
				return fmt.Errorf("stash not found: %s", stashHash)
			}
			stashHash = resolved
		} else {
			// Get latest stash
			stashes, err := db.ListStashes()
			if err != nil {
				return fmt.Errorf("failed to list stashes: %w", err)
			}
			if len(stashes) == 0 {
				return fmt.Errorf("no stashes found")
			}
			stashHash = stashes[0].Hash
		}

		stash, err := db.GetStash(stashHash)
		if err != nil {
			return fmt.Errorf("failed to get stash: %w", err)
		}

		treeContent, err := storage.GetTreeContent(stash.TreeHash)
		if err != nil {
			return fmt.Errorf("failed to get tree content: %w", err)
		}

		var tree models.Tree
		if err := json.Unmarshal([]byte(treeContent), &tree); err != nil {
			return fmt.Errorf("failed to parse tree: %w", err)
		}

		// Restore files
		for _, entry := range tree.Entries {
			filePath := filepath.Join(repoPath, entry.Name)
			if err := storage.WriteBlobToFile(entry.Hash, filePath); err != nil {
				return fmt.Errorf("failed to restore file %s: %w", entry.Name, err)
			}
		}

		hashShort := stashHash
		if len(hashShort) > 8 {
			hashShort = hashShort[:8]
		}

		if command == "pop" {
			if err := db.DeleteStash(stashHash); err != nil {
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
		resolved, err := resolveStashHash(db, stashHash)
		if err != nil {
			return fmt.Errorf("stash not found: %s", stashHash)
		}
		stashHash = resolved

		if err := db.DeleteStash(stashHash); err != nil {
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
		stashes, err := db.ListStashes()
		if err != nil {
			return fmt.Errorf("failed to list stashes: %w", err)
		}

		if len(stashes) == 0 {
			fmt.Println("No stashes to clear")
			return nil
		}

		for _, stash := range stashes {
			if err := db.DeleteStash(stash.Hash); err != nil {
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
			resolved, err := resolveStashHash(db, stashHash)
			if err != nil {
				return fmt.Errorf("stash not found: %s", stashHash)
			}
			stashHash = resolved
		} else {
			// Get latest stash
			stashes, err := db.ListStashes()
			if err != nil {
				return fmt.Errorf("failed to list stashes: %w", err)
			}
			if len(stashes) == 0 {
				return fmt.Errorf("no stashes found")
			}
			stashHash = stashes[0].Hash
		}

		stash, err := db.GetStash(stashHash)
		if err != nil {
			return fmt.Errorf("failed to get stash: %w", err)
		}

		hashShort := stashHash
		if len(hashShort) > 8 {
			hashShort = hashShort[:8]
		}

		fmt.Printf("stash{%s}: %s\n", hashShort, stash.Message)

		// Get current HEAD to compare
		refs := core.NewRefs(repoPath)
		currentBranch, err := refs.GetCurrentBranch()
		if err != nil || currentBranch == "" {
			currentBranch = "main"
		}

		currentHead, err := db.GetBranchHead(currentBranch)
		if err != nil || currentHead == "" {
			currentHead, _ = refs.GetHead(currentBranch)
		}

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
			commit, err := db.GetCommit(currentHead)
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
			resolved, err := resolveStashHash(db, stashHash)
			if err != nil {
				return fmt.Errorf("stash not found: %s", stashHash)
			}
			stashHash = resolved
		} else {
			// Get latest stash
			stashes, err := db.ListStashes()
			if err != nil {
				return fmt.Errorf("failed to list stashes: %w", err)
			}
			if len(stashes) == 0 {
				return fmt.Errorf("no stashes found")
			}
			stashHash = stashes[0].Hash
		}

		stash, err := db.GetStash(stashHash)
		if err != nil {
			return fmt.Errorf("failed to get stash: %w", err)
		}

		// Check if branch already exists
		branches, err := db.ListBranches()
		if err == nil {
			for _, branch := range branches {
				if branch.Name == branchName {
					return fmt.Errorf("branch '%s' already exists", branchName)
				}
			}
		}

		// Create commit from stash tree
		author := os.Getenv("FORESTER_AUTHOR")
		if author == "" {
			author = "Unknown"
		}

		commit := models.NewCommit()
		commit.ParentHash = "" // Stash branch starts from empty
		commit.TreeHash = stash.TreeHash
		commit.Author = author
		commit.Message = fmt.Sprintf("Stash: %s", stash.Message)
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

		commitHash := core.HashString(string(commitJSONForHash))
		commit.Hash = commitHash
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

		// Create branch
		if err := db.CreateBranch(branchName, commitHash); err != nil {
			return fmt.Errorf("failed to create branch: %w", err)
		}

		refs := core.NewRefs(repoPath)
		if err := refs.CreateBranch(branchName, commitHash); err != nil {
			return fmt.Errorf("failed to create branch ref: %w", err)
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

// resolveStashHash resolves a stash hash from short or full hash
func resolveStashHash(db *core.Database, hash string) (string, error) {
	// If it's a full hash, validate and return
	if utils.IsValidCommitHash(hash) {
		// Try to get stash
		_, err := db.GetStash(hash)
		if err == nil {
			return hash, nil
		}
	}

	// Try to find by short hash prefix
	stashes, err := db.ListStashes()
	if err != nil {
		return "", err
	}

	for _, stash := range stashes {
		if strings.HasPrefix(stash.Hash, hash) {
			return stash.Hash, nil
		}
	}

	return "", fmt.Errorf("stash not found: %s", hash)
}
