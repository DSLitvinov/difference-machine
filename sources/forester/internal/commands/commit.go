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

// Commit creates a commit from the staging area (index).
// It stores the commit in object storage,
// updates the branch HEAD, and executes pre/post-commit hooks.
//
// Usage: forester commit "message" [--author "author"] [--tag "tag"] [-a] [--amend] [--no-edit]
func Commit(args []string) error {
	// Parse arguments
	var message string
	var author string
	var tagName string
	noVerify := false
	autoAdd := false
	amend := false
	noEdit := false

	for i := 0; i < len(args); i++ {
		arg := args[i]
		switch arg {
		case "--author":
			if i+1 >= len(args) {
				return fmt.Errorf("flag --author requires a value")
			}
			author = args[i+1]
			i++
		case "--tag":
			if i+1 >= len(args) {
				return fmt.Errorf("flag --tag requires a value")
			}
			tagName = args[i+1]
			i++
		case "--no-verify":
			noVerify = true
		case "-a", "--all":
			autoAdd = true
		case "--amend":
			amend = true
		case "--no-edit":
			noEdit = true
		case "-m", "--message":
			return fmt.Errorf("flag %s is not supported. Use: forester commit \"message\"", arg)
		default:
			if strings.HasPrefix(arg, "-") {
				return fmt.Errorf("unknown flag: %s", arg)
			}
			if message != "" {
				return fmt.Errorf("multiple commit messages provided")
			}
			// First non-flag argument is the message
			message = arg
		}
	}

	if message == "" && !noEdit {
		return fmt.Errorf("commit message required")
	}
	if noEdit && !amend {
		return fmt.Errorf("flag --no-edit requires --amend")
	}
	if noEdit && message != "" {
		return fmt.Errorf("flag --no-edit cannot be combined with a commit message")
	}

	// Validate message length
	if len(message) > core.MaxCommitMessageLength {
		return fmt.Errorf("commit message too long (max %d characters)", core.MaxCommitMessageLength)
	}

	repoPath, err := utils.FindRepositoryRoot(".")
	if err != nil {
		return fmt.Errorf("not a Forester repository")
	}
	if detached, _, err := core.ReadDetachedHead(repoPath); err != nil {
		return fmt.Errorf("failed to read detached HEAD: %w", err)
	} else if detached {
		return fmt.Errorf("cannot commit while HEAD is detached; switch to a branch or create one from the detached commit first")
	}

	repo, err := core.OpenRepository(repoPath)
	if err != nil {
		return fmt.Errorf("failed to open repository: %w", err)
	}
	defer repo.Close()

	storage := repo.Storage
	refs := repo.Refs
	hooks := core.NewHooks(repoPath)

	// Get current branch and HEAD
	currentBranch, err := refs.GetCurrentBranch()
	if err != nil || currentBranch == "" {
		currentBranch = "main"
	}

	// Handle --amend: get current HEAD commit to use its parent
	var currentHeadCommit *models.Commit
	var currentHeadHash string
	currentHeadHash, err = repo.GetBranchHead(currentBranch)
	if err != nil {
		currentHeadHash = ""
	}

	parentHash := currentHeadHash
	if amend {
		if currentHeadHash == "" {
			return fmt.Errorf("cannot amend: no commits yet")
		}
		// Get current HEAD commit for amend
		currentHeadCommit, err = repo.GetCommit(currentHeadHash)
		if err != nil {
			return fmt.Errorf("failed to get current HEAD commit for amend: %w", err)
		}
		// Use parent of current commit as parent for new commit
		parentHash = currentHeadCommit.ParentHash
		// If --no-edit, use message from current commit
		if noEdit {
			message = currentHeadCommit.Message
		}
	}

	// Get author (from arguments or environment variable)
	if author == "" {
		author = core.DefaultAuthor()
	}

	// Execute pre-commit hook
	if !noVerify {
		envVars := []string{
			fmt.Sprintf("FORESTER_REPO_PATH=%s", repoPath),
			fmt.Sprintf("FORESTER_BRANCH=%s", currentBranch),
		}
		success, err := hooks.ExecuteHook(core.HookTypePreCommit, envVars)
		if err != nil || !success {
			return fmt.Errorf("pre-commit hook failed")
		}
	}

	// Get index (staging area)
	index, err := core.NewIndex(repoPath)
	if err != nil {
		return fmt.Errorf("failed to create index: %w", err)
	}

	// Handle -a: automatically add tracked modified files
	if autoAdd {
		// Get HEAD tree to find tracked files
		var headTree models.Tree
		if parentHash != "" {
			headCommit, err := repo.GetCommit(parentHash)
			if err == nil {
				treeContent, err := storage.GetTreeContent(headCommit.TreeHash)
				if err == nil {
					json.Unmarshal([]byte(treeContent), &headTree)
				}
			}
		}

		// Build map of tracked files using recursive traversal
		trackedMap := make(map[string]string)
		if parentHash != "" {
			treeMap := make(map[string]*models.TreeEntry)
			if err := core.BuildTreeMapRecursive(storage, &headTree, "", treeMap); err != nil {
				return fmt.Errorf("build tree map: %w", err)
			}
			for path, entry := range treeMap {
				if entry.Type == "blob" {
					trackedMap[path] = entry.Hash
				}
			}
		}

		// Load .dfmignore
		patterns := utils.NewPatterns()
		ignorePath := filepath.Join(repoPath, ".dfmignore")
		if utils.Exists(ignorePath) {
			patterns.LoadFromFile(ignorePath)
		}

		// Find and add modified tracked files
		allFiles, err := utils.ListFiles(repoPath, true)
		if err == nil {
			for _, filePath := range allFiles {
				// Skip .DFM directory
				if strings.Contains(filePath, ".DFM") {
					continue
				}

				relPath, err := utils.GetRelativePath(repoPath, filePath)
				if err != nil {
					continue
				}
				
				// Normalize path separators to match BuildTreeMapRecursive
				relPath = filepath.ToSlash(relPath)

				// Skip ignored files
				if patterns.Matches(relPath) {
					continue
				}

				// Check if file is tracked
				if trackedHash, isTracked := trackedMap[relPath]; isTracked {
					// Calculate current hash
					currentHash, err := core.HashFile(filePath)
					if err != nil {
						continue
					}

					// If file is modified, add it
					if currentHash != trackedHash {
						// Store blob
						if _, err := storage.StoreBlobFromFile(filePath); err != nil {
							continue
						}
						// Add to index
						index.Add(filePath, currentHash)
					}
				}
			}
		}
	}

	// For --amend, if index is empty, use current HEAD tree
	if amend && index.IsEmpty() {
		if currentHeadCommit != nil {
			// Get tree from current HEAD and add all entries to index
			treeContent, err := storage.GetTreeContent(currentHeadCommit.TreeHash)
			if err == nil {
				var headTree models.Tree
				if json.Unmarshal([]byte(treeContent), &headTree) == nil {
					// Use BuildTreeMapRecursive to handle nested trees
					treeMap := make(map[string]*models.TreeEntry)
					if err := core.BuildTreeMapRecursive(storage, &headTree, "", treeMap); err != nil {
						return fmt.Errorf("build tree map: %w", err)
					}
					// Add all files from HEAD tree to index
					for path, entry := range treeMap {
						if entry.Type == "blob" {
							fullPath := filepath.Join(repoPath, path)
							// Check if file exists in working directory
							if utils.Exists(fullPath) {
								// Use current file hash
								currentHash, err := core.HashFile(fullPath)
								if err == nil {
									if _, err := storage.StoreBlobFromFile(fullPath); err == nil {
										index.Add(fullPath, currentHash)
									}
								}
							} else {
								// File doesn't exist, stage deletion
								_ = index.MarkDeleted(fullPath)
							}
						}
					}
				}
			}
		}
	}

	// Build base tree map from HEAD (tracked files)
	baseMap := make(map[string]string)
	if parentHash != "" {
			headCommit, err := repo.GetCommit(parentHash)
			if err == nil {
				treeContent, err := storage.GetTreeContent(headCommit.TreeHash)
				if err == nil {
					var headTree models.Tree
					if json.Unmarshal([]byte(treeContent), &headTree) == nil {
						treeMap := make(map[string]*models.TreeEntry)
						if err := core.BuildTreeMapRecursive(storage, &headTree, "", treeMap); err != nil {
							return fmt.Errorf("build tree map: %w", err)
						}
						for path, entry := range treeMap {
							if entry.Type == "blob" {
								baseMap[path] = entry.Hash
							}
						}
					}
			}
		}
	}

	// Merge staged entries into base tree
	indexEntries := index.GetEntries()
	finalMap := make(map[string]string)
	for path, hash := range baseMap {
		finalMap[path] = hash
	}
	for relPath, hash := range indexEntries {
		if core.IsDeletedHash(hash) {
			delete(finalMap, filepath.ToSlash(relPath))
			continue
		}
		finalMap[filepath.ToSlash(relPath)] = hash
	}

	// If no changes compared to HEAD, nothing to commit (except amend)
	if len(finalMap) == 0 {
		return fmt.Errorf("nothing to commit. Use 'forester add' to stage files")
	}
	if !amend && len(finalMap) == len(baseMap) {
		noChanges := true
		for path, hash := range finalMap {
			if baseMap[path] != hash {
				noChanges = false
				break
			}
		}
		if noChanges {
			return fmt.Errorf("nothing to commit. Working tree clean")
		}
	}

	// Create tree from merged map
	tree := models.NewTree()
	for relPath, hash := range finalMap {
		entry := models.NewTreeEntry(hash, relPath, "blob")
		tree.AddEntry(entry)
	}

	// Store tree
	treeJSON, err := tree.ToJSON()
	if err != nil {
		return fmt.Errorf("failed to serialize tree: %w", err)
	}

	treeHash, err := storage.StoreTree(treeJSON)
	if err != nil {
		return fmt.Errorf("failed to store tree: %w", err)
	}
	tree.Hash = treeHash

	// Create commit object
	commit := models.NewCommit()
	commit.ParentHash = parentHash
	commit.TreeHash = treeHash
	commit.Author = author
	commit.Message = message
	commit.Type = models.CommitTypeProject

	commitHash, err := core.FinalizeCommit(repo, commit)
	if err != nil {
		return fmt.Errorf("failed to store commit: %w", err)
	}

	// Update branch HEAD
	var oldHead string
	if amend && currentHeadCommit != nil {
		oldHead = currentHeadCommit.Hash
	} else {
		oldHead = parentHash
	}

	if err := repo.SetBranchHead(currentBranch, commitHash, oldHead); err != nil {
		return fmt.Errorf("failed to update branch head: %w", err)
	}

	// Create tag if specified
	if tagName != "" {
		if repo.TagExists(tagName) {
			if err := repo.DeleteTag(tagName); err != nil {
				return fmt.Errorf("failed to delete existing tag: %w", err)
			}
		}

		tag := models.NewTag(tagName, commitHash, author, "")
		if err := repo.CreateTag(tag, false); err != nil {
			return fmt.Errorf("failed to create tag: %w", err)
		}
	}

	// Execute post-commit hook
	if !noVerify {
		envVars := []string{
			fmt.Sprintf("FORESTER_REPO_PATH=%s", repoPath),
			fmt.Sprintf("FORESTER_BRANCH=%s", currentBranch),
			fmt.Sprintf("FORESTER_COMMIT_HASH=%s", commitHash),
		}
		hooks.ExecuteHook(core.HookTypePostCommit, envVars)
	}

	// Clear index after successful commit
	if err := index.Clear(); err != nil {
		// Log warning but don't fail commit
		fmt.Fprintf(os.Stderr, "Warning: failed to clear index: %v\n", err)
	}

	// Print result
	hashShort := commitHash
	if len(hashShort) > 8 {
		hashShort = hashShort[:8]
	}
	if amend {
		fmt.Printf("[%s %s] %s (amended)\n", currentBranch, hashShort, message)
	} else {
		fmt.Printf("[%s %s] %s\n", currentBranch, hashShort, message)
	}

	return nil
}
