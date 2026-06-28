package jsonapi

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"sort"
	"strings"

	"github.com/difference-machine/forester/internal/commands"
	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/models"
	"github.com/difference-machine/forester/internal/utils"
)

const maxDiffBlobBytes = 5 * 1024 * 1024

type diffFromMode int

const (
	diffFromDefault diffFromMode = iota
	diffFromNull
	diffFromHash
)

type renamePair struct {
	OldPath string
	NewPath string
}

type treeDiffResult struct {
	added    []string
	modified []string
	deleted  []string
	renamed  []renamePair
	tree1    map[string]*models.TreeEntry
	tree2    map[string]*models.TreeEntry
}

func (d *treeDiffResult) detectRenames() {
	if len(d.added) == 0 || len(d.deleted) == 0 {
		return
	}

	deletedByHash := make(map[string][]string)
	for _, path := range d.deleted {
		entry := d.tree1[path]
		if entry == nil {
			continue
		}
		deletedByHash[entry.Hash] = append(deletedByHash[entry.Hash], path)
	}
	for hash := range deletedByHash {
		sort.Strings(deletedByHash[hash])
	}

	usedOld := make(map[string]bool)
	var newAdded, newDeleted []string
	sortedAdded := append([]string(nil), d.added...)
	sort.Strings(sortedAdded)

	for _, newPath := range sortedAdded {
		entry := d.tree2[newPath]
		if entry == nil {
			newAdded = append(newAdded, newPath)
			continue
		}
		matched := ""
		for _, oldPath := range deletedByHash[entry.Hash] {
			if !usedOld[oldPath] {
				matched = oldPath
				break
			}
		}
		if matched != "" {
			d.renamed = append(d.renamed, renamePair{OldPath: matched, NewPath: newPath})
			usedOld[matched] = true
		} else {
			newAdded = append(newAdded, newPath)
		}
	}
	for _, path := range d.deleted {
		if !usedOld[path] {
			newDeleted = append(newDeleted, path)
		}
	}
	sort.Strings(newAdded)
	sort.Strings(newDeleted)
	d.added = newAdded
	d.deleted = newDeleted
}

func (d *treeDiffResult) renameOldPath(newPath string) string {
	for _, pair := range d.renamed {
		if pair.NewPath == newPath {
			return pair.OldPath
		}
	}
	return ""
}

func parseDiffFrom(raw json.RawMessage) (diffFromMode, string, error) {
	if len(raw) == 0 {
		return diffFromDefault, "", nil
	}
	trimmed := strings.TrimSpace(string(raw))
	if trimmed == "null" {
		return diffFromNull, "", nil
	}
	var hash string
	if err := json.Unmarshal(raw, &hash); err != nil {
		return diffFromDefault, "", fmt.Errorf("invalid from: %w", err)
	}
	if hash == "" {
		return diffFromNull, "", nil
	}
	return diffFromHash, hash, nil
}

func loadTreeMap(storage *core.Storage, treeHash string) (map[string]*models.TreeEntry, error) {
	out := make(map[string]*models.TreeEntry)
	if treeHash == "" {
		return out, nil
	}
	treeContent, err := storage.GetTreeContent(treeHash)
	if err != nil {
		return nil, err
	}
	var tree models.Tree
	if err := json.Unmarshal([]byte(treeContent), &tree); err != nil {
		return nil, fmt.Errorf("parse tree: %w", err)
	}
	if err := core.BuildTreeMapRecursive(storage, &tree, "", out); err != nil {
		return nil, err
	}
	return out, nil
}

func compareTrees(storage *core.Storage, fromTreeHash, toTreeHash string) (*treeDiffResult, error) {
	tree1, err := loadTreeMap(storage, fromTreeHash)
	if err != nil {
		return nil, err
	}
	tree2, err := loadTreeMap(storage, toTreeHash)
	if err != nil {
		return nil, err
	}

	result := &treeDiffResult{
		tree1: tree1,
		tree2: tree2,
	}
	for name, entry2 := range tree2 {
		entry1, exists := tree1[name]
		if !exists {
			result.added = append(result.added, name)
		} else if entry1.Hash != entry2.Hash {
			result.modified = append(result.modified, name)
		}
	}
	for name := range tree1 {
		if _, exists := tree2[name]; !exists {
			result.deleted = append(result.deleted, name)
		}
	}
	sort.Strings(result.added)
	sort.Strings(result.modified)
	sort.Strings(result.deleted)
	result.detectRenames()
	return result, nil
}

func resolveToCommit(repo *core.Repository, toArg string) (*models.Commit, error) {
	if strings.TrimSpace(toArg) == "" {
		return nil, fmt.Errorf("to commit is required")
	}
	branch, _ := repo.Refs.GetCurrentBranch()
	if branch == "" {
		branch = "main"
	}
	toResolved, err := commands.ResolveCommitHash(repo, branch, toArg)
	if err != nil {
		return nil, err
	}
	toCommit, err := repo.GetCommit(toResolved)
	if err != nil {
		return nil, fmt.Errorf("commit not found: %s", toArg)
	}
	return toCommit, nil
}

func firstParentTreeHash(repo *core.Repository, commit *models.Commit) (string, error) {
	parent := firstParentHash(commit)
	if parent == "" {
		return "", nil
	}
	parentCommit, err := repo.GetCommit(parent)
	if err != nil {
		return "", nil
	}
	return parentCommit.TreeHash, nil
}

func resolveFromTreeHash(repo *core.Repository, fromRaw json.RawMessage, toCommit *models.Commit) (string, error) {
	mode, fromHash, err := parseDiffFrom(fromRaw)
	if err != nil {
		return "", err
	}
	switch mode {
	case diffFromNull:
		return "", nil
	case diffFromHash:
		branch, _ := repo.Refs.GetCurrentBranch()
		if branch == "" {
			branch = "main"
		}
		resolved, err := commands.ResolveCommitHash(repo, branch, fromHash)
		if err != nil {
			return "", err
		}
		fromCommit, err := repo.GetCommit(resolved)
		if err != nil {
			return "", fmt.Errorf("from commit not found: %s", fromHash)
		}
		return fromCommit.TreeHash, nil
	default:
		return firstParentTreeHash(repo, toCommit)
	}
}

func handleDiffNameStatus(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		From json.RawMessage `json:"from"`
		To   string          `json:"to"`
	}
	if err := decodeArgs(args, &params); err != nil {
		return nil, err
	}

	return withRepo(workPath, func(repo *core.Repository, _ string) (interface{}, error) {
		toCommit, err := resolveToCommit(repo, params.To)
		if err != nil {
			return nil, err
		}
		fromTree, err := resolveFromTreeHash(repo, params.From, toCommit)
		if err != nil {
			return nil, err
		}

		diff, err := compareTrees(repo.Storage, fromTree, toCommit.TreeHash)
		if err != nil {
			return nil, err
		}

		files := make([]map[string]string, 0, len(diff.added)+len(diff.modified)+len(diff.deleted)+len(diff.renamed))
		for _, path := range diff.added {
			if utils.IsDfmignoreRelPath(path) {
				continue
			}
			files = append(files, map[string]string{"status": "A", "path": path})
		}
		for _, path := range diff.modified {
			if utils.IsDfmignoreRelPath(path) {
				continue
			}
			files = append(files, map[string]string{"status": "M", "path": path})
		}
		for _, path := range diff.deleted {
			if utils.IsDfmignoreRelPath(path) {
				continue
			}
			files = append(files, map[string]string{"status": "D", "path": path})
		}
		for _, pair := range diff.renamed {
			if utils.IsDfmignoreRelPath(pair.NewPath) || utils.IsDfmignoreRelPath(pair.OldPath) {
				continue
			}
			files = append(files, map[string]string{
				"status":   "R",
				"path":     pair.NewPath,
				"old_path": pair.OldPath,
			})
		}
		return map[string]interface{}{"files": files}, nil
	})
}

func handleDiffStat(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		From json.RawMessage `json:"from"`
		To   string          `json:"to"`
	}
	if err := decodeArgs(args, &params); err != nil {
		return nil, err
	}

	return withRepo(workPath, func(repo *core.Repository, _ string) (interface{}, error) {
		toCommit, err := resolveToCommit(repo, params.To)
		if err != nil {
			return nil, err
		}
		fromTree, err := resolveFromTreeHash(repo, params.From, toCommit)
		if err != nil {
			return nil, err
		}
		diff, err := compareTrees(repo.Storage, fromTree, toCommit.TreeHash)
		if err != nil {
			return nil, err
		}

		insertions := 0
		deletions := 0
		filesChanged := 0
		storage := repo.Storage
		for _, file := range diff.modified {
			if utils.IsDfmignoreRelPath(file) {
				continue
			}
			filesChanged++
			e1 := diff.tree1[file]
			e2 := diff.tree2[file]
			c1, err1 := storage.GetBlobContentString(e1.Hash)
			c2, err2 := storage.GetBlobContentString(e2.Hash)
			if err1 == nil && err2 == nil && utils.IsTextFile([]byte(c1)) && utils.IsTextFile([]byte(c2)) {
				for _, line := range utils.ComputeDiff(c1, c2) {
					if line.Type == utils.DiffLineAdded {
						insertions++
					} else if line.Type == utils.DiffLineRemoved {
						deletions++
					}
				}
			}
		}
		for _, file := range diff.added {
			if utils.IsDfmignoreRelPath(file) {
				continue
			}
			filesChanged++
			c2, err := storage.GetBlobContentString(diff.tree2[file].Hash)
			if err == nil && utils.IsTextFile([]byte(c2)) {
				insertions += len(utils.SplitLines(c2))
			}
		}
		for _, file := range diff.deleted {
			if utils.IsDfmignoreRelPath(file) {
				continue
			}
			filesChanged++
			c1, err := storage.GetBlobContentString(diff.tree1[file].Hash)
			if err == nil && utils.IsTextFile([]byte(c1)) {
				deletions += len(utils.SplitLines(c1))
			}
		}

		for _, pair := range diff.renamed {
			if utils.IsDfmignoreRelPath(pair.NewPath) || utils.IsDfmignoreRelPath(pair.OldPath) {
				continue
			}
			filesChanged++
		}

		return map[string]interface{}{
			"files_changed": filesChanged,
			"insertions":    insertions,
			"deletions":     deletions,
		}, nil
	})
}

func handleDiffText(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		From json.RawMessage `json:"from"`
		To   string          `json:"to"`
		Path string          `json:"path"`
	}
	if err := decodeArgs(args, &params); err != nil {
		return nil, err
	}
	if params.Path == "" {
		return nil, fmt.Errorf("path is required")
	}
	relPath := canonicalRelPath(params.Path)

	return withRepo(workPath, func(repo *core.Repository, _ string) (interface{}, error) {
		toCommit, err := resolveToCommit(repo, params.To)
		if err != nil {
			return nil, err
		}
		fromTree, err := resolveFromTreeHash(repo, params.From, toCommit)
		if err != nil {
			return nil, err
		}

		diff, err := compareTrees(repo.Storage, fromTree, toCommit.TreeHash)
		if err != nil {
			return nil, err
		}

		status := ""
		oldPath := diff.renameOldPath(relPath)
		switch {
		case oldPath != "":
			status = "R"
		case contains(diff.added, relPath):
			status = "A"
		case contains(diff.modified, relPath):
			status = "M"
		case contains(diff.deleted, relPath):
			status = "D"
		default:
			return nil, fmt.Errorf("file not changed in this commit")
		}

		storage := repo.Storage
		var content1, content2 string
		if status == "D" {
			entry := diff.tree1[relPath]
			content1, err = storage.GetBlobContentString(entry.Hash)
			if err != nil {
				return nil, err
			}
		} else if status == "A" {
			entry := diff.tree2[relPath]
			content2, err = storage.GetBlobContentString(entry.Hash)
			if err != nil {
				return nil, err
			}
		} else if status == "R" {
			entry1 := diff.tree1[oldPath]
			entry2 := diff.tree2[relPath]
			content1, err = storage.GetBlobContentString(entry1.Hash)
			if err != nil {
				return nil, err
			}
			content2, err = storage.GetBlobContentString(entry2.Hash)
			if err != nil {
				return nil, err
			}
		} else {
			e1 := diff.tree1[relPath]
			e2 := diff.tree2[relPath]
			content1, err = storage.GetBlobContentString(e1.Hash)
			if err != nil {
				return nil, err
			}
			content2, err = storage.GetBlobContentString(e2.Hash)
			if err != nil {
				return nil, err
			}
		}

		size := len(content1) + len(content2)
		if size > maxDiffBlobBytes {
			return nil, fmt.Errorf("file_too_large")
		}

		isBinary := false
		if status != "A" && content1 != "" && !utils.IsTextFile([]byte(content1)) {
			isBinary = true
		}
		if status != "D" && content2 != "" && !utils.IsTextFile([]byte(content2)) {
			isBinary = true
		}
		if isBinary {
			return map[string]interface{}{
				"content":   "",
				"format":    "unified",
				"is_binary": true,
			}, nil
		}

		var unified string
		if status == "A" {
			diffLines := utils.ComputeDiff("", content2)
			unified = utils.FormatUnifiedDiff("/dev/null", relPath, diffLines)
		} else if status == "D" {
			diffLines := utils.ComputeDiff(content1, "")
			unified = utils.FormatUnifiedDiff(relPath, "/dev/null", diffLines)
		} else if status == "R" {
			if content1 == content2 {
				return map[string]interface{}{
					"content":   "",
					"format":    "unified",
					"is_binary": false,
				}, nil
			}
			diffLines := utils.ComputeDiff(content1, content2)
			unified = utils.FormatUnifiedDiff(oldPath, relPath, diffLines)
		} else {
			diffLines := utils.ComputeDiff(content1, content2)
			unified = utils.FormatUnifiedDiff(relPath, relPath, diffLines)
		}

		return map[string]interface{}{
			"content":   unified,
			"format":    "unified",
			"is_binary": false,
		}, nil
	})
}

func handleBlobGet(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		Commit string `json:"commit"`
		Path   string `json:"path"`
	}
	if err := decodeArgs(args, &params); err != nil {
		return nil, err
	}
	if params.Commit == "" || params.Path == "" {
		return nil, fmt.Errorf("commit and path are required")
	}
	relPath := canonicalRelPath(params.Path)

	return withRepo(workPath, func(repo *core.Repository, _ string) (interface{}, error) {
		branch, _ := repo.Refs.GetCurrentBranch()
		if branch == "" {
			branch = "main"
		}
		commitHash, err := commands.ResolveCommitHash(repo, branch, params.Commit)
		if err != nil {
			return nil, err
		}
		commit, err := repo.GetCommit(commitHash)
		if err != nil {
			return nil, fmt.Errorf("commit not found")
		}
		treeMap, err := loadTreeMap(repo.Storage, commit.TreeHash)
		if err != nil {
			return nil, err
		}
		entry, ok := treeMap[relPath]
		if !ok || entry.Type != "blob" {
			return nil, fmt.Errorf("file not found in commit")
		}
		raw, err := repo.Storage.GetBlobContent(entry.Hash)
		if err != nil {
			return nil, err
		}
		if len(raw) > maxDiffBlobBytes {
			return nil, fmt.Errorf("file_too_large")
		}
		mime := guessMime(relPath)
		return map[string]interface{}{
			"content_base64": base64.StdEncoding.EncodeToString(raw),
			"mime":           mime,
			"size":           len(raw),
		}, nil
	})
}

func contains(list []string, target string) bool {
	for _, item := range list {
		if item == target {
			return true
		}
	}
	return false
}
