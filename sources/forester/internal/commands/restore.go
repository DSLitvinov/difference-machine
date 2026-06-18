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

// Restore restores files from index or commit
// Usage:
//   restore <file>                    - Restore file from index (discard working directory changes)
//   restore --staged <file>            - Remove file from index (unstage)
//   restore --source=<commit> <file>   - Restore file from commit
func Restore(args []string) error {
	if len(args) == 0 {
		return fmt.Errorf("usage: restore [--staged] [--source=<commit>] <file>")
	}

	repoPath, err := utils.FindRepositoryRoot(".")
	if err != nil {
		return fmt.Errorf("not a Forester repository")
	}

	repo, err := core.OpenRepository(repoPath)
	if err != nil {
		return fmt.Errorf("failed to open repository: %w", err)
	}
	defer repo.Close()

	storage := repo.Storage
	refs := repo.Refs

	// Parse arguments
	staged := false
	var sourceCommit string
	var files []string
	sourceSet := false

	for _, arg := range args {
		if arg == "--staged" {
			staged = true
		} else if strings.HasPrefix(arg, "--source=") {
			if sourceSet {
				return fmt.Errorf("multiple --source values provided")
			}
			sourceCommit = strings.TrimPrefix(arg, "--source=")
			if sourceCommit == "" {
				return fmt.Errorf("flag --source requires a value")
			}
			sourceSet = true
		} else if !strings.HasPrefix(arg, "--") {
			files = append(files, arg)
		} else {
			return fmt.Errorf("unknown flag: %s", arg)
		}
	}
	if staged && sourceCommit != "" {
		return fmt.Errorf("flags --staged and --source are mutually exclusive")
	}

	if len(files) == 0 {
		return fmt.Errorf("no files specified")
	}

	index, err := core.NewIndex(repoPath)
	if err != nil {
		return fmt.Errorf("failed to create index: %w", err)
	}

	// Get current branch for resolving HEAD
	currentBranch, err := refs.GetCurrentBranch()
	if err != nil || currentBranch == "" {
		currentBranch = "main"
	}

	// If restoring from commit, resolve commit hash
	if sourceCommit != "" {
		resolvedHash, err := resolveCommitHash(repo, currentBranch, sourceCommit)
		if err != nil {
			return fmt.Errorf("invalid commit: %w", err)
		}
		sourceCommit = resolvedHash

		// Get commit
		commit, err := repo.GetCommit(sourceCommit)
		if err != nil {
			return fmt.Errorf("commit not found: %s", sourceCommit)
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

		// Build map of files in tree (recursively)
		treeMap := make(map[string]*models.TreeEntry)
		buildTreeMapRecursive(storage, &tree, "", treeMap)

		// Restore each file
		for _, fileArg := range files {
			// Resolve path
			var absPath string
			if filepath.IsAbs(fileArg) {
				absPath = fileArg
			} else {
				absPath = filepath.Join(repoPath, fileArg)
			}

			relPath, err := utils.GetRelativePath(repoPath, absPath)
			if err != nil {
				relPath = fileArg
			}

			// Normalize path separators
			relPath = filepath.ToSlash(relPath)

			// Find file in tree
			entry, found := treeMap[relPath]
			if !found {
				return fmt.Errorf("file '%s' not found in commit %s", fileArg, sourceCommit[:8])
			}

			if entry.Type != "blob" {
				return fmt.Errorf("'%s' is not a file in commit", fileArg)
			}

			// Ensure directory exists
			if err := utils.EnsureDirectory(filepath.Dir(absPath)); err != nil {
				return fmt.Errorf("failed to create directory: %w", err)
			}

			// Restore file from commit
			if err := storage.WriteBlobToFile(entry.Hash, absPath); err != nil {
				return fmt.Errorf("failed to restore file %s: %w", fileArg, err)
			}

			// Add to index
			hash, err := core.HashFile(absPath)
			if err != nil {
				return fmt.Errorf("failed to hash file: %w", err)
			}
			if _, err := storage.StoreBlobFromFile(absPath); err != nil {
				return fmt.Errorf("failed to store blob: %w", err)
			}
			if err := index.Add(absPath, hash); err != nil {
				return fmt.Errorf("failed to add to index: %w", err)
			}

			fmt.Printf("Restored '%s' from commit %s\n", fileArg, sourceCommit[:8])
		}

		return nil
	}

	// Restore from index or unstage
	for _, fileArg := range files {
		// Resolve path
		var absPath string
		if filepath.IsAbs(fileArg) {
			absPath = fileArg
		} else {
			absPath = filepath.Join(repoPath, fileArg)
		}

		relPath, err := utils.GetRelativePath(repoPath, absPath)
		if err != nil {
			relPath = fileArg
		}

		if staged {
			// Remove from index
			if !index.HasFile(absPath) && !index.HasFile(relPath) {
				return fmt.Errorf("file '%s' is not in index", fileArg)
			}

			if err := index.Remove(absPath); err != nil {
				if err2 := index.Remove(relPath); err2 != nil {
					return fmt.Errorf("failed to remove '%s' from index: %w", fileArg, err)
				}
			}

			fmt.Printf("Unstaged '%s'\n", fileArg)
		} else {
			// Restore from index (discard working directory changes)
			hash, exists := index.GetHash(absPath)
			if !exists {
				hash, exists = index.GetHash(relPath)
				if !exists {
					return fmt.Errorf("file '%s' is not in index", fileArg)
				}
			}

			// Ensure directory exists
			if err := utils.EnsureDirectory(filepath.Dir(absPath)); err != nil {
				return fmt.Errorf("failed to create directory: %w", err)
			}

			// Restore file from index
			if err := storage.WriteBlobToFile(hash, absPath); err != nil {
				return fmt.Errorf("failed to restore file %s: %w", fileArg, err)
			}

			fmt.Printf("Restored '%s' from index\n", fileArg)
		}
	}

	return nil
}

// buildTreeMapRecursive recursively builds a map of all files in a tree
func buildTreeMapRecursive(storage *core.Storage, tree *models.Tree, prefix string, treeMap map[string]*models.TreeEntry) {
	for _, entry := range tree.Entries {
		path := entry.Name
		if prefix != "" {
			path = filepath.Join(prefix, entry.Name)
		}
		// Normalize path separators
		path = filepath.ToSlash(path)

		if entry.Type == "blob" {
			treeMap[path] = entry
		} else if entry.Type == "tree" {
			// Recursively load and process sub-tree
			subTreeContent, err := storage.GetTreeContent(entry.Hash)
			if err != nil {
				continue // Skip if we can't load sub-tree
			}
			var subTree models.Tree
			if err := json.Unmarshal([]byte(subTreeContent), &subTree); err != nil {
				continue // Skip if we can't parse sub-tree
			}
			buildTreeMapRecursive(storage, &subTree, path, treeMap)
		}
	}
}
