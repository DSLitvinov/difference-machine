package commands

import (
	"encoding/json"
	"fmt"
	"path/filepath"
	"strings"

	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/models"
	"github.com/difference-machine/forester/internal/utils"
)

// Status shows repository status
func Status(args []string) error {
	// Parse flags for color and format
	colorFlag := "auto" // auto, always, never
	shortFormat := false
	filteredArgs := make([]string, 0)
	for i := 0; i < len(args); i++ {
		arg := args[i]
		if arg == "--color" || arg == "--color=always" {
			colorFlag = "always"
		} else if arg == "--no-color" || arg == "--color=never" {
			colorFlag = "never"
		} else if strings.HasPrefix(arg, "--color=") {
			colorFlag = strings.TrimPrefix(arg, "--color=")
		} else if arg == "-s" || arg == "--short" {
			shortFormat = true
		} else if strings.HasPrefix(arg, "-") {
			return fmt.Errorf("unknown flag: %s", arg)
		} else {
			filteredArgs = append(filteredArgs, arg)
		}
	}
	if len(filteredArgs) > 0 {
		return fmt.Errorf("unexpected arguments: %s", strings.Join(filteredArgs, " "))
	}

	// Set color output
	if colorFlag == "always" {
		utils.SetColorEnabled(true)
	} else if colorFlag == "never" {
		utils.SetColorEnabled(false)
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

	refs := core.NewRefs(repoPath)
	storage, err := core.NewStorage(repoPath)
	if err != nil {
		return fmt.Errorf("failed to create storage: %w", err)
	}

	// Load .dfmignore
	patterns := utils.NewPatterns()
	ignorePath := filepath.Join(repoPath, ".dfmignore")
	if utils.Exists(ignorePath) {
		if err := patterns.LoadFromFile(ignorePath); err != nil {
			// Ignore error loading ignore file
		}
	}

	// Get current branch (HEAD)
	currentBranch, err := refs.GetCurrentBranch()
	if err != nil || currentBranch == "" {
		currentBranch = "main"
	}

	// Get HEAD from database (primary source), with fallback to refs
	headCommit, err := db.GetBranchHead(currentBranch)
	if err != nil {
		// Try refs as fallback
		headCommit, err = refs.GetHead(currentBranch)
		if err != nil {
			// If both fail, continue with empty headCommit (no commits yet)
			headCommit = ""
		}
	}
	if headCommit == "" {
		// Try refs one more time
		headCommit, _ = refs.GetHead(currentBranch)
	}

	// Get tree of last commit
	var lastTree models.Tree
	if headCommit != "" {
		commit, err := db.GetCommit(headCommit)
		if err != nil {
			// Failed to get commit, continue with empty tree
		} else if commit != nil && commit.TreeHash != "" {
			treeContent, err := storage.GetTreeContent(commit.TreeHash)
			if err != nil {
				// Failed to get tree content, continue with empty tree
			} else if treeContent != "" {
				if err := json.Unmarshal([]byte(treeContent), &lastTree); err != nil {
					// Tree parsing failed, use empty tree
				}
			}
		}
	}
	
	// Tree loaded successfully

	// Get index (staging area)
	index, err := core.NewIndex(repoPath)
	if err != nil {
		return fmt.Errorf("failed to create index: %w", err)
	}

	// Scan working directory
	allFiles, err := utils.ListFiles(repoPath, true)
	if err != nil {
		return fmt.Errorf("failed to list files: %w", err)
	}

	var stagedNewFiles []string      // New files staged for commit
	var stagedModifiedFiles []string  // Modified files staged for commit
	var stagedDeletedFiles []string   // Deleted files staged for commit
	var unstagedModifiedFiles []string // Modified but not staged
	var unstagedDeletedFiles []string  // Deleted but not staged
	var untrackedFiles []string       // Untracked files

	// Create maps
	trackedMap := make(map[string]string) // path -> hash (from HEAD)
	if headCommit != "" && len(lastTree.Entries) > 0 {
		// First, process direct entries (works for flat trees and root-level files)
		for _, entry := range lastTree.Entries {
			if entry.Type == "blob" {
				normalizedPath := filepath.ToSlash(entry.Name)
				trackedMap[normalizedPath] = entry.Hash
			}
		}
		
		// Then, check if tree has nested trees and process them recursively
		hasNestedTrees := false
		for _, entry := range lastTree.Entries {
			if entry.Type == "tree" {
				hasNestedTrees = true
				break
			}
		}
		
		if hasNestedTrees {
			// Use BuildTreeMapRecursive for nested trees
			// This will add files from sub-trees, overwriting any root-level entries with same path
			treeMap := make(map[string]*models.TreeEntry)
			if err := core.BuildTreeMapRecursive(storage, &lastTree, "", treeMap); err != nil {
				return fmt.Errorf("build tree map: %w", err)
			}
			for path, entry := range treeMap {
				if entry.Type == "blob" {
					trackedMap[path] = entry.Hash
				}
			}
		}
	}
	
	// trackedMap populated

	indexMap := index.GetEntries() // path -> hash (staged)
	
	// Normalize indexMap paths for consistent comparison
	normalizedIndexMap := make(map[string]string)
	for relPath, hash := range indexMap {
		normalizedIndexMap[filepath.ToSlash(relPath)] = hash
	}
	stagedDeletedSet := make(map[string]bool)

	// Check staged files (compare index with HEAD)
	for relPath, indexHash := range normalizedIndexMap {
		headHash, existsInHead := trackedMap[relPath]
		if core.IsDeletedHash(indexHash) {
			if existsInHead {
				// Staged deletion - use original path from indexMap for display
				originalPath := relPath
				for orig := range indexMap {
					if filepath.ToSlash(orig) == relPath {
						originalPath = orig
						break
					}
				}
				stagedDeletedFiles = append(stagedDeletedFiles, originalPath)
				stagedDeletedSet[relPath] = true
			}
			continue
		}
		if !existsInHead {
			// New file staged - use original path from indexMap for display
			originalPath := relPath
			for orig, _ := range indexMap {
				if filepath.ToSlash(orig) == relPath {
					originalPath = orig
					break
				}
			}
			stagedNewFiles = append(stagedNewFiles, originalPath)
		} else if headHash != indexHash {
			// Modified file staged - use original path from indexMap for display
			originalPath := relPath
			for orig, _ := range indexMap {
				if filepath.ToSlash(orig) == relPath {
					originalPath = orig
					break
				}
			}
			stagedModifiedFiles = append(stagedModifiedFiles, originalPath)
		}
	}

	// Check for staged deletions (in HEAD but not in index)
	for relPath := range trackedMap {
		if _, existsInIndex := normalizedIndexMap[relPath]; !existsInIndex {
			fullPath := filepath.Join(repoPath, relPath)
			if !utils.Exists(fullPath) {
				// File deleted and not staged
				unstagedDeletedFiles = append(unstagedDeletedFiles, relPath)
			}
		}
	}

	// Check working directory files
	for _, filePath := range allFiles {
		// Skip .DFM and .git directories
		if strings.Contains(filePath, ".DFM") || strings.Contains(filePath, ".git") {
			continue
		}

		// Get relative path
		relPath, err := utils.GetRelativePath(repoPath, filePath)
		if err != nil {
			continue
		}
		
		// Normalize path separators to match BuildTreeMapRecursive
		normalizedPath := filepath.ToSlash(relPath)

		// Skip ignored files
		if patterns.Matches(relPath) {
			continue
		}

		// Calculate hash of current file
		currentHash, err := core.HashFile(filePath)
		if err != nil {
			continue
		}

		indexHash, isStaged := normalizedIndexMap[normalizedPath]
		headHash, isTracked := trackedMap[normalizedPath]

		if !isTracked && !isStaged {
			// Untracked file
			untrackedFiles = append(untrackedFiles, relPath)
		} else if isStaged {
			// File is staged - check if it differs from working directory
			if currentHash != indexHash {
				// File was modified after staging
				unstagedModifiedFiles = append(unstagedModifiedFiles, relPath)
			}
		} else if isTracked {
			// File is tracked but not staged
			if currentHash != headHash {
				// File is modified but not staged
				unstagedModifiedFiles = append(unstagedModifiedFiles, relPath)
			}
			// If file is tracked and unchanged, it doesn't appear in any list (which is correct)
		}
	}

	// Check for staged deletions (files in index but not in working directory)
	for relPath, indexHash := range normalizedIndexMap {
		// Convert back to original path format for file system operations
		originalPath := relPath
		for orig := range indexMap {
			if filepath.ToSlash(orig) == relPath {
				originalPath = orig
				break
			}
		}
		if core.IsDeletedHash(indexHash) {
			if !stagedDeletedSet[relPath] {
				if _, existsInHead := trackedMap[relPath]; existsInHead {
					stagedDeletedFiles = append(stagedDeletedFiles, originalPath)
					stagedDeletedSet[relPath] = true
				}
			}
			continue
		}
		fullPath := filepath.Join(repoPath, originalPath)
		if !utils.Exists(fullPath) {
			// File is staged but deleted from working directory (legacy path)
			if _, existsInHead := trackedMap[relPath]; existsInHead && !stagedDeletedSet[relPath] {
				stagedDeletedFiles = append(stagedDeletedFiles, originalPath)
				stagedDeletedSet[relPath] = true
			}
		}
	}

	hasStaged := len(stagedNewFiles) > 0 || len(stagedModifiedFiles) > 0 || len(stagedDeletedFiles) > 0
	hasUnstaged := len(unstagedModifiedFiles) > 0 || len(unstagedDeletedFiles) > 0
	hasUntracked := len(untrackedFiles) > 0

	if shortFormat {
		// Short format: XY filename
		// X = staged status, Y = unstaged status
		allFiles := make(map[string]string) // file -> status
		
		for _, file := range stagedNewFiles {
			allFiles[file] = "A "
		}
		for _, file := range stagedModifiedFiles {
			allFiles[file] = "M "
		}
		for _, file := range stagedDeletedFiles {
			allFiles[file] = "D "
		}
		for _, file := range unstagedModifiedFiles {
			if status, exists := allFiles[file]; exists {
				allFiles[file] = string(status[0]) + "M"
			} else {
				allFiles[file] = " M"
			}
		}
		for _, file := range unstagedDeletedFiles {
			if status, exists := allFiles[file]; exists {
				allFiles[file] = string(status[0]) + "D"
			} else {
				allFiles[file] = " D"
			}
		}
		for _, file := range untrackedFiles {
			allFiles[file] = "??"
		}
		
		for file, status := range allFiles {
			fmt.Printf("%s %s\n", status, file)
		}
		return nil
	}

	// Print status (long format)
	fmt.Printf("On branch %s\n", utils.Bold(currentBranch))
	if headCommit == "" {
		fmt.Println("\nNo commits yet")
	} else {
		headShort := headCommit
		if len(headShort) > 8 {
			headShort = headShort[:8]
		}
		fmt.Printf("HEAD: %s\n", utils.Cyan(headShort))
	}

	if !hasStaged && !hasUnstaged && !hasUntracked {
		fmt.Println("\n" + utils.Green("Nothing to commit, working tree clean"))
		return nil
	}

	// Changes to be committed (staged)
	if hasStaged {
		fmt.Println("\n" + utils.Green("Changes to be committed:"))
		if len(stagedNewFiles) > 0 {
			for _, file := range stagedNewFiles {
				fmt.Printf("  %s %s\n", utils.Green("A"), file)
			}
		}
		if len(stagedModifiedFiles) > 0 {
			for _, file := range stagedModifiedFiles {
				fmt.Printf("  %s %s\n", utils.Green("M"), file)
			}
		}
		if len(stagedDeletedFiles) > 0 {
			for _, file := range stagedDeletedFiles {
				fmt.Printf("  %s %s\n", utils.Green("D"), file)
			}
		}
	}

	// Changes not staged for commit
	if hasUnstaged {
		fmt.Println("\n" + utils.Yellow("Changes not staged for commit:"))
		if len(unstagedModifiedFiles) > 0 {
			for _, file := range unstagedModifiedFiles {
				fmt.Printf("  %s %s\n", utils.Yellow("M"), file)
			}
		}
		if len(unstagedDeletedFiles) > 0 {
			for _, file := range unstagedDeletedFiles {
				fmt.Printf("  %s %s\n", utils.Yellow("D"), file)
			}
		}
	}

	// Untracked files
	if hasUntracked {
		fmt.Println("\n" + utils.Red("Untracked files:"))
		for _, file := range untrackedFiles {
			fmt.Printf("  %s %s\n", utils.Red("??"), file)
		}
	}

	return nil
}
