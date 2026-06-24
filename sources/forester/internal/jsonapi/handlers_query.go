package jsonapi

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/utils"
)

func handleLogGet(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		Branch   string `json:"branch"`
		MaxCount int    `json:"max_count"`
		Path     string `json:"path"`
	}
	_ = decodeArgs(args, &params)
	limit := params.MaxCount
	if limit <= 0 {
		limit = 100
	}

	return withRepo(workPath, func(repo *core.Repository, _ string) (interface{}, error) {
		branchName := params.Branch
		if branchName == "" {
			branchName, _ = repo.Refs.GetCurrentBranch()
			if branchName == "" {
				branchName = "main"
			}
		}

		relPath := canonicalRelPath(params.Path)
		commits, err := filterCommitsByFile(repo, branchName, relPath, limit)
		if err != nil {
			return nil, fmt.Errorf("failed to get commit history: %w", err)
		}
		out := make([]map[string]interface{}, 0, len(commits))
		for _, c := range commits {
			out = append(out, commitToMapWithRepo(repo, c))
		}
		return map[string]interface{}{
			"commits":  out,
			"capped":   len(commits) >= limit,
			"filtered": relPath != "",
		}, nil
	})
}

func handleBranchList(workPath string, _ json.RawMessage) (interface{}, error) {
	return withRepo(workPath, func(repo *core.Repository, _ string) (interface{}, error) {
		names, err := repo.ListBranches()
		if err != nil {
			return nil, fmt.Errorf("failed to list branches: %w", err)
		}
		currentBranch, _ := repo.Refs.GetCurrentBranch()
		branches := make([]map[string]interface{}, 0, len(names))
		for _, name := range names {
			commitHash, _ := repo.GetBranchHead(name)
			branches = append(branches, map[string]interface{}{
				"name":         name,
				"commit_hash":  commitHash,
				"created_at":   0,
				"is_current":   name == currentBranch,
			})
		}
		return map[string]interface{}{"branches": branches}, nil
	})
}

func handleBranchCreate(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		Name       string `json:"name"`
		CommitHash string `json:"commit_hash"`
	}
	if err := decodeArgs(args, &params); err != nil {
		return nil, err
	}
	if params.Name == "" {
		return nil, fmt.Errorf("branch name is required")
	}
	if !utils.IsValidBranchName(params.Name) {
		return nil, fmt.Errorf("invalid branch name")
	}

	_, err := withRepo(workPath, func(repo *core.Repository, repoPath string) (interface{}, error) {
		branches, err := repo.ListBranches()
		if err != nil {
			return nil, fmt.Errorf("failed to list branches: %w", err)
		}
		for _, b := range branches {
			if b == params.Name {
				return nil, fmt.Errorf("branch '%s' already exists", params.Name)
			}
		}
		commitHash := params.CommitHash
		if commitHash != "" {
			if _, err := repo.GetCommit(commitHash); err != nil {
				return nil, fmt.Errorf("commit not found: %s", commitHash)
			}
		} else {
			currentBranch, _ := repo.Refs.GetCurrentBranch()
			if currentBranch == "" {
				currentBranch = "main"
			}
			if detached, state, err := core.ReadDetachedHead(repoPath); err == nil && detached {
				commitHash = state.Commit
			} else {
				commitHash, err = repo.GetBranchHead(currentBranch)
				if err != nil || commitHash == "" {
					return nil, fmt.Errorf("no commits to branch from")
				}
			}
		}
		if err := repo.CreateBranch(params.Name, commitHash); err != nil {
			return nil, err
		}
		return successResult(), nil
	})
	return successResult(), err
}

func handleBranchDelete(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		Name string `json:"name"`
	}
	if err := decodeArgs(args, &params); err != nil {
		return nil, err
	}
	if params.Name == "" {
		return nil, fmt.Errorf("branch name is required")
	}
	if !utils.IsValidBranchName(params.Name) {
		return nil, fmt.Errorf("invalid branch name")
	}

	_, err := withRepo(workPath, func(repo *core.Repository, _ string) (interface{}, error) {
		currentBranch, err := repo.Refs.GetCurrentBranch()
		if err != nil || currentBranch == "" {
			currentBranch = "main"
		}
		if params.Name == currentBranch {
			return nil, fmt.Errorf("cannot delete current branch '%s'. Switch to another branch first", params.Name)
		}
		if err := repo.DeleteBranch(params.Name); err != nil {
			return nil, fmt.Errorf("failed to delete branch: %w", err)
		}
		return successResult(), nil
	})
	return successResult(), err
}

func handleBranchRename(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		OldName string `json:"old_name"`
		NewName string `json:"new_name"`
	}
	if err := decodeArgs(args, &params); err != nil {
		return nil, err
	}
	if params.OldName == "" || params.NewName == "" {
		return nil, fmt.Errorf("old_name and new_name are required")
	}
	if !utils.IsValidBranchName(params.NewName) {
		return nil, fmt.Errorf("invalid branch name")
	}

	_, err := withRepo(workPath, func(repo *core.Repository, _ string) (interface{}, error) {
		branches, err := repo.ListBranches()
		if err != nil {
			return nil, fmt.Errorf("failed to list branches: %w", err)
		}
		oldExists := false
		for _, branch := range branches {
			if branch == params.OldName {
				oldExists = true
			}
			if branch == params.NewName {
				return nil, fmt.Errorf("branch '%s' already exists", params.NewName)
			}
		}
		if !oldExists {
			return nil, fmt.Errorf("branch '%s' not found", params.OldName)
		}
		currentBranch, _ := repo.Refs.GetCurrentBranch()
		if currentBranch == "" {
			currentBranch = "main"
		}
		commitHash, _ := repo.GetBranchHead(params.OldName)
		if err := repo.DeleteBranch(params.OldName); err != nil {
			return nil, fmt.Errorf("failed to delete old branch: %w", err)
		}
		if err := repo.CreateBranch(params.NewName, commitHash); err != nil {
			return nil, fmt.Errorf("failed to create new branch: %w", err)
		}
		if params.OldName == currentBranch {
			if err := repo.Refs.SetCurrentBranch(params.NewName); err != nil {
				return nil, fmt.Errorf("failed to update current branch: %w", err)
			}
		}
		return successResult(), nil
	})
	return successResult(), err
}

func handleCommitGet(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		Hash string `json:"hash"`
	}
	if err := decodeArgs(args, &params); err != nil {
		return nil, err
	}
	if params.Hash == "" {
		return nil, fmt.Errorf("hash is required")
	}

	return withRepo(workPath, func(repo *core.Repository, repoPath string) (interface{}, error) {
		commit, err := repo.GetCommit(params.Hash)
		if err != nil {
			return nil, fmt.Errorf("failed to get commit: %w", err)
		}
		result := commitToMapWithRepo(repo, commit)
		if b64, err := readScreenshotBase64(repoPath, commit.ScreenshotPath); err == nil && b64 != "" {
			result["screenshot_base64"] = b64
		}
		return result, nil
	})
}

func readScreenshotBase64(repoPath, screenshotPath string) (string, error) {
	if screenshotPath == "" {
		return "", nil
	}
	abs := screenshotPath
	if !filepath.IsAbs(abs) {
		abs = filepath.Join(repoPath, filepath.FromSlash(screenshotPath))
	}
	info, err := os.Stat(abs)
	if err != nil || info.IsDir() {
		return "", err
	}
	if info.Size() > maxDiffBlobBytes {
		return "", fmt.Errorf("screenshot_too_large")
	}
	raw, err := os.ReadFile(abs)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(raw), nil
}
