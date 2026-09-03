package jsonapi

import (
	"encoding/json"
	"fmt"
	"path/filepath"
	"sort"

	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/models"
	"github.com/difference-machine/forester/internal/utils"
)

func handleCommitDeleteFile(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		CommitHash string `json:"commit_hash"`
		Path       string `json:"path"`
	}
	if err := decodeArgs(args, &params); err != nil {
		return nil, err
	}
	if params.CommitHash == "" {
		return nil, fmt.Errorf("commit_hash is required")
	}
	rel := canonicalRelPath(params.Path)
	if rel == "" {
		return nil, fmt.Errorf("path is required")
	}

	return withRepo(workPath, func(repo *core.Repository, repoPath string) (interface{}, error) {
		if utils.Exists(filepath.Join(repoPath, ".DFM", "MERGE_HEAD")) {
			return nil, fmt.Errorf("cannot delete file from history during merge")
		}
		if detached, _, err := core.ReadDetachedHead(repoPath); err != nil {
			return nil, fmt.Errorf("failed to read detached HEAD: %w", err)
		} else if detached {
			return nil, fmt.Errorf("cannot delete file from history while HEAD is detached")
		}

		target, err := repo.FindCommitByPrefix(params.CommitHash)
		if err != nil {
			return nil, fmt.Errorf("commit not found: %s", params.CommitHash)
		}

		branch, err := repo.Refs.GetCurrentBranch()
		if err != nil || branch == "" {
			branch = "main"
		}
		chain, err := firstParentChainTo(repo, branch, target.Hash)
		if err != nil {
			return nil, err
		}

		newHash, err := rewriteChainDroppingFile(repo, chain, rel)
		if err != nil {
			return nil, err
		}
		return map[string]interface{}{
			"success": true,
			"hash":    newHash,
		}, nil
	})
}

func firstParentChainTo(repo *core.Repository, branch, targetHash string) ([]*models.Commit, error) {
	head, err := repo.GetBranchHead(branch)
	if err != nil || head == "" {
		return nil, fmt.Errorf("no commits on branch '%s'", branch)
	}

	var chain []*models.Commit
	current := head
	for i := 0; i < core.MaxCommitLimit; i++ {
		commit, err := repo.GetCommit(current)
		if err != nil {
			return nil, fmt.Errorf("commit not found: %s", current)
		}
		chain = append(chain, commit)
		if commit.Hash == targetHash {
			for left, right := 0, len(chain)-1; left < right; left, right = left+1, right-1 {
				chain[left], chain[right] = chain[right], chain[left]
			}
			return chain, nil
		}
		parent := repoFirstParent(commit)
		if parent == "" {
			break
		}
		current = parent
	}
	return nil, fmt.Errorf("commit is not on the current branch")
}

func repoFirstParent(commit *models.Commit) string {
	if len(commit.ParentHashes) > 0 {
		return commit.ParentHashes[0]
	}
	return commit.ParentHash
}

func rewriteChainDroppingFile(repo *core.Repository, chain []*models.Commit, rel string) (string, error) {
	if len(chain) == 0 {
		return "", fmt.Errorf("commit is not on the current branch")
	}

	hashMap := make(map[string]string, len(chain))
	targetHash := chain[0].Hash

	for _, oldCommit := range chain {
		parents := remapParents(oldCommit, hashMap)
		treeHash, found, err := treeWithoutPath(repo.Storage, oldCommit.TreeHash, rel)
		if err != nil {
			return "", err
		}
		if oldCommit.Hash == targetHash && !found {
			return "", fmt.Errorf("file not found in commit: %s", rel)
		}
		if !found {
			treeHash = oldCommit.TreeHash
		}

		rewritten := *oldCommit
		rewritten.Hash = ""
		rewritten.TreeHash = treeHash
		if len(parents) > 0 {
			rewritten.ParentHash = parents[0]
			rewritten.ParentHashes = parents
		} else {
			rewritten.ParentHash = ""
			rewritten.ParentHashes = nil
		}
		newHash, err := core.FinalizeCommit(repo, &rewritten)
		if err != nil {
			return "", fmt.Errorf("failed to store commit: %w", err)
		}
		hashMap[oldCommit.Hash] = newHash
		if err := remapManifests(repo, oldCommit.Hash, newHash, rel); err != nil {
			return "", err
		}
	}

	if err := remapRefs(repo, hashMap); err != nil {
		return "", err
	}
	return hashMap[targetHash], nil
}

func remapParents(commit *models.Commit, hashMap map[string]string) []string {
	raw := commit.ParentHashes
	if len(raw) == 0 && commit.ParentHash != "" {
		raw = []string{commit.ParentHash}
	}
	out := make([]string, 0, len(raw))
	for _, parent := range raw {
		if next, ok := hashMap[parent]; ok {
			out = append(out, next)
			continue
		}
		out = append(out, parent)
	}
	return out
}

func treeWithoutPath(storage *core.Storage, treeHash, rel string) (string, bool, error) {
	treeMap, err := loadTreeMap(storage, treeHash)
	if err != nil {
		return "", false, err
	}
	key, _, found := treeEntryByPath(treeMap, rel)
	if !found {
		return treeHash, false, nil
	}
	delete(treeMap, key)
	hash, err := storeFlatTree(storage, treeMap)
	if err != nil {
		return "", false, err
	}
	return hash, true, nil
}

func treeEntryByPath(tree map[string]*models.TreeEntry, rel string) (string, *models.TreeEntry, bool) {
	for path, entry := range tree {
		if canonicalRelPath(path) == rel {
			return path, entry, true
		}
	}
	return "", nil, false
}

func storeFlatTree(storage *core.Storage, treeMap map[string]*models.TreeEntry) (string, error) {
	paths := make([]string, 0, len(treeMap))
	for path := range treeMap {
		paths = append(paths, path)
	}
	sort.Strings(paths)

	tree := models.NewTree()
	for _, path := range paths {
		entry := treeMap[path]
		name := canonicalRelPath(path)
		if name == "" {
			name = path
		}
		tree.AddEntry(models.NewTreeEntry(entry.Hash, name, entry.Type))
	}
	treeJSON, err := tree.ToJSON()
	if err != nil {
		return "", fmt.Errorf("failed to serialize tree: %w", err)
	}
	hash, err := storage.StoreTree(treeJSON)
	if err != nil {
		return "", fmt.Errorf("failed to store tree: %w", err)
	}
	return hash, nil
}

func remapManifests(repo *core.Repository, oldHash, newHash, deletedPath string) error {
	objects, err := repo.Manifests.GetObjectsByCommit(oldHash)
	if err != nil {
		return err
	}
	if err := repo.Manifests.DeleteManifestsForCommit(oldHash); err != nil {
		return err
	}
	for _, obj := range objects {
		if canonicalRelPath(obj.FilePath) == deletedPath {
			continue
		}
		copyObj := *obj
		copyObj.CommitHash = newHash
		if err := repo.Manifests.AddObject(&copyObj); err != nil {
			return err
		}
	}
	return nil
}

func remapRefs(repo *core.Repository, hashMap map[string]string) error {
	branches, err := repo.ListBranches()
	if err != nil {
		return fmt.Errorf("failed to list branches: %w", err)
	}
	for _, name := range branches {
		head, err := repo.GetBranchHead(name)
		if err != nil || head == "" {
			continue
		}
		next, ok := hashMap[head]
		if !ok {
			continue
		}
		if err := repo.SetBranchHead(name, next, head); err != nil {
			return fmt.Errorf("failed to update branch '%s': %w", name, err)
		}
	}

	tags, err := repo.ListTags()
	if err != nil {
		return err
	}
	for _, tag := range tags {
		next, ok := hashMap[tag.CommitHash]
		if !ok {
			continue
		}
		if err := repo.DeleteTag(tag.Name); err != nil {
			return fmt.Errorf("failed to move tag '%s': %w", tag.Name, err)
		}
		tag.CommitHash = next
		if err := repo.CreateTag(tag, tag.Message != ""); err != nil {
			return fmt.Errorf("failed to move tag '%s': %w", tag.Name, err)
		}
	}
	return nil
}
