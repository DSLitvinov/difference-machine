package jsonapi

import (
	"encoding/json"
	"fmt"

	"github.com/difference-machine/forester/internal/commands"
	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/utils"
)

func handleReflogGet(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		Ref   string `json:"ref"`
		Limit int    `json:"limit"`
	}
	_ = decodeArgs(args, &params)
	limit := params.Limit
	if limit <= 0 {
		limit = 100
	}

	return withRepo(workPath, func(repo *core.Repository, _ string) (interface{}, error) {
		entries, err := repo.Reflog.GetEntries(params.Ref, limit)
		if err != nil {
			return nil, fmt.Errorf("failed to get reflog: %w", err)
		}
		out := make([]map[string]interface{}, 0, len(entries))
		for _, entry := range entries {
			hash := entry.CommitHash
			exists := false
			if hash != "" {
				_, err := repo.GetCommit(hash)
				exists = err == nil
			}
			out = append(out, map[string]interface{}{
				"commit_hash": hash,
				"ref_name":    entry.RefName,
				"ref_type":    entry.RefType,
				"old_value":   entry.OldValue,
				"new_value":   entry.NewValue,
				"operation":   entry.Operation,
				"timestamp":   entry.Timestamp,
				"exists":      exists,
			})
		}
		return map[string]interface{}{"entries": out}, nil
	})
}

func handleReflogRestore(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		CommitHash string `json:"commit_hash"`
	}
	if err := decodeArgs(args, &params); err != nil {
		return nil, err
	}
	if params.CommitHash == "" {
		return nil, fmt.Errorf("commit_hash is required")
	}

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

		if _, err := repo.GetCommit(params.CommitHash); err != nil {
			return nil, fmt.Errorf("commit not found: %s", params.CommitHash)
		}
		if _, err := repo.Reflog.RestoreCommit(params.CommitHash); err != nil {
			return nil, fmt.Errorf("failed to restore commit: %w", err)
		}
		if err := commands.Reset([]string{"--mixed", params.CommitHash}); err != nil {
			return nil, err
		}
		return successResult(), nil
	})
}
