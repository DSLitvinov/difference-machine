package core

import (
	"encoding/json"

	"github.com/difference-machine/forester/internal/models"
)

// CollectUsedObjects returns object hashes that must be retained during GC:
// commits, trees, blobs, and annotated tag objects reachable from refs, stashes, and tag refs.
func (r *Repository) CollectUsedObjects() (map[string]bool, error) {
	used := make(map[string]bool)

	referencedCommits, err := r.CollectReferencedCommits()
	if err != nil {
		return nil, err
	}
	for hash := range referencedCommits {
		_ = r.markCommitReachable(hash, used)
	}

	tagNames, err := r.Refs.ListTags()
	if err != nil {
		return used, err
	}
	for _, name := range tagNames {
		refHash, err := r.Refs.GetTag(name)
		if err != nil || refHash == "" {
			continue
		}
		if r.Storage.TagExists(refHash) {
			used[refHash] = true
		}
	}

	db, err := r.DB()
	if err != nil {
		return used, err
	}
	stashes, err := db.ListStashes()
	if err != nil {
		return used, err
	}
	for _, stash := range stashes {
		_ = r.markTreeReachable(stash.TreeHash, used)
	}

	return used, nil
}

func (r *Repository) markCommitReachable(commitHash string, used map[string]bool) error {
	if commitHash == "" || used[commitHash] {
		return nil
	}
	used[commitHash] = true

	commit, err := r.GetCommit(commitHash)
	if err != nil {
		return err
	}

	_ = r.markTreeReachable(commit.TreeHash, used)

	parents := commit.ParentHashes
	if len(parents) == 0 && commit.ParentHash != "" {
		parents = []string{commit.ParentHash}
	}
	for _, parent := range parents {
		_ = r.markCommitReachable(parent, used)
	}
	return nil
}

func (r *Repository) markTreeReachable(treeHash string, used map[string]bool) error {
	if treeHash == "" || used[treeHash] {
		return nil
	}
	used[treeHash] = true

	treeContent, err := r.Storage.GetTreeContent(treeHash)
	if err != nil {
		return err
	}

	var tree models.Tree
	if err := json.Unmarshal([]byte(treeContent), &tree); err != nil {
		return err
	}

	for _, entry := range tree.Entries {
		switch entry.Type {
		case "blob":
			used[entry.Hash] = true
		case "tree":
			_ = r.markTreeReachable(entry.Hash, used)
		}
	}
	return nil
}
