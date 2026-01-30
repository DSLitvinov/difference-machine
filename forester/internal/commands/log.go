package commands

import (
	"encoding/json"
	"fmt"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/models"
	"github.com/difference-machine/forester/internal/utils"
)

// Log shows commit history
func Log(args []string) error {
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

	// Parse flags
	oneline := false
	graph := false
	showAll := false
	showStat := false
	nameOnly := false
	nameStatus := false
	maxCount := 0
	prettyFormat := ""
	sinceTime := int64(0)
	untilTime := int64(0)
	authorPattern := ""
	grepPattern := ""
	var branchArgs []string

	for i := 0; i < len(args); i++ {
		arg := args[i]
		if arg == "--oneline" {
			oneline = true
			prettyFormat = "oneline"
		} else if arg == "--graph" {
			graph = true
		} else if arg == "--all" {
			showAll = true
		} else if arg == "--stat" {
			showStat = true
		} else if arg == "--name-only" {
			nameOnly = true
		} else if arg == "--name-status" {
			nameStatus = true
		} else if arg == "-n" {
			if i+1 >= len(args) {
				return fmt.Errorf("flag -n requires a value")
			}
			n, err := strconv.Atoi(args[i+1])
			if err != nil || n < 0 {
				return fmt.Errorf("invalid max count: %s", args[i+1])
			}
			maxCount = n
			i++
		} else if strings.HasPrefix(arg, "-n") {
			// Handle -n<number> or -n <number>
			if len(arg) > 2 {
				// -n<number>
				if n, err := strconv.Atoi(arg[2:]); err == nil && n >= 0 {
					maxCount = n
				} else {
					return fmt.Errorf("invalid max count: %s", arg[2:])
				}
			}
		} else if strings.HasPrefix(arg, "--max-count=") {
			if n, err := strconv.Atoi(strings.TrimPrefix(arg, "--max-count=")); err == nil && n >= 0 {
				maxCount = n
			} else {
				return fmt.Errorf("invalid max count: %s", strings.TrimPrefix(arg, "--max-count="))
			}
		} else if arg == "--max-count" {
			return fmt.Errorf("flag --max-count requires =<number>")
		} else if strings.HasPrefix(arg, "--pretty=") {
			prettyFormat = strings.TrimPrefix(arg, "--pretty=")
		} else if arg == "--pretty" {
			return fmt.Errorf("flag --pretty requires =<format>")
		} else if strings.HasPrefix(arg, "--since=") {
			sinceStr := strings.TrimPrefix(arg, "--since=")
			if t, err := parseTime(sinceStr); err == nil {
				sinceTime = t
			} else {
				return err
			}
		} else if strings.HasPrefix(arg, "--until=") {
			untilStr := strings.TrimPrefix(arg, "--until=")
			if t, err := parseTime(untilStr); err == nil {
				untilTime = t
			} else {
				return err
			}
		} else if strings.HasPrefix(arg, "--author=") {
			authorPattern = strings.TrimPrefix(arg, "--author=")
		} else if strings.HasPrefix(arg, "--grep=") {
			grepPattern = strings.TrimPrefix(arg, "--grep=")
		} else if arg == "--since" {
			if i+1 >= len(args) {
				return fmt.Errorf("flag --since requires a value")
			}
			if t, err := parseTime(args[i+1]); err == nil {
				sinceTime = t
			} else {
				return err
			}
			i++
		} else if arg == "--until" {
			if i+1 >= len(args) {
				return fmt.Errorf("flag --until requires a value")
			}
			if t, err := parseTime(args[i+1]); err == nil {
				untilTime = t
			} else {
				return err
			}
			i++
		} else if arg == "--author" {
			if i+1 >= len(args) {
				return fmt.Errorf("flag --author requires a value")
			}
			authorPattern = args[i+1]
			i++
		} else if arg == "--grep" {
			if i+1 >= len(args) {
				return fmt.Errorf("flag --grep requires a value")
			}
			grepPattern = args[i+1]
			i++
		} else if strings.HasPrefix(arg, "-") {
			return fmt.Errorf("unknown flag: %s", arg)
		} else {
			branchArgs = append(branchArgs, arg)
		}
	}
	if showAll && len(branchArgs) > 0 {
		return fmt.Errorf("branch argument is not allowed with --all")
	}
	if len(branchArgs) > 1 {
		return fmt.Errorf("only one branch argument is allowed")
	}
	if nameOnly && nameStatus {
		return fmt.Errorf("flags --name-only and --name-status are mutually exclusive")
	}
	if showStat && (nameOnly || nameStatus) {
		return fmt.Errorf("flags --stat and --name-only/--name-status are mutually exclusive")
	}

	// Determine branch
	branch := "main"
	if len(branchArgs) > 0 {
		branch = branchArgs[0]
	} else if !showAll {
		// If branch not specified and not --all, use current branch
		currentBranch, err := refs.GetCurrentBranch()
		if err == nil && currentBranch != "" {
			branch = currentBranch
		}
	}

	var commits []*models.Commit
	var branchHeads map[string]string // branch -> commit hash

	if showAll {
		// Get commits from all branches
		branches, err := db.ListBranches()
		if err != nil {
			return fmt.Errorf("failed to list branches: %w", err)
		}

		branchHeads = make(map[string]string)
		commitMap := make(map[string]*models.Commit) // hash -> commit

		// Collect all commits from all branches
		for _, b := range branches {
			if b.CommitHash != "" {
				branchHeads[b.Name] = b.CommitHash
				history, err := db.GetCommitHistory(b.Name, 100)
				if err == nil {
					for _, commit := range history {
						if _, exists := commitMap[commit.Hash]; !exists {
							commitMap[commit.Hash] = commit
						}
					}
				}
			}
		}

		// Convert map to slice and sort by timestamp (newest first)
		commits = make([]*models.Commit, 0, len(commitMap))
		for _, commit := range commitMap {
			commits = append(commits, commit)
		}
		sort.Slice(commits, func(i, j int) bool {
			return commits[i].Timestamp > commits[j].Timestamp
		})
	} else {
		// Get commit history for single branch
		commits, err = db.GetCommitHistory(branch, 100)
		if err != nil {
			return fmt.Errorf("failed to get commit history: %w", err)
		}

		// Get HEAD commit for this branch
		headCommit, err := db.GetBranchHead(branch)
		if err != nil {
			headCommit, _ = refs.GetHead(branch)
		}
		branchHeads = map[string]string{branch: headCommit}
	}

	if len(commits) == 0 {
		fmt.Println("No commits yet")
		return nil
	}

	// Filter commits by date, author, and grep
	filteredCommits := make([]*models.Commit, 0)
	for _, commit := range commits {
		// Filter by since
		if sinceTime > 0 && commit.Timestamp < sinceTime {
			continue
		}
		// Filter by until
		if untilTime > 0 && commit.Timestamp > untilTime {
			continue
		}
		// Filter by author
		if authorPattern != "" && !strings.Contains(strings.ToLower(commit.Author), strings.ToLower(authorPattern)) {
			continue
		}
		// Filter by grep
		if grepPattern != "" && !strings.Contains(strings.ToLower(commit.Message), strings.ToLower(grepPattern)) {
			continue
		}
		filteredCommits = append(filteredCommits, commit)
	}
	commits = filteredCommits

	if len(commits) == 0 {
		fmt.Println("No commits found matching criteria")
		return nil
	}

	// Build commit graph for --graph
	var graphData map[string][]string // commit -> branches pointing to it
	if graph || showAll {
		graphData = make(map[string][]string)
		for branchName, headHash := range branchHeads {
			if headHash != "" {
				graphData[headHash] = append(graphData[headHash], branchName)
			}
		}
	}

	// Limit commits if maxCount is set
	if maxCount > 0 && len(commits) > maxCount {
		commits = commits[:maxCount]
	}

	// Print history
	for i, commit := range commits {
		hashShort := commit.Hash
		if len(hashShort) > 8 {
			hashShort = hashShort[:8]
		}

		// Get file changes if needed
		var added, modified, deleted []string
		if showStat || nameOnly || nameStatus {
			if commit.ParentHash != "" {
				added, modified, deleted = getCommitFileChanges(storage, db, commit)
			} else {
				// Initial commit: all files are added
				if commit.TreeHash != "" {
					treeContent, err := storage.GetTreeContent(commit.TreeHash)
					if err == nil {
						var tree models.Tree
						if err := json.Unmarshal([]byte(treeContent), &tree); err == nil {
							for _, entry := range tree.Entries {
								if entry.Type == "blob" {
									added = append(added, entry.Name)
								}
							}
						}
					}
				}
			}
		}

		// Apply pretty format if specified
		if prettyFormat != "" && prettyFormat != "oneline" {
			output := formatCommitPretty(commit, prettyFormat, hashShort)
			fmt.Print(output)
			continue
		}

		if oneline || prettyFormat == "oneline" {
			// One-line format
			prefix := ""
			if graph || showAll {
				// Build graph prefix
				branches := graphData[commit.Hash]
				if len(branches) > 0 {
					prefix = "* " + strings.Join(branches, ", ") + " "
				} else {
					prefix = "* "
				}
			}
			fmt.Printf("%s%s %s\n", prefix, hashShort, commit.Message)
		} else {
			// Full format
			// Format date
			t := time.Unix(commit.Timestamp, 0)
			dateStr := t.Format("2006-01-02 15:04:05")

			// Graph prefix
			graphPrefix := ""
			if graph || showAll {
				branches := graphData[commit.Hash]
				if len(branches) > 0 {
					graphPrefix = "* " + strings.Join(branches, ", ") + " "
				} else {
					graphPrefix = "* "
				}
			}

			fmt.Printf("%scommit %s\n", graphPrefix, commit.Hash)

			// Mark HEAD commits
			if showAll {
				branches := graphData[commit.Hash]
				if len(branches) > 0 {
					fmt.Printf("HEAD: %s\n", strings.Join(branches, ", "))
				}
			} else if i == 0 {
				fmt.Println("HEAD: true")
			}

			fmt.Printf("Author: %s\n", commit.Author)
			fmt.Printf("Date:   %s\n", dateStr)

			// Get tag for this commit
			tag, err := db.GetTagByCommitHash(commit.Hash)
			if err == nil && tag != "" {
				fmt.Printf("Tag:    %s\n", tag)
			} else {
				fmt.Println("Tag:")
			}
			fmt.Println()
			fmt.Printf("    %s\n", commit.Message)
			fmt.Println()

			// Show file changes
			if showStat {
				// Show statistics
				totalFiles := len(added) + len(modified) + len(deleted)
				if totalFiles > 0 {
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
				}
			} else if nameOnly {
				// Show only file names
				allFiles := make([]string, 0)
				allFiles = append(allFiles, added...)
				allFiles = append(allFiles, modified...)
				allFiles = append(allFiles, deleted...)
				sort.Strings(allFiles)
				for _, file := range allFiles {
					fmt.Printf("    %s\n", file)
				}
			} else if nameStatus {
				// Show file names with status
				allFiles := make(map[string]string) // file -> status
				for _, file := range added {
					allFiles[file] = "A"
				}
				for _, file := range modified {
					allFiles[file] = "M"
				}
				for _, file := range deleted {
					allFiles[file] = "D"
				}
				// Sort by filename
				var sortedFiles []string
				for file := range allFiles {
					sortedFiles = append(sortedFiles, file)
				}
				sort.Strings(sortedFiles)
				for _, file := range sortedFiles {
					fmt.Printf("    %s\t%s\n", allFiles[file], file)
				}
			}
		}
	}

	return nil
}

// parseTime parses time string in various formats
func parseTime(timeStr string) (int64, error) {
	// Try parsing as Unix timestamp
	if timestamp, err := strconv.ParseInt(timeStr, 10, 64); err == nil {
		return timestamp, nil
	}

	// Try parsing as relative time (e.g., "2 days ago", "1 week ago")
	if strings.Contains(timeStr, "ago") {
		// Simple relative time parsing
		timeStr = strings.TrimSpace(strings.ToLower(timeStr))
		now := time.Now().Unix()

		if strings.Contains(timeStr, "day") {
			var days int
			n, err := fmt.Sscanf(timeStr, "%d day", &days)
			if err != nil || n != 1 {
				return 0, fmt.Errorf("unable to parse time: %s", timeStr)
			}
			return now - int64(days*24*3600), nil
		} else if strings.Contains(timeStr, "week") {
			var weeks int
			n, err := fmt.Sscanf(timeStr, "%d week", &weeks)
			if err != nil || n != 1 {
				return 0, fmt.Errorf("unable to parse time: %s", timeStr)
			}
			return now - int64(weeks*7*24*3600), nil
		} else if strings.Contains(timeStr, "month") {
			var months int
			n, err := fmt.Sscanf(timeStr, "%d month", &months)
			if err != nil || n != 1 {
				return 0, fmt.Errorf("unable to parse time: %s", timeStr)
			}
			return now - int64(months*30*24*3600), nil
		} else if strings.Contains(timeStr, "year") {
			var years int
			n, err := fmt.Sscanf(timeStr, "%d year", &years)
			if err != nil || n != 1 {
				return 0, fmt.Errorf("unable to parse time: %s", timeStr)
			}
			return now - int64(years*365*24*3600), nil
		}
	}

	// Try parsing as RFC3339 or common date formats
	formats := []string{
		time.RFC3339,
		"2006-01-02",
		"2006-01-02 15:04:05",
		"2006-01-02T15:04:05",
	}

	for _, format := range formats {
		if t, err := time.Parse(format, timeStr); err == nil {
			return t.Unix(), nil
		}
	}

	return 0, fmt.Errorf("unable to parse time: %s", timeStr)
}

// formatCommitPretty formats commit according to pretty format
func formatCommitPretty(commit *models.Commit, format, hashShort string) string {
	t := time.Unix(commit.Timestamp, 0)
	dateStr := t.Format("2006-01-02 15:04:05")

	switch format {
	case "short":
		return fmt.Sprintf("commit %s\nAuthor: %s\nDate:   %s\n\n    %s\n\n",
			hashShort, commit.Author, dateStr, commit.Message)
	case "medium":
		return fmt.Sprintf("commit %s\nAuthor: %s\nDate:   %s\n\n    %s\n\n",
			commit.Hash, commit.Author, dateStr, commit.Message)
	case "full":
		return fmt.Sprintf("commit %s\nAuthor: %s\nDate:   %s\n\n    %s\n\n",
			commit.Hash, commit.Author, dateStr, commit.Message)
	case "fuller":
		return fmt.Sprintf("commit %s\nAuthor:     %s\nAuthorDate: %s\n\n    %s\n\n",
			commit.Hash, commit.Author, dateStr, commit.Message)
	case "format:":
		// Custom format - basic support
		return fmt.Sprintf("%s %s %s\n", hashShort, commit.Author, commit.Message)
	default:
		// Default to medium
		return fmt.Sprintf("commit %s\nAuthor: %s\nDate:   %s\n\n    %s\n\n",
			commit.Hash, commit.Author, dateStr, commit.Message)
	}
}

// getCommitFileChanges returns the list of added, modified, and deleted files in a commit
func getCommitFileChanges(storage *core.Storage, db *core.Database, commit *models.Commit) (added, modified, deleted []string) {
	if commit.ParentHash == "" {
		return
	}

	// Get parent commit
	parentCommit, err := db.GetCommit(commit.ParentHash)
	if err != nil {
		return
	}

	// Get trees
	commitTreeContent, err := storage.GetTreeContent(commit.TreeHash)
	if err != nil {
		return
	}

	parentTreeContent, err := storage.GetTreeContent(parentCommit.TreeHash)
	if err != nil {
		return
	}

	var commitTree, parentTree models.Tree
	if err := json.Unmarshal([]byte(commitTreeContent), &commitTree); err != nil {
		return
	}
	if err := json.Unmarshal([]byte(parentTreeContent), &parentTree); err != nil {
		return
	}

	// Build maps (recursively)
	commitTreeMap := make(map[string]*models.TreeEntry)
	core.BuildTreeMapRecursive(storage, &commitTree, "", commitTreeMap)

	parentTreeMap := make(map[string]*models.TreeEntry)
	core.BuildTreeMapRecursive(storage, &parentTree, "", parentTreeMap)

	// Find differences
	for name, entry := range commitTreeMap {
		if entry.Type == "blob" {
			parentEntry, exists := parentTreeMap[name]
			if !exists {
				added = append(added, name)
			} else if parentEntry.Hash != entry.Hash {
				modified = append(modified, name)
			}
		}
	}

	for name, entry := range parentTreeMap {
		if entry.Type == "blob" {
			if _, exists := commitTreeMap[name]; !exists {
				deleted = append(deleted, name)
			}
		}
	}

	return
}
