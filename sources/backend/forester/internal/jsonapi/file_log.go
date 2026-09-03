package jsonapi

import (
	"encoding/json"
	"fmt"

	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/models"
)

func blobHashAtPath(storage *core.Storage, treeHash, relPath string) (hash string, exists bool, err error) {
	if treeHash == "" {
		return "", false, nil
	}
	treeContent, err := storage.GetTreeContent(treeHash)
	if err != nil {
		return "", false, err
	}
	var tree models.Tree
	if err := json.Unmarshal([]byte(treeContent), &tree); err != nil {
		return "", false, fmt.Errorf("parse tree: %w", err)
	}
	treeMap := make(map[string]*models.TreeEntry)
	if err := core.BuildTreeMapRecursive(storage, &tree, "", treeMap); err != nil {
		return "", false, err
	}
	relPath = canonicalRelPath(relPath)
	entry, ok := treeMap[relPath]
	if !ok || entry.Type != "blob" {
		return "", false, nil
	}
	return entry.Hash, true, nil
}

func fileChangedInCommit(repo *core.Repository, commit *models.Commit, relPath string) (bool, error) {
	storage := repo.Storage
	commitHash, hasCommit, err := blobHashAtPath(storage, commit.TreeHash, relPath)
	if err != nil {
		return false, err
	}

	parentHash := firstParentHash(commit)
	if parentHash == "" {
		return hasCommit, nil
	}

	parentCommit, err := repo.GetCommit(parentHash)
	if err != nil {
		return hasCommit, nil
	}

	parentBlobHash, hasParent, err := blobHashAtPath(storage, parentCommit.TreeHash, relPath)
	if err != nil {
		return false, err
	}

	if hasCommit != hasParent {
		return true, nil
	}
	if !hasCommit {
		return false, nil
	}
	return commitHash != parentBlobHash, nil
}

func firstParentHash(commit *models.Commit) string {
	if len(commit.ParentHashes) > 0 && commit.ParentHashes[0] != "" {
		return commit.ParentHashes[0]
	}
	return commit.ParentHash
}

func filterCommitsByFile(repo *core.Repository, branch string, relPath string, limit int) ([]*models.Commit, error) {
	all, err := repo.GetCommitHistory(branch, limit*3)
	if err != nil {
		return nil, err
	}
	if relPath == "" {
		if len(all) > limit {
			return all[:limit], nil
		}
		return all, nil
	}

	filtered := make([]*models.Commit, 0, limit)
	for _, commit := range all {
		changed, err := fileChangedInCommit(repo, commit, relPath)
		if err != nil {
			return nil, err
		}
		if changed {
			filtered = append(filtered, commit)
			if len(filtered) >= limit {
				break
			}
		}
	}
	return filtered, nil
}

func commitToMap(c *models.Commit) map[string]interface{} {
	return map[string]interface{}{
		"hash":            c.Hash,
		"parent_hash":     c.ParentHash,
		"parent_hashes":   c.ParentHashes,
		"tree_hash":       c.TreeHash,
		"author":          c.Author,
		"message":         c.Message,
		"timestamp":       c.Timestamp,
		"type":            c.Type,
		"screenshot_path": c.ScreenshotPath,
	}
}

func commitToMapWithRepo(repo *core.Repository, c *models.Commit) map[string]interface{} {
	m := commitToMap(c)
	if repo != nil && c != nil && c.Hash != "" {
		if tag, err := repo.GetTagByCommitHash(c.Hash); err == nil && tag != "" {
			m["tag"] = tag
		}
	}
	return m
}