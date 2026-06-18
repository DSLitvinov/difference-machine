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

const dfmDir = ".DFM"

// RestoreVersion restores the working directory to exactly match a commit (full overwrite).
// Removes files not in the commit, writes all commit files. Does not touch .DFM.
// Usage: forester restore-version <commit>
func RestoreVersion(args []string) error {
	if len(args) < 1 {
		return fmt.Errorf("usage: forester restore-version <commit>")
	}

	repoPath, err := utils.FindRepositoryRoot(".")
	if err != nil {
		return fmt.Errorf("not a Forester repository")
	}

	commitHash := args[0]
	repo, err := core.OpenRepository(repoPath)
	if err != nil {
		return fmt.Errorf("failed to open repository: %w", err)
	}
	defer repo.Close()

	storage := repo.Storage
	refs := repo.Refs
	currentBranch, err := refs.GetCurrentBranch()
	if err != nil || currentBranch == "" {
		currentBranch = "main"
	}

	resolvedHash, err := resolveCommitHash(repo, currentBranch, commitHash)
	if err != nil {
		return fmt.Errorf("invalid commit: %w", err)
	}
	commitHash = resolvedHash

	commit, err := repo.GetCommit(commitHash)
	if err != nil {
		return fmt.Errorf("commit not found: %s", commitHash[:8])
	}

	treeContent, err := storage.GetTreeContent(commit.TreeHash)
	if err != nil {
		return fmt.Errorf("failed to get tree content: %w", err)
	}

	var tree models.Tree
	if err := json.Unmarshal([]byte(treeContent), &tree); err != nil {
		return fmt.Errorf("failed to parse tree: %w", err)
	}

	treeMap := make(map[string]*models.TreeEntry)
	buildTreeMapRecursive(storage, &tree, "", treeMap)

	// Normalize commit paths to forward slash for comparison
	commitPaths := make(map[string]bool)
	for p := range treeMap {
		commitPaths[filepath.ToSlash(p)] = true
	}

	// 1. Remove files and dirs in working dir that are not in commit (skip .DFM)
	var dirsToRemove []string
	err = filepath.Walk(repoPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(repoPath, path)
		if err != nil {
			return nil
		}
		relSlash := filepath.ToSlash(rel)
		if rel == "." || relSlash == "." {
			return nil
		}
		// Skip .DFM and anything under it
		if rel == dfmDir || strings.HasPrefix(relSlash, dfmDir+"/") {
			return filepath.SkipDir
		}
		if info.IsDir() {
			dirsToRemove = append(dirsToRemove, path)
			return nil
		}
		if !commitPaths[relSlash] {
			if err := os.Remove(path); err != nil {
				return fmt.Errorf("failed to remove %s: %w", rel, err)
			}
		}
		return nil
	})
	if err != nil {
		return err
	}

	// Remove dirs that have no files in commit (reverse order so deepest first)
	for i := len(dirsToRemove) - 1; i >= 0; i-- {
		dirPath := dirsToRemove[i]
		rel, _ := filepath.Rel(repoPath, dirPath)
		relSlash := filepath.ToSlash(rel)
		hasFileInCommit := false
		for p := range commitPaths {
			if p == relSlash || strings.HasPrefix(p, relSlash+"/") {
				hasFileInCommit = true
				break
			}
		}
		if !hasFileInCommit {
			_ = os.Remove(dirPath)
		}
	}

	// 2. Write all commit blobs to working dir
	for relPath, entry := range treeMap {
		if entry.Type != "blob" {
			continue
		}
		absPath := filepath.Join(repoPath, filepath.FromSlash(relPath))
		if err := utils.EnsureDirectory(filepath.Dir(absPath)); err != nil {
			return fmt.Errorf("failed to create directory for %s: %w", relPath, err)
		}
		if err := storage.WriteBlobToFile(entry.Hash, absPath); err != nil {
			return fmt.Errorf("failed to restore %s: %w", relPath, err)
		}
	}

	fmt.Printf("Restored working directory to commit %s\n", commitHash[:8])
	return nil
}
