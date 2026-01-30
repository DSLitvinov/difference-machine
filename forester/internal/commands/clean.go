package commands

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/utils"
)

// Clean removes untracked files from the working directory
// Usage:
//   clean -l              - List untracked files that would be removed
//   clean -f              - Force removal of untracked files
//   clean -d              - Remove untracked directories
//   clean -n              - Dry run (same as -l)
func Clean(args []string) error {
	repoPath, err := utils.FindRepositoryRoot(".")
	if err != nil {
		return fmt.Errorf("not a Forester repository")
	}

	// Parse flags
	list := false
	force := false
	removeDirs := false
	dryRun := false

	for _, arg := range args {
		if arg == "-l" || arg == "--list" {
			list = true
		} else if arg == "-f" || arg == "--force" {
			force = true
		} else if arg == "-d" || arg == "--dirs" {
			removeDirs = true
		} else if arg == "-n" || arg == "--dry-run" {
			dryRun = true
			list = true // Dry run is same as list
		} else if strings.HasPrefix(arg, "-") {
			return fmt.Errorf("unknown flag: %s", arg)
		} else {
			return fmt.Errorf("unexpected argument: %s", arg)
		}
	}
	if dryRun && force {
		return fmt.Errorf("flags --dry-run and --force are mutually exclusive")
	}

	// Get index to know what's tracked
	index, err := core.NewIndex(repoPath)
	if err != nil {
		return fmt.Errorf("failed to create index: %w", err)
	}

	// Get HEAD commit to know what's tracked
	dbPath := filepath.Join(repoPath, ".DFM", "database.db")
	db, err := core.NewDatabase(dbPath)
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}
	defer db.Close()

	refs := core.NewRefs(repoPath)
	currentBranch, err := refs.GetCurrentBranch()
	if err != nil || currentBranch == "" {
		currentBranch = "main"
	}

	// Get HEAD commit
	headCommit, err := db.GetBranchHead(currentBranch)
	if err != nil || headCommit == "" {
		headCommit, _ = refs.GetHead(currentBranch)
	}

	// Build set of tracked files
	trackedFiles := make(map[string]bool)
	indexEntries := index.GetEntries()
	for relPath := range indexEntries {
		trackedFiles[relPath] = true
	}

	// If HEAD exists, add files from HEAD tree
	if headCommit != "" {
		storage, err := core.NewStorage(repoPath)
		if err == nil {
			commit, err := db.GetCommit(headCommit)
			if err == nil {
				treeContent, err := storage.GetTreeContent(commit.TreeHash)
				if err == nil {
					// Parse tree to get all tracked files
					// For simplicity, we'll use a recursive approach
					buildTrackedFilesFromTree(storage, treeContent, "", trackedFiles)
				}
			}
		}
	}

	// Load .dfmignore patterns
	patterns := utils.NewPatterns()
	ignorePath := filepath.Join(repoPath, ".dfmignore")
	if utils.Exists(ignorePath) {
		patterns.LoadFromFile(ignorePath)
	}

	// Scan working directory for untracked files
	allFiles, err := utils.ListFiles(repoPath, true)
	if err != nil {
		return fmt.Errorf("failed to list files: %w", err)
	}

	var untrackedFiles []string
	var untrackedDirs []string

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

		// Check if file is tracked
		if !trackedFiles[relPath] {
			if utils.IsDirectory(filePath) {
				// Check if directory contains only untracked files
				if isDirectoryUntracked(repoPath, relPath, trackedFiles, patterns) {
					untrackedDirs = append(untrackedDirs, relPath)
				}
			} else {
				untrackedFiles = append(untrackedFiles, relPath)
			}
		}
	}

	if len(untrackedFiles) == 0 && len(untrackedDirs) == 0 {
		fmt.Println("No untracked files to remove")
		return nil
	}

	// List mode or dry run
	if list || dryRun {
		if len(untrackedFiles) > 0 {
			fmt.Println("Would remove untracked files:")
			for _, file := range untrackedFiles {
				fmt.Printf("  %s\n", file)
			}
		}
		if len(untrackedDirs) > 0 && removeDirs {
			fmt.Println("Would remove untracked directories:")
			for _, dir := range untrackedDirs {
				fmt.Printf("  %s/\n", dir)
			}
		} else if len(untrackedDirs) > 0 {
			fmt.Println("Untracked directories (use -d to remove):")
			for _, dir := range untrackedDirs {
				fmt.Printf("  %s/\n", dir)
			}
		}
		return nil
	}

	// Force removal
	if !force {
		return fmt.Errorf("use -f to force removal of untracked files")
	}

	// Remove untracked files
	removedCount := 0
	for _, relPath := range untrackedFiles {
		fullPath := filepath.Join(repoPath, relPath)
		if utils.Exists(fullPath) {
			if err := os.Remove(fullPath); err != nil {
				fmt.Fprintf(os.Stderr, "Warning: failed to remove %s: %v\n", relPath, err)
			} else {
				removedCount++
			}
		}
	}

	// Remove untracked directories if requested
	if removeDirs {
		for _, relPath := range untrackedDirs {
			fullPath := filepath.Join(repoPath, relPath)
			if utils.Exists(fullPath) {
				if err := utils.RemoveRecursive(fullPath); err != nil {
					fmt.Fprintf(os.Stderr, "Warning: failed to remove directory %s: %v\n", relPath, err)
				} else {
					removedCount++
				}
			}
		}
	}

	fmt.Printf("Removed %d untracked file(s)\n", removedCount)
	return nil
}

// buildTrackedFilesFromTree recursively builds a set of tracked files from a tree
func buildTrackedFilesFromTree(storage *core.Storage, treeContent string, prefix string, trackedFiles map[string]bool) {
	// This is a simplified version - in a full implementation,
	// we would parse the tree JSON and recursively process sub-trees
	// For now, we'll use the existing buildTreeMapRecursiveForLog function
	// But we need to import it or create a similar function here
	// For simplicity, we'll parse the tree directly
	var tree struct {
		Entries []struct {
			Name string `json:"name"`
			Type string `json:"type"`
			Hash string `json:"hash"`
		} `json:"entries"`
	}

	if err := json.Unmarshal([]byte(treeContent), &tree); err != nil {
		return
	}

	for _, entry := range tree.Entries {
		path := entry.Name
		if prefix != "" {
			path = filepath.Join(prefix, entry.Name)
		}
		path = filepath.ToSlash(path)

		if entry.Type == "blob" {
			trackedFiles[path] = true
		} else if entry.Type == "tree" {
			// Recursively process sub-tree
			subTreeContent, err := storage.GetTreeContent(entry.Hash)
			if err == nil {
				buildTrackedFilesFromTree(storage, subTreeContent, path, trackedFiles)
			}
		}
	}
}

// isDirectoryUntracked checks if a directory contains only untracked files
func isDirectoryUntracked(repoPath, dirPath string, trackedFiles map[string]bool, patterns *utils.Patterns) bool {
	// Check if any file in the directory is tracked
	allFiles, err := utils.ListFiles(filepath.Join(repoPath, dirPath), true)
	if err != nil {
		return false
	}

	for _, filePath := range allFiles {
		relPath, err := utils.GetRelativePath(repoPath, filePath)
		if err != nil {
			continue
		}

		if patterns.Matches(relPath) {
			continue
		}

		if trackedFiles[relPath] {
			return false // Directory contains tracked files
		}
	}

	return true // Directory contains only untracked files
}
