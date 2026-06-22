package core

import (
	"encoding/json"
	"fmt"
	"path/filepath"
	"strings"

	"github.com/difference-machine/forester/internal/models"
	"github.com/difference-machine/forester/internal/utils"
)

// SnapshotWorkingTree stores the current working tree (respecting .dfmignore) and returns its hash.
func SnapshotWorkingTree(repoPath string, storage *Storage) (string, error) {
	patterns := utils.NewPatterns()
	ignorePath := filepath.Join(repoPath, ".dfmignore")
	if utils.Exists(ignorePath) {
		if err := patterns.LoadFromFile(ignorePath); err != nil {
			return "", fmt.Errorf("load ignore file: %w", err)
		}
	}

	tree := models.NewTree()
	allFiles, err := utils.ListFiles(repoPath, true)
	if err != nil {
		return "", fmt.Errorf("list files: %w", err)
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
			return "", fmt.Errorf("store blob %s: %w", relPath, err)
		}
		tree.AddEntry(models.NewTreeEntry(hash, relPath, "blob"))
	}

	treeJSON, err := tree.ToJSON()
	if err != nil {
		return "", fmt.Errorf("serialize tree: %w", err)
	}
	return storage.StoreTree(treeJSON)
}

// RestoreTreeToWorkdir restores a stored tree into the working directory.
func RestoreTreeToWorkdir(storage *Storage, repoPath, treeHash string) error {
	treeContent, err := storage.GetTreeContent(treeHash)
	if err != nil {
		return err
	}
	var tree models.Tree
	if err := json.Unmarshal([]byte(treeContent), &tree); err != nil {
		return fmt.Errorf("parse tree: %w", err)
	}
	return restoreTreeEntries(storage, repoPath, &tree)
}

func restoreTreeEntries(storage *Storage, repoPath string, tree *models.Tree) error {
	for _, entry := range tree.Entries {
		filePath := filepath.Join(repoPath, entry.Name)
		switch entry.Type {
		case "blob":
			if err := utils.EnsureDirectory(filepath.Dir(filePath)); err != nil {
				return err
			}
			if err := storage.WriteBlobToFile(entry.Hash, filePath); err != nil {
				return fmt.Errorf("restore file %s: %w", entry.Name, err)
			}
		case "tree":
			subContent, err := storage.GetTreeContent(entry.Hash)
			if err != nil {
				return err
			}
			var subTree models.Tree
			if err := json.Unmarshal([]byte(subContent), &subTree); err != nil {
				return fmt.Errorf("parse sub-tree %s: %w", entry.Name, err)
			}
			if err := restoreTreeEntries(storage, filepath.Dir(filePath), &subTree); err != nil {
				return err
			}
		}
	}
	return nil
}

// TreeBlobPaths returns all blob paths reachable from a tree hash.
func TreeBlobPaths(storage *Storage, treeHash string) (map[string]bool, error) {
	treeContent, err := storage.GetTreeContent(treeHash)
	if err != nil {
		return nil, err
	}
	var tree models.Tree
	if err := json.Unmarshal([]byte(treeContent), &tree); err != nil {
		return nil, fmt.Errorf("parse tree: %w", err)
	}
	treeMap := make(map[string]*models.TreeEntry)
	if err := BuildTreeMapRecursive(storage, &tree, "", treeMap); err != nil {
		return nil, err
	}
	paths := make(map[string]bool, len(treeMap))
	for path, entry := range treeMap {
		if entry.Type == "blob" {
			paths[path] = true
		}
	}
	return paths, nil
}

// CreateStashFromWorkingTree snapshots the working tree and persists stash metadata.
func CreateStashFromWorkingTree(repo *Repository, message string) (*models.Stash, error) {
	treeHash, err := SnapshotWorkingTree(repo.Path, repo.Storage)
	if err != nil {
		return nil, err
	}
	stash := models.NewStash(message, treeHash)
	stash.Hash = HashStash(stash.Message, stash.TreeHash)
	if _, err := repo.Stash.CreateStash(stash); err != nil {
		return nil, err
	}
	return stash, nil
}
