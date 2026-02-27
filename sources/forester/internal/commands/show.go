package commands

import (
	"encoding/json"
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/models"
	"github.com/difference-machine/forester/internal/utils"
)

// Show shows commit details
func Show(args []string) error {
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
	currentBranch, err := refs.GetCurrentBranch()
	if err != nil || currentBranch == "" {
		currentBranch = "main"
	}

	// Parse arguments
	showStat := false
	var commitArg string
	var filePath string

	for _, arg := range args {
		if arg == "--stat" {
			showStat = true
		} else if strings.Contains(arg, ":") && !strings.HasPrefix(arg, "--") {
			// Handle <commit>:<file> format
			parts := strings.SplitN(arg, ":", 2)
			if len(parts) == 2 {
				commitArg = parts[0]
				filePath = parts[1]
			} else {
				commitArg = arg
			}
		} else if !strings.HasPrefix(arg, "--") {
			if commitArg == "" {
				commitArg = arg
			} else {
				return fmt.Errorf("unexpected argument: %s", arg)
			}
		} else {
			return fmt.Errorf("unknown flag: %s", arg)
		}
	}

	if commitArg == "" {
		return fmt.Errorf("commit hash required")
	}

	commitHash := commitArg

	// Resolve commit hash (support HEAD, short hashes)
	resolvedHash, err := resolveCommitHash(db, refs, currentBranch, commitHash)
	if err != nil {
		return fmt.Errorf("commit not found: %w", err)
	}
	commitHash = resolvedHash

	// If file path is specified, show file content
	if filePath != "" {
		return showFileFromCommit(repoPath, db, storage, commitHash, filePath)
	}

	// Get commit by full hash
	commit, err := db.GetCommit(commitHash)
	if err != nil {
		return fmt.Errorf("commit not found: %w", err)
	}

	// Format date
	t := time.Unix(commit.Timestamp, 0)
	dateStr := t.Format("2006-01-02 15:04:05")

	// Print commit information
	fmt.Printf("commit %s\n", commit.Hash)
	fmt.Printf("Author: %s\n", commit.Author)
	fmt.Printf("Date:   %s\n", dateStr)
	fmt.Println()
	fmt.Printf("    %s\n", commit.Message)
	fmt.Println()

	if commit.ParentHash != "" {
		fmt.Printf("Parent: %s\n", commit.ParentHash)
	}

	fmt.Printf("Tree:   %s\n", commit.TreeHash)
	fmt.Println("Type:   project")
	fmt.Println()

	// Show changed files
	if commit.TreeHash != "" {
		treeContent, err := storage.GetTreeContent(commit.TreeHash)
		if err == nil {
			var tree models.Tree
			if err := json.Unmarshal([]byte(treeContent), &tree); err == nil {
				if showStat {
					// Show statistics
					added, modified, deleted := getCommitFileChanges(storage, db, commit)
					totalFiles := len(added) + len(modified) + len(deleted)
					if totalFiles > 0 {
						fmt.Println()
						fmt.Printf(" %d file(s) changed", totalFiles)
						if len(added) > 0 {
							fmt.Printf(", %d added", len(added))
						}
						if len(modified) > 0 {
							fmt.Printf(", %d modified", len(modified))
						}
						if len(deleted) > 0 {
							fmt.Printf(", %d deleted", len(deleted))
						}
						fmt.Println()
						fmt.Println()
					}
				} else {
					fmt.Println("Files:")
					for _, entry := range tree.Entries {
						hashShort := entry.Hash
						if len(hashShort) > 8 {
							hashShort = hashShort[:8]
						}
						fmt.Printf("  %s %s %s\n", entry.Type, hashShort, entry.Name)
					}
				}
			}
		}
	}

	return nil
}

// showFileFromCommit shows the content of a file from a specific commit
func showFileFromCommit(repoPath string, db *core.Database, storage *core.Storage, commitHash, filePath string) error {
	// Get commit
	commit, err := db.GetCommit(commitHash)
	if err != nil {
		return fmt.Errorf("commit not found: %w", err)
	}

	// Get tree
	treeContent, err := storage.GetTreeContent(commit.TreeHash)
	if err != nil {
		return fmt.Errorf("failed to get tree content: %w", err)
	}

	var tree models.Tree
	if err := json.Unmarshal([]byte(treeContent), &tree); err != nil {
		return fmt.Errorf("failed to parse tree: %w", err)
	}

	// Build map recursively
	treeMap := make(map[string]*models.TreeEntry)
	if err := core.BuildTreeMapRecursive(storage, &tree, "", treeMap); err != nil {
		return fmt.Errorf("build tree map: %w", err)
	}

	// Normalize file path
	filePath = filepath.ToSlash(filePath)

	// Find file in tree
	entry, found := treeMap[filePath]
	if !found {
		return fmt.Errorf("file '%s' not found in commit", filePath)
	}

	if entry.Type != "blob" {
		return fmt.Errorf("'%s' is not a file", filePath)
	}

	// Get file content
	content, err := storage.GetBlobContent(entry.Hash)
	if err != nil {
		return fmt.Errorf("failed to get file content: %w", err)
	}

	// Print file content
	fmt.Print(string(content))

	return nil
}
