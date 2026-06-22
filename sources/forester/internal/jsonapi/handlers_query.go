package jsonapi

import (
	"encoding/json"
	"fmt"

	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/utils"
)

func handleLogGet(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		Branch   string `json:"branch"`
		MaxCount int    `json:"max_count"`
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
		commits, err := repo.GetCommitHistory(branchName, limit)
		if err != nil {
			return nil, fmt.Errorf("failed to get commit history: %w", err)
		}
		out := make([]map[string]interface{}, 0, len(commits))
		for _, c := range commits {
			out = append(out, map[string]interface{}{
				"hash":            c.Hash,
				"parent_hash":     c.ParentHash,
				"parent_hashes":   c.ParentHashes,
				"tree_hash":       c.TreeHash,
				"author":          c.Author,
				"message":         c.Message,
				"timestamp":       c.Timestamp,
				"type":            c.Type,
				"screenshot_path": c.ScreenshotPath,
			})
		}
		return map[string]interface{}{"commits": out}, nil
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

	_, err := withRepo(workPath, func(repo *core.Repository, _ string) (interface{}, error) {
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
			commitHash, err = repo.GetBranchHead(currentBranch)
			if err != nil || commitHash == "" {
				return nil, fmt.Errorf("no commits to branch from")
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

	return withRepo(workPath, func(repo *core.Repository, _ string) (interface{}, error) {
		commit, err := repo.GetCommit(params.Hash)
		if err != nil {
			return nil, fmt.Errorf("failed to get commit: %w", err)
		}
		return map[string]interface{}{
			"hash":            commit.Hash,
			"parent_hash":     commit.ParentHash,
			"parent_hashes":   commit.ParentHashes,
			"tree_hash":       commit.TreeHash,
			"author":          commit.Author,
			"message":         commit.Message,
			"timestamp":       commit.Timestamp,
			"type":            commit.Type,
			"screenshot_path": commit.ScreenshotPath,
		}, nil
	})
}
