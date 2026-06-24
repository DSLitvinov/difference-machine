package jsonapi

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/difference-machine/forester/internal/commands"
	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/utils"
)

func readMergeState(repoPath string) (map[string]interface{}, bool, error) {
	mergeStatePath := filepath.Join(repoPath, ".DFM", "MERGE_HEAD")
	if !utils.Exists(mergeStatePath) {
		return nil, false, nil
	}
	data, err := os.ReadFile(mergeStatePath)
	if err != nil {
		return nil, false, err
	}
	var state map[string]interface{}
	if err := json.Unmarshal(data, &state); err != nil {
		return nil, false, err
	}
	return state, true, nil
}

func mergeConflictsPresent(state map[string]interface{}) bool {
	raw, ok := state["conflicts"]
	if !ok || raw == nil {
		return false
	}
	switch v := raw.(type) {
	case []interface{}:
		return len(v) > 0
	default:
		return false
	}
}

func handleMergeStatus(workPath string, _ json.RawMessage) (interface{}, error) {
	return withWorkDir(workPath, func() (interface{}, error) {
		repoPath, err := utils.FindRepositoryRoot(workPath)
		if err != nil {
			return map[string]interface{}{"in_progress": false}, nil
		}
		state, ok, err := readMergeState(repoPath)
		if err != nil {
			return nil, err
		}
		if !ok {
			return map[string]interface{}{"in_progress": false}, nil
		}
		return map[string]interface{}{
			"in_progress":   true,
			"branch":        state["branch"],
			"current_head":  state["current_head"],
			"target_head":   state["target_head"],
			"from":          state["current_head"],
			"to":            state["target_head"],
			"has_conflicts": mergeConflictsPresent(state),
		}, nil
	})
}

func handleMergeStart(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		Branch   string `json:"branch"`
		NoFF     bool   `json:"no_ff"`
		NoCommit bool   `json:"no_commit"`
	}
	if err := decodeArgs(args, &params); err != nil {
		return nil, err
	}
	if params.Branch == "" {
		return nil, fmt.Errorf("branch is required")
	}

	cmdArgs := make([]string, 0, 4)
	if params.NoFF {
		cmdArgs = append(cmdArgs, "--no-ff")
	}
	if params.NoCommit {
		cmdArgs = append(cmdArgs, "--no-commit")
	}
	cmdArgs = append(cmdArgs, params.Branch)

	_, err := withWorkDir(workPath, func() (interface{}, error) {
		if err := commands.Merge(cmdArgs); err != nil {
			return nil, err
		}
		return successResult(), nil
	})
	if err != nil {
		return nil, err
	}

	return mergeResultAfterCommand(workPath)
}

func handleMergeContinue(workPath string, _ json.RawMessage) (interface{}, error) {
	_, err := withWorkDir(workPath, func() (interface{}, error) {
		if err := commands.Merge([]string{"--continue"}); err != nil {
			return nil, err
		}
		return successResult(), nil
	})
	if err != nil {
		return nil, err
	}
	return mergeResultAfterCommand(workPath)
}

func handleMergeAbort(workPath string, _ json.RawMessage) (interface{}, error) {
	_, err := withWorkDir(workPath, func() (interface{}, error) {
		if err := commands.Merge([]string{"--abort"}); err != nil {
			return nil, err
		}
		return successResult(), nil
	})
	return successResult(), err
}

func mergeResultAfterCommand(workPath string) (interface{}, error) {
	return withRepo(workPath, func(repo *core.Repository, _ string) (interface{}, error) {
		branch, _ := repo.Refs.GetCurrentBranch()
		if branch == "" {
			branch = "main"
		}
		head, err := repo.GetBranchHead(branch)
		if err != nil {
			return nil, err
		}
		repoPath, err := utils.FindRepositoryRoot(workPath)
		if err != nil {
			return map[string]interface{}{
				"success": true,
				"hash":    head,
			}, nil
		}
		state, inProgress, err := readMergeState(repoPath)
		if err != nil {
			return nil, err
		}
		out := map[string]interface{}{
			"success":     true,
			"hash":        head,
			"in_progress": inProgress,
		}
		if inProgress {
			out["has_conflicts"] = mergeConflictsPresent(state)
		}
		return out, nil
	})
}
