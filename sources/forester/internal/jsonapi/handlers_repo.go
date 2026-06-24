package jsonapi

import (
	"encoding/json"
	"fmt"
	"path/filepath"
	"strings"

	"github.com/difference-machine/forester/internal/commands"
	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/models"
	"github.com/difference-machine/forester/internal/utils"
)

func handleRepoInit(workPath string, _ json.RawMessage) (interface{}, error) {
	_, err := withWorkDir(workPath, func() (interface{}, error) {
		if err := commands.Init([]string{}); err != nil {
			return nil, err
		}
		return successResult(), nil
	})
	return successResult(), err
}

func handleIndexAdd(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		Files []string `json:"files"`
	}
	_ = decodeArgs(args, &params)
	fileArgs := params.Files
	if len(fileArgs) == 0 {
		fileArgs = []string{"."}
	}

	_, err := withWorkDir(workPath, func() (interface{}, error) {
		if err := commands.Add(fileArgs); err != nil {
			return nil, err
		}
		return successResult(), nil
	})
	return successResult(), err
}

func handleCommitCreate(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		Message string `json:"message"`
		Author  string `json:"author"`
		Amend   bool   `json:"amend"`
		Tag     string `json:"tag"`
	}
	if err := decodeArgs(args, &params); err != nil {
		return nil, err
	}
	if params.Message == "" {
		return nil, fmt.Errorf("commit message is required")
	}

	_, err := withWorkDir(workPath, func() (interface{}, error) {
		cmdArgs := []string{params.Message}
		if params.Author != "" {
			cmdArgs = append(cmdArgs, "--author", params.Author)
		}
		if params.Amend {
			cmdArgs = append(cmdArgs, "--amend")
		}
		if params.Tag != "" {
			cmdArgs = append(cmdArgs, "--tag", params.Tag)
		}
		if err := commands.Commit(cmdArgs); err != nil {
			return nil, err
		}
		return successResult(), nil
	})
	return successResult(), err
}

func handleRepoSwitch(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		Target    string `json:"target"`
		AutoStash bool   `json:"auto_stash"`
	}
	if err := decodeArgs(args, &params); err != nil {
		return nil, err
	}
	if params.Target == "" {
		return nil, fmt.Errorf("switch target is required")
	}

	_, err := withWorkDir(workPath, func() (interface{}, error) {
		cmdArgs := []string{params.Target}
		if params.AutoStash {
			cmdArgs = append(cmdArgs, "-a")
		}
		if err := commands.Switch(cmdArgs); err != nil {
			return nil, err
		}
		return successResult(), nil
	})
	return successResult(), err
}

func handleCompareExtract(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		CommitHash string `json:"commit_hash"`
		Cleanup    bool   `json:"cleanup"`
		EditorPath string `json:"editor_path"`
	}
	if err := decodeArgs(args, &params); err != nil {
		return nil, err
	}
	if params.CommitHash == "" {
		return nil, fmt.Errorf("commit_hash is required")
	}

	return withWorkDir(workPath, func() (interface{}, error) {
		cmdArgs := []string{params.CommitHash}
		if params.Cleanup {
			cmdArgs = append(cmdArgs, "--cleanup")
		}
		if params.EditorPath != "" {
			cmdArgs = append(cmdArgs, "--editor", params.EditorPath)
		}
		if err := commands.Compare(cmdArgs); err != nil {
			return nil, err
		}
		result := map[string]interface{}{"success": true}
		if !params.Cleanup {
			repoPath, err := utils.FindRepositoryRoot(".")
			if err != nil {
				return nil, fmt.Errorf("not a Forester repository")
			}
			result["path"] = filepath.Join(repoPath, ".DFM", "tmp_review")
		}
		return result, nil
	})
}

func handleRestoreVersion(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		CommitHash string `json:"commit_hash"`
	}
	if err := decodeArgs(args, &params); err != nil {
		return nil, err
	}
	if params.CommitHash == "" {
		return nil, fmt.Errorf("commit_hash is required")
	}

	_, err := withWorkDir(workPath, func() (interface{}, error) {
		if err := commands.RestoreVersion([]string{params.CommitHash}); err != nil {
			return nil, err
		}
		return successResult(), nil
	})
	return successResult(), err
}

func handleCommitRevert(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		CommitHash string `json:"commit_hash"`
	}
	if err := decodeArgs(args, &params); err != nil {
		return nil, err
	}
	if params.CommitHash == "" {
		return nil, fmt.Errorf("commit_hash is required")
	}

	_, err := withWorkDir(workPath, func() (interface{}, error) {
		if err := commands.Revert([]string{params.CommitHash}); err != nil {
			return nil, err
		}
		return successResult(), nil
	})
	return successResult(), err
}

func handleCommitReset(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		CommitHash string `json:"commit_hash"`
		Mode       string `json:"mode"`
	}
	if err := decodeArgs(args, &params); err != nil {
		return nil, err
	}
	if params.CommitHash == "" {
		return nil, fmt.Errorf("commit_hash is required")
	}

	_, err := withWorkDir(workPath, func() (interface{}, error) {
		cmdArgs := []string{params.CommitHash}
		mode := strings.ToLower(params.Mode)
		if mode != "" && mode != "mixed" {
			switch mode {
			case "soft":
				cmdArgs = append([]string{"--soft"}, cmdArgs...)
			case "hard":
				cmdArgs = append([]string{"--hard"}, cmdArgs...)
			default:
				return nil, fmt.Errorf("invalid reset mode")
			}
		}
		if err := commands.Reset(cmdArgs); err != nil {
			return nil, err
		}
		return successResult(), nil
	})
	return successResult(), err
}

func handleRestoreFile(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		CommitHash string   `json:"commit_hash"`
		Paths      []string `json:"paths"`
	}
	if err := decodeArgs(args, &params); err != nil {
		return nil, err
	}
	if params.CommitHash == "" {
		return nil, fmt.Errorf("commit_hash is required")
	}
	if len(params.Paths) == 0 {
		return nil, fmt.Errorf("paths is required")
	}

	_, err := withWorkDir(workPath, func() (interface{}, error) {
		cmdArgs := []string{fmt.Sprintf("--source=%s", params.CommitHash)}
		for _, p := range params.Paths {
			cmdArgs = append(cmdArgs, canonicalRelPath(p))
		}
		if err := commands.Restore(cmdArgs); err != nil {
			return nil, err
		}
		return successResult(), nil
	})
	return successResult(), err
}

func handleStatusGet(workPath string, _ json.RawMessage) (interface{}, error) {
	return withWorkDir(workPath, func() (interface{}, error) {
		repoPath, err := utils.FindRepositoryRoot(".")
		if err != nil {
			return nil, fmt.Errorf("not a Forester repository")
		}
		repo, err := core.OpenRepository(repoPath)
		if err != nil {
			return nil, fmt.Errorf("failed to open repository: %w", err)
		}
		defer repo.Close()
		return computeStatus(repo, repoPath)
	})
}

func computeStatus(repo *core.Repository, repoPath string) (map[string]interface{}, error) {
	storage := repo.Storage

	detached, detachedState, err := core.ReadDetachedHead(repoPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read detached HEAD: %w", err)
	}

	currentBranch, err := repo.Refs.GetCurrentBranch()
	if err != nil || currentBranch == "" {
		currentBranch = "main"
	}

	var headCommit string
	if detached {
		headCommit = detachedState.Commit
		if detachedState.Branch != "" {
			currentBranch = detachedState.Branch
		}
	} else {
		headCommit, err = repo.GetBranchHead(currentBranch)
		if err != nil {
			headCommit = ""
		}
	}

	var lastTree models.Tree
	if headCommit != "" {
		commit, err := repo.GetCommit(headCommit)
		if err == nil {
			treeContent, err := storage.GetTreeContent(commit.TreeHash)
			if err == nil {
				_ = json.Unmarshal([]byte(treeContent), &lastTree)
			}
		}
	}

	index, err := core.NewIndex(repoPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open index: %w", err)
	}

	allFiles, err := utils.ListFiles(repoPath, true)
	if err != nil {
		return nil, fmt.Errorf("failed to list files: %w", err)
	}

	var stagedNew, stagedModified, stagedDeleted []string
	var unstagedModified, unstagedDeleted, untracked []string

	trackedMap := make(map[string]string)
	for _, entry := range lastTree.Entries {
		trackedMap[entry.Name] = entry.Hash
	}
	indexMap := index.GetEntries()

	for relPath, indexHash := range indexMap {
		headHash, existsInHead := trackedMap[relPath]
		if !existsInHead {
			stagedNew = append(stagedNew, relPath)
		} else if headHash != indexHash {
			stagedModified = append(stagedModified, relPath)
		}
	}

	for relPath := range trackedMap {
		if _, existsInIndex := indexMap[relPath]; !existsInIndex {
			fullPath := filepath.Join(repoPath, relPath)
			if !utils.Exists(fullPath) {
				unstagedDeleted = append(unstagedDeleted, relPath)
			}
		}
	}

	patterns := utils.NewPatterns()
	ignorePath := filepath.Join(repoPath, ".dfmignore")
	if utils.Exists(ignorePath) {
		patterns.LoadFromFile(ignorePath)
	}

	for _, filePath := range allFiles {
		if strings.Contains(filePath, ".DFM") {
			continue
		}
		relPath, err := filepath.Rel(repoPath, filePath)
		if err != nil {
			continue
		}
		relPath = filepath.ToSlash(relPath)
		if patterns.Matches(relPath) {
			continue
		}
		if !utils.IsFile(filePath) {
			continue
		}
		currentHash, err := core.HashFile(filePath)
		if err != nil {
			continue
		}
		indexHash, isStaged := indexMap[relPath]
		headHash, isTracked := trackedMap[relPath]
		if !isTracked && !isStaged {
			untracked = append(untracked, relPath)
		} else if isStaged {
			if currentHash != indexHash {
				unstagedModified = append(unstagedModified, relPath)
			}
		} else if isTracked && currentHash != headHash {
			unstagedModified = append(unstagedModified, relPath)
		}
	}

	for relPath := range indexMap {
		fullPath := filepath.Join(repoPath, relPath)
		if !utils.Exists(fullPath) {
			if _, existsInHead := trackedMap[relPath]; existsInHead {
				stagedDeleted = append(stagedDeleted, relPath)
			}
		}
	}

	renamedFiles, stagedNew, stagedDeleted, unstagedDeleted := detectWorkingTreeRenames(
		stagedNew, stagedDeleted, unstagedDeleted, indexMap, trackedMap,
	)

	return map[string]interface{}{
		"current_branch":          currentBranch,
		"head_commit":             headCommit,
		"is_detached":             detached,
		"detached_commit":         detachedState.Commit,
		"staged_new_files":        stagedNew,
		"staged_modified_files":   stagedModified,
		"staged_deleted_files":    stagedDeleted,
		"unstaged_modified_files": unstagedModified,
		"unstaged_deleted_files":  unstagedDeleted,
		"untracked_files":         untracked,
		"renamed_files":           renamedFiles,
	}, nil
}

func detectWorkingTreeRenames(
	stagedNew, stagedDeleted, unstagedDeleted []string,
	indexMap, trackedMap map[string]string,
) ([]map[string]string, []string, []string, []string) {
	oldCandidates := append(append([]string{}, stagedDeleted...), unstagedDeleted...)
	oldByHash := make(map[string][]string)
	for _, path := range oldCandidates {
		hash, ok := trackedMap[path]
		if !ok {
			continue
		}
		oldByHash[hash] = append(oldByHash[hash], path)
	}

	usedOld := make(map[string]bool)
	renamedFiles := make([]map[string]string, 0)
	remainingNew := make([]string, 0, len(stagedNew))

	for _, newPath := range stagedNew {
		hash, ok := indexMap[newPath]
		if !ok {
			remainingNew = append(remainingNew, newPath)
			continue
		}
		matched := ""
		for _, oldPath := range oldByHash[hash] {
			if !usedOld[oldPath] {
				matched = oldPath
				break
			}
		}
		if matched != "" {
			renamedFiles = append(renamedFiles, map[string]string{
				"old_path": matched,
				"path":     newPath,
			})
			usedOld[matched] = true
		} else {
			remainingNew = append(remainingNew, newPath)
		}
	}

	filterDeleted := func(list []string) []string {
		if len(usedOld) == 0 {
			return list
		}
		out := make([]string, 0, len(list))
		for _, path := range list {
			if !usedOld[path] {
				out = append(out, path)
			}
		}
		return out
	}

	return renamedFiles, remainingNew, filterDeleted(stagedDeleted), filterDeleted(unstagedDeleted)
}
