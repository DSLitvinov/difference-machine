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

// Diff shows differences
func Diff(args []string) error {
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

	// Parse arguments
	showUnifiedDiff := false
	colorFlag := "auto" // auto, always, never
	cached := false // --cached or --staged
	showStat := false
	nameOnly := false
	nameStatus := false
	ignoreAllSpace := false
	ignoreSpaceChange := false
	var commitArgs []string

	for _, arg := range args {
		if arg == "--unified" || arg == "-u" {
			showUnifiedDiff = true
		} else if arg == "--color" || arg == "--color=always" {
			colorFlag = "always"
		} else if arg == "--no-color" || arg == "--color=never" {
			colorFlag = "never"
		} else if strings.HasPrefix(arg, "--color=") {
			colorFlag = strings.TrimPrefix(arg, "--color=")
		} else if arg == "--cached" || arg == "--staged" {
			cached = true
		} else if arg == "--stat" {
			showStat = true
		} else if arg == "--name-only" {
			nameOnly = true
		} else if arg == "--name-status" {
			nameStatus = true
		} else if arg == "-w" || arg == "--ignore-all-space" {
			ignoreAllSpace = true
		} else if arg == "-b" || arg == "--ignore-space-change" {
			ignoreSpaceChange = true
		} else if strings.HasPrefix(arg, "-") {
			return fmt.Errorf("unknown flag: %s", arg)
		} else {
			commitArgs = append(commitArgs, arg)
		}
	}
	if cached && len(commitArgs) > 0 {
		return fmt.Errorf("flag --cached cannot be combined with commit arguments")
	}
	if nameOnly && nameStatus {
		return fmt.Errorf("flags --name-only and --name-status are mutually exclusive")
	}
	if showStat && (nameOnly || nameStatus) {
		return fmt.Errorf("flags --stat and --name-only/--name-status are mutually exclusive")
	}
	if len(commitArgs) > 2 {
		return fmt.Errorf("too many commit arguments")
	}

	// Set color output
	if colorFlag == "always" {
		utils.SetColorEnabled(true)
	} else if colorFlag == "never" {
		utils.SetColorEnabled(false)
	}

	var commit1Hash, commit2Hash string
	var filePath string // For diff <commit>:<file> format

	// Check for <commit>:<file> format
	if len(commitArgs) == 1 && strings.Contains(commitArgs[0], ":") {
		parts := strings.SplitN(commitArgs[0], ":", 2)
		commit1Hash = parts[0]
		filePath = parts[1]
		// For <commit>:<file>, we show the file content from commit
		if commit1Hash == "" || filePath == "" {
			return fmt.Errorf("invalid format: use <commit>:<file>")
		}
		// Resolve commit hash
		currentBranch, err := refs.GetCurrentBranch()
		if err != nil || currentBranch == "" {
			currentBranch = "main"
		}
		resolvedHash, err := resolveCommitHash(db, refs, currentBranch, commit1Hash)
		if err != nil {
			return fmt.Errorf("invalid commit: %w", err)
		}
		commit1Hash = resolvedHash
	} else if cached {
		// --cached: compare HEAD with index
		currentBranch, err := refs.GetCurrentBranch()
		if err != nil || currentBranch == "" {
			currentBranch = "main"
		}
		commit1Hash, err = db.GetBranchHead(currentBranch)
		if err != nil || commit1Hash == "" {
			commit1Hash, _ = refs.GetHead(currentBranch)
		}
		// commit2Hash will be empty, meaning we compare with index
	} else if len(commitArgs) >= 2 {
		// Resolve commit hashes
		currentBranch, err := refs.GetCurrentBranch()
		if err != nil || currentBranch == "" {
			currentBranch = "main"
		}
		resolved1, err1 := resolveCommitHash(db, refs, currentBranch, commitArgs[0])
		resolved2, err2 := resolveCommitHash(db, refs, currentBranch, commitArgs[1])
		if err1 != nil {
			return fmt.Errorf("invalid commit1: %w", err1)
		}
		if err2 != nil {
			return fmt.Errorf("invalid commit2: %w", err2)
		}
		commit1Hash = resolved1
		commit2Hash = resolved2
	} else if len(commitArgs) == 1 {
		// Resolve commit hash
		currentBranch, err := refs.GetCurrentBranch()
		if err != nil || currentBranch == "" {
			currentBranch = "main"
		}
		resolved, err := resolveCommitHash(db, refs, currentBranch, commitArgs[0])
		if err != nil {
			return fmt.Errorf("invalid commit: %w", err)
		}
		commit1Hash = resolved
		commit2Hash, err = db.GetBranchHead(currentBranch)
		if err != nil || commit2Hash == "" {
			commit2Hash, _ = refs.GetHead(currentBranch)
		}
	} else {
		// Compare HEAD with working directory
		currentBranch, err := refs.GetCurrentBranch()
		if err != nil || currentBranch == "" {
			currentBranch = "main"
		}
		commit1Hash, err = db.GetBranchHead(currentBranch)
		if err != nil || commit1Hash == "" {
			commit1Hash, _ = refs.GetHead(currentBranch)
		}
	}

	// Get commits
	var commit1, commit2 *models.Commit
	hasCommit1 := false
	hasCommit2 := false

	if commit1Hash != "" {
		c, err := db.GetCommit(commit1Hash)
		if err == nil {
			commit1 = c
			hasCommit1 = true
		}
	}
	if commit2Hash != "" {
		c, err := db.GetCommit(commit2Hash)
		if err == nil {
			commit2 = c
			hasCommit2 = true
		}
	}

	// Get trees
	var tree1, tree2 models.Tree
	if hasCommit1 {
		treeContent, err := storage.GetTreeContent(commit1.TreeHash)
		if err == nil {
			json.Unmarshal([]byte(treeContent), &tree1)
		}
	}
	if cached {
		// Use index as tree2
		index, err := core.NewIndex(repoPath)
		if err == nil {
			indexEntries := index.GetEntries()
			for relPath, hash := range indexEntries {
				if core.IsDeletedHash(hash) {
					continue
				}
				entry := models.NewTreeEntry(hash, relPath, "blob")
				tree2.AddEntry(entry)
			}
		}
	} else if hasCommit2 {
		treeContent, err := storage.GetTreeContent(commit2.TreeHash)
		if err == nil {
			json.Unmarshal([]byte(treeContent), &tree2)
		}
	}

	// Build maps for comparison (recursively)
	tree1Map := make(map[string]*models.TreeEntry)
	if err := core.BuildTreeMapRecursive(storage, &tree1, "", tree1Map); err != nil {
		return fmt.Errorf("build tree map (tree1): %w", err)
	}

	tree2Map := make(map[string]*models.TreeEntry)
	if err := core.BuildTreeMapRecursive(storage, &tree2, "", tree2Map); err != nil {
		return fmt.Errorf("build tree map (tree2): %w", err)
	}

	// Find differences
	var added, modified, deleted []string

	for name, entry2 := range tree2Map {
		entry1, exists := tree1Map[name]
		if !exists {
			added = append(added, name)
		} else if entry1.Hash != entry2.Hash {
			modified = append(modified, name)
		}
	}

	for name := range tree1Map {
		if _, exists := tree2Map[name]; !exists {
			deleted = append(deleted, name)
		}
	}

	// Handle diff <commit>:<file> format
	if filePath != "" {
		commit, err := db.GetCommit(commit1Hash)
		if err != nil {
			return fmt.Errorf("commit not found: %s", commit1Hash)
		}
		treeContent, err := storage.GetTreeContent(commit.TreeHash)
		if err != nil {
			return fmt.Errorf("failed to get tree: %w", err)
		}
		var tree models.Tree
		if err := json.Unmarshal([]byte(treeContent), &tree); err != nil {
			return fmt.Errorf("failed to parse tree: %w", err)
		}
		// Build tree map recursively
		treeMap := make(map[string]*models.TreeEntry)
		if err := core.BuildTreeMapRecursive(storage, &tree, "", treeMap); err != nil {
			return fmt.Errorf("build tree map: %w", err)
		}
		
		// Normalize file path
		filePath = filepath.ToSlash(filePath)
		entry, found := treeMap[filePath]
		if !found {
			return fmt.Errorf("file '%s' not found in commit", filePath)
		}
		if entry.Type != "blob" {
			return fmt.Errorf("'%s' is not a file", filePath)
		}
		content, err := storage.GetBlobContentString(entry.Hash)
		if err != nil {
			return fmt.Errorf("failed to get file content: %w", err)
		}
		fmt.Print(content)
		return nil
	}

	// Print differences
	if len(added) == 0 && len(modified) == 0 && len(deleted) == 0 {
		fmt.Println("No differences found")
		return nil
	}

	// --name-only: only file names
	if nameOnly {
		for _, file := range added {
			fmt.Println(file)
		}
		for _, file := range modified {
			fmt.Println(file)
		}
		for _, file := range deleted {
			fmt.Println(file)
		}
		return nil
	}

	// --name-status: file names with status
	if nameStatus {
		for _, file := range added {
			fmt.Printf("A\t%s\n", file)
		}
		for _, file := range modified {
			fmt.Printf("M\t%s\n", file)
		}
		for _, file := range deleted {
			fmt.Printf("D\t%s\n", file)
		}
		return nil
	}

	// --stat: statistics
	if showStat {
		totalFiles := len(added) + len(modified) + len(deleted)
		totalAdditions := 0
		totalDeletions := 0
		
		// Calculate additions and deletions for modified files
		for _, file := range modified {
			entry1 := tree1Map[file]
			entry2 := tree2Map[file]
			content1, err1 := storage.GetBlobContentString(entry1.Hash)
			content2, err2 := storage.GetBlobContentString(entry2.Hash)
			if err1 == nil && err2 == nil {
				if utils.IsTextFile([]byte(content1)) && utils.IsTextFile([]byte(content2)) {
					// Normalize spaces if needed
					if ignoreAllSpace {
						content1 = normalizeSpaces(content1)
						content2 = normalizeSpaces(content2)
					} else if ignoreSpaceChange {
						content1 = normalizeSpaceChanges(content1)
						content2 = normalizeSpaceChanges(content2)
					}
					diffLines := utils.ComputeDiff(content1, content2)
					for _, line := range diffLines {
						if line.Type == utils.DiffLineAdded {
							totalAdditions++
						} else if line.Type == utils.DiffLineRemoved {
							totalDeletions++
						}
					}
				}
			}
		}
		
		// Count additions for new files
		for _, file := range added {
			entry2 := tree2Map[file]
			content2, err := storage.GetBlobContentString(entry2.Hash)
			if err == nil && utils.IsTextFile([]byte(content2)) {
				lines := utils.SplitLines(content2)
				totalAdditions += len(lines)
			}
		}
		
		// Count deletions for deleted files
		for _, file := range deleted {
			entry1 := tree1Map[file]
			content1, err := storage.GetBlobContentString(entry1.Hash)
			if err == nil && utils.IsTextFile([]byte(content1)) {
				lines := utils.SplitLines(content1)
				totalDeletions += len(lines)
			}
		}
		
		// Print statistics
		for _, file := range added {
			entry2 := tree2Map[file]
			content2, err := storage.GetBlobContentString(entry2.Hash)
			additions := 0
			if err == nil && utils.IsTextFile([]byte(content2)) {
				lines := utils.SplitLines(content2)
				additions = len(lines)
			}
			fmt.Printf(" %s | %d +\n", file, additions)
		}
		for _, file := range modified {
			entry1 := tree1Map[file]
			entry2 := tree2Map[file]
			content1, err1 := storage.GetBlobContentString(entry1.Hash)
			content2, err2 := storage.GetBlobContentString(entry2.Hash)
			additions := 0
			deletions := 0
			if err1 == nil && err2 == nil {
				if utils.IsTextFile([]byte(content1)) && utils.IsTextFile([]byte(content2)) {
					// Normalize spaces if needed
					if ignoreAllSpace {
						content1 = normalizeSpaces(content1)
						content2 = normalizeSpaces(content2)
					} else if ignoreSpaceChange {
						content1 = normalizeSpaceChanges(content1)
						content2 = normalizeSpaceChanges(content2)
					}
					diffLines := utils.ComputeDiff(content1, content2)
					for _, line := range diffLines {
						if line.Type == utils.DiffLineAdded {
							additions++
						} else if line.Type == utils.DiffLineRemoved {
							deletions++
						}
					}
				}
			}
			fmt.Printf(" %s | %d +%d -\n", file, additions, deletions)
		}
		for _, file := range deleted {
			entry1 := tree1Map[file]
			content1, err := storage.GetBlobContentString(entry1.Hash)
			deletions := 0
			if err == nil && utils.IsTextFile([]byte(content1)) {
				lines := utils.SplitLines(content1)
				deletions = len(lines)
			}
			fmt.Printf(" %s | %d -\n", file, deletions)
		}
		fmt.Printf(" %d file(s) changed, %d insertion(s)(+), %d deletion(s)(-)\n", 
			totalFiles, totalAdditions, totalDeletions)
		return nil
	}

	// Regular output
	if len(added) > 0 {
		fmt.Println(utils.Green("Added files:"))
		for _, file := range added {
			fmt.Printf("  %s %s\n", utils.Green("+"), file)
		}
	}

	if len(deleted) > 0 {
		fmt.Println(utils.Red("Deleted files:"))
		for _, file := range deleted {
			fmt.Printf("  %s %s\n", utils.Red("-"), file)
		}
	}

	if len(modified) > 0 {
		fmt.Println(utils.Yellow("Modified files:"))
		for _, file := range modified {
			fmt.Printf("  %s %s\n", utils.Yellow("M"), file)
			if showUnifiedDiff {
				// Show unified diff
				entry1 := tree1Map[file]
				entry2 := tree2Map[file]

				// Get file contents
				content1, err1 := storage.GetBlobContentString(entry1.Hash)
				content2, err2 := storage.GetBlobContentString(entry2.Hash)

				if err1 == nil && err2 == nil {
					// Check if it's a text file
					if utils.IsTextFile([]byte(content1)) && utils.IsTextFile([]byte(content2)) {
						// Normalize spaces if needed
						if ignoreAllSpace {
							content1 = normalizeSpaces(content1)
							content2 = normalizeSpaces(content2)
						} else if ignoreSpaceChange {
							content1 = normalizeSpaceChanges(content1)
							content2 = normalizeSpaceChanges(content2)
						}
						diffLines := utils.ComputeDiff(content1, content2)
						diffStr := utils.FormatUnifiedDiffColored(file, file, diffLines)
						fmt.Println(diffStr)
					} else {
						// Binary file - just show hash change
						hash1Short := entry1.Hash
						hash2Short := entry2.Hash
						if len(hash1Short) > 8 {
							hash1Short = hash1Short[:8]
						}
						if len(hash2Short) > 8 {
							hash2Short = hash2Short[:8]
						}
						fmt.Printf("    Binary file changed: %s -> %s\n", hash1Short, hash2Short)
					}
				}
			}
		}
	}

	return nil
}

// normalizeSpaces removes all whitespace characters
func normalizeSpaces(content string) string {
	var result strings.Builder
	for _, char := range content {
		if char != ' ' && char != '\t' && char != '\n' && char != '\r' {
			result.WriteRune(char)
		}
	}
	return result.String()
}

// normalizeSpaceChanges normalizes whitespace changes (tabs to spaces, multiple spaces to one)
func normalizeSpaceChanges(content string) string {
	var result strings.Builder
	prevSpace := false
	for _, char := range content {
		if char == ' ' || char == '\t' {
			if !prevSpace {
				result.WriteRune(' ')
				prevSpace = true
			}
		} else {
			result.WriteRune(char)
			prevSpace = false
		}
	}
	return result.String()
}

