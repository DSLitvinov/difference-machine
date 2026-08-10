package commands

import (
	"path/filepath"

	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/utils"
)

// stageDfmignoreForCommit always includes the root .dfmignore in the commit when present on disk.
func stageDfmignoreForCommit(repoPath string, index *core.Index, storage *core.Storage) error {
	fullPath := filepath.Join(repoPath, utils.DfmignoreRelPath)
	if !utils.Exists(fullPath) {
		return nil
	}
	hash, err := core.HashFile(fullPath)
	if err != nil {
		return err
	}
	if _, err := storage.StoreBlobFromFile(fullPath); err != nil {
		return err
	}
	return index.Add(fullPath, hash)
}
