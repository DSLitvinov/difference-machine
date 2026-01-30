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

// Reset moves HEAD to a specified commit with different modes:
// --soft: move HEAD only, keep changes in index
// --mixed (default): move HEAD, clear index, keep changes in working directory
// --hard: move HEAD, clear index, update working directory
func Reset(args []string) error {
	if len(args) == 0 {
		return fmt.Errorf("commit hash required")
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

	// Get current branch
	currentBranch, err := refs.GetCurrentBranch()
	if err != nil || currentBranch == "" {
		currentBranch = "main"
	}

	// Parse mode
	mode := "mixed" // default
	var targetHash string
	modeSet := false

	for _, arg := range args {
		if arg == "--soft" {
			if modeSet && mode != "soft" {
				return fmt.Errorf("reset mode flags are mutually exclusive")
			}
			mode = "soft"
			modeSet = true
		} else if arg == "--mixed" {
			if modeSet && mode != "mixed" {
				return fmt.Errorf("reset mode flags are mutually exclusive")
			}
			mode = "mixed"
			modeSet = true
		} else if arg == "--hard" {
			if modeSet && mode != "hard" {
				return fmt.Errorf("reset mode flags are mutually exclusive")
			}
			mode = "hard"
			modeSet = true
		} else if !strings.HasPrefix(arg, "--") {
			if targetHash != "" {
				return fmt.Errorf("multiple commit hashes provided")
			}
			targetHash = arg
		} else {
			return fmt.Errorf("unknown flag: %s", arg)
		}
	}

	if targetHash == "" {
		return fmt.Errorf("commit hash required")
	}

	// Resolve commit hash (support HEAD, short hashes)
	resolvedHash, err := resolveCommitHash(db, refs, currentBranch, targetHash)
	if err != nil {
		return err
	}
	targetHash = resolvedHash

	// Verify commit exists
	targetCommit, err := db.GetCommit(targetHash)
	if err != nil {
		return fmt.Errorf("commit not found: %s", targetHash)
	}

	// Get current HEAD
	currentHead, err := db.GetBranchHead(currentBranch)
	if err != nil || currentHead == "" {
		currentHead, _ = refs.GetHead(currentBranch)
	}

	// Update HEAD and refs
	oldHead := currentHead
	if err := db.SetBranchHead(currentBranch, targetHash); err != nil {
		return fmt.Errorf("failed to update branch head: %w", err)
	}
	if err := refs.SetHead(currentBranch, targetHash); err != nil {
		// Rollback database change
		_ = db.SetBranchHead(currentBranch, oldHead)
		return fmt.Errorf("failed to set ref head: %w", err)
	}

	// Add reflog entry
	if err := db.AddReflogEntry(targetHash, currentBranch, "branch", oldHead, targetHash, "update"); err != nil {
		// Log warning but continue
		fmt.Fprintf(os.Stderr, "Warning: failed to add reflog entry: %v\n", err)
	}

	// Handle different modes
	if mode == "soft" {
		// Only update HEAD, keep index and working directory unchanged
		hashShort := targetHash
		if len(hashShort) > 8 {
			hashShort = hashShort[:8]
		}
		fmt.Printf("HEAD is now at %s %s\n", hashShort, targetCommit.Message)
		return nil
	}

	// For mixed and hard, clear index
	index, err := core.NewIndex(repoPath)
	if err != nil {
		return fmt.Errorf("failed to create index: %w", err)
	}
	if err := index.Clear(); err != nil {
		return fmt.Errorf("failed to clear index: %w", err)
	}

	if mode == "mixed" {
		// Clear index, keep working directory unchanged
		hashShort := targetHash
		if len(hashShort) > 8 {
			hashShort = hashShort[:8]
		}
		fmt.Printf("HEAD is now at %s %s\n", hashShort, targetCommit.Message)
		return nil
	}

	// mode == "hard": update working directory
	// Get tree from target commit
	treeContent, err := storage.GetTreeContent(targetCommit.TreeHash)
	if err != nil {
		return fmt.Errorf("failed to get tree content: %w", err)
	}

	var tree models.Tree
	if err := json.Unmarshal([]byte(treeContent), &tree); err != nil {
		return fmt.Errorf("failed to parse tree: %w", err)
	}

	// Build map of files in target commit
	targetFiles := make(map[string]bool)
	for _, entry := range tree.Entries {
		targetFiles[entry.Name] = true
	}

	// Restore files from target commit
	for _, entry := range tree.Entries {
		if entry.Type == "blob" {
			filePath := filepath.Join(repoPath, entry.Name)
			if err := storage.WriteBlobToFile(entry.Hash, filePath); err != nil {
				return fmt.Errorf("failed to restore file %s: %w", entry.Name, err)
			}
		} else if entry.Type == "tree" {
			// Recursively restore tree
			if err := restoreTreeFromCommit(storage, repoPath, entry.Hash); err != nil {
				return fmt.Errorf("failed to restore tree %s: %w", entry.Name, err)
			}
		}
	}

	// Delete files that are not in target commit but exist in working directory
	// Get all files in working directory
	allFiles, err := utils.ListFiles(repoPath, true)
	if err == nil {
		// Load .dfmignore
		patterns := utils.NewPatterns()
		ignorePath := filepath.Join(repoPath, ".dfmignore")
		if utils.Exists(ignorePath) {
			patterns.LoadFromFile(ignorePath)
		}

		for _, filePath := range allFiles {
			// Skip .DFM directory
			if strings.Contains(filePath, ".DFM") {
				continue
			}

			relPath, err := utils.GetRelativePath(repoPath, filePath)
			if err != nil {
				continue
			}

			// Skip ignored files
			if patterns.Matches(relPath) {
				continue
			}

			// If file is not in target commit, delete it
			if !targetFiles[relPath] {
				if utils.Exists(filePath) {
					if err := utils.RemoveRecursive(filePath); err != nil {
						// Log warning but continue
						fmt.Fprintf(os.Stderr, "Warning: failed to delete file %s: %v\n", relPath, err)
					}
				}
			}
		}
	}

	hashShort := targetHash
	if len(hashShort) > 8 {
		hashShort = hashShort[:8]
	}
	fmt.Printf("HEAD is now at %s %s\n", hashShort, targetCommit.Message)

	return nil
}

// restoreTreeFromCommit recursively restores a tree and its entries
func restoreTreeFromCommit(storage *core.Storage, repoPath string, treeHash string) error {
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
			if err := storage.WriteBlobToFile(entry.Hash, filePath); err != nil {
				return fmt.Errorf("failed to restore file %s: %w", entry.Name, err)
			}
		case "tree":
			// Recursively restore sub-tree
			if err := restoreTreeFromCommit(storage, filepath.Dir(filePath), entry.Hash); err != nil {
				return err
			}
		}
	}

	return nil
}
