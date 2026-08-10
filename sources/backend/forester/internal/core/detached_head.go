package core

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"

	"github.com/difference-machine/forester/internal/utils"
)

const detachedHeadFile = "DETACHED_HEAD"

// DetachedHeadState records a detached checkout commit and the symbolic branch name.
type DetachedHeadState struct {
	Commit string `json:"commit"`
	Branch string `json:"branch"`
}

func detachedHeadPath(repoPath string) string {
	return filepath.Join(repoPath, ".DFM", detachedHeadFile)
}

// ReadDetachedHead reports whether the repository is in detached HEAD state.
func ReadDetachedHead(repoPath string) (bool, DetachedHeadState, error) {
	path := detachedHeadPath(repoPath)
	if !utils.Exists(path) {
		return false, DetachedHeadState{}, nil
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return false, DetachedHeadState{}, err
	}
	var state DetachedHeadState
	if err := json.Unmarshal(data, &state); err != nil {
		return false, DetachedHeadState{}, err
	}
	state.Commit = strings.TrimSpace(state.Commit)
	state.Branch = strings.TrimSpace(state.Branch)
	if state.Commit == "" {
		return false, DetachedHeadState{}, nil
	}
	return true, state, nil
}

// WriteDetachedHead stores detached HEAD state for the repository.
func WriteDetachedHead(repoPath, commitHash, branch string) error {
	state := DetachedHeadState{
		Commit: strings.TrimSpace(commitHash),
		Branch: strings.TrimSpace(branch),
	}
	if state.Commit == "" {
		return ClearDetachedHead(repoPath)
	}
	raw, err := json.Marshal(state)
	if err != nil {
		return err
	}
	return utils.WriteFileString(detachedHeadPath(repoPath), string(raw)+"\n")
}

// ClearDetachedHead removes detached HEAD state.
func ClearDetachedHead(repoPath string) error {
	path := detachedHeadPath(repoPath)
	if !utils.Exists(path) {
		return nil
	}
	return os.Remove(path)
}
