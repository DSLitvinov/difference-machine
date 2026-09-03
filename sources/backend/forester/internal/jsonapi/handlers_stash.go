package jsonapi

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/difference-machine/forester/internal/commands"
	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/models"
	"github.com/difference-machine/forester/internal/utils"
)

const autoStashMessagePrefix = "Auto-stash: switching from "

func handleStashList(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		Branch string `json:"branch"`
	}
	_ = decodeArgs(args, &params)

	return withRepo(workPath, func(repo *core.Repository, repoPath string) (interface{}, error) {
		branch := strings.TrimSpace(params.Branch)
		if branch == "" {
			branch, _ = repo.Refs.GetCurrentBranch()
		}
		stashes, err := repo.Stash.ListStashes()
		if err != nil {
			return nil, fmt.Errorf("failed to list stashes: %w", err)
		}
		byHash := autoStashBranchIndex(repoPath)
		out := make([]map[string]interface{}, 0, len(stashes))
		for _, stash := range stashes {
			if stash == nil {
				continue
			}
			stashBranch := resolveStashBranch(stash, byHash)
			if branch != "" && stashBranch != "" && stashBranch != branch {
				continue
			}
			out = append(out, map[string]interface{}{
				"hash":       stash.Hash,
				"message":    stash.Message,
				"tree_hash":  stash.TreeHash,
				"branch":     stashBranch,
				"created_at": stash.CreatedAt,
			})
		}
		return map[string]interface{}{"stashes": out}, nil
	})
}

func handleStashApply(workPath string, args json.RawMessage) (interface{}, error) {
	hash, err := stashHashArg(args)
	if err != nil {
		return nil, err
	}
	return withRepo(workPath, func(repo *core.Repository, repoPath string) (interface{}, error) {
		resolved, err := repo.Stash.ResolveHash(hash)
		if err != nil {
			return nil, err
		}
		stash, err := repo.Stash.GetStash(resolved)
		if err != nil {
			return nil, fmt.Errorf("failed to get stash: %w", err)
		}
		if err := core.RestoreTreeToWorkdir(repo.Storage, repoPath, stash.TreeHash); err != nil {
			return nil, fmt.Errorf("failed to restore stash: %w", err)
		}
		return successResult(), nil
	})
}

func handleStashDrop(workPath string, args json.RawMessage) (interface{}, error) {
	hash, err := stashHashArg(args)
	if err != nil {
		return nil, err
	}
	return withRepo(workPath, func(repo *core.Repository, repoPath string) (interface{}, error) {
		resolved, err := repo.Stash.ResolveHash(hash)
		if err != nil {
			return nil, err
		}
		if err := repo.Stash.DeleteStash(resolved); err != nil {
			return nil, fmt.Errorf("failed to drop stash: %w", err)
		}
		commands.ForgetAutoStash(repoPath, resolved)
		return successResult(), nil
	})
}

func stashHashArg(args json.RawMessage) (string, error) {
	var params struct {
		Hash string `json:"hash"`
	}
	if err := decodeArgs(args, &params); err != nil {
		return "", err
	}
	if strings.TrimSpace(params.Hash) == "" {
		return "", fmt.Errorf("hash is required")
	}
	return params.Hash, nil
}

func resolveStashBranch(stash *models.Stash, byHash map[string]string) string {
	if stash.Branch != "" {
		return stash.Branch
	}
	if branch := byHash[stash.Hash]; branch != "" {
		return branch
	}
	if strings.HasPrefix(stash.Message, autoStashMessagePrefix) {
		return strings.TrimSpace(strings.TrimPrefix(stash.Message, autoStashMessagePrefix))
	}
	return ""
}

func autoStashBranchIndex(repoPath string) map[string]string {
	out := make(map[string]string)
	dir := filepath.Join(repoPath, ".DFM", "auto-stash")
	if !utils.Exists(dir) {
		return out
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return out
	}
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		data, err := os.ReadFile(filepath.Join(dir, entry.Name()))
		if err != nil {
			continue
		}
		var stack struct {
			Stashes []string `json:"stashes"`
		}
		if err := json.Unmarshal(data, &stack); err != nil {
			hash := strings.TrimSpace(string(data))
			if hash != "" {
				out[hash] = entry.Name()
			}
			continue
		}
		for _, hash := range stack.Stashes {
			if hash != "" {
				out[hash] = entry.Name()
			}
		}
	}
	return out
}
