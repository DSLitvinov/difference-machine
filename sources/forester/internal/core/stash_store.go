package core

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/difference-machine/forester/internal/models"
	"github.com/difference-machine/forester/internal/utils"
)

// StashStore persists stash metadata on the filesystem.
type StashStore struct {
	repoPath string
	stashDir string
}

// NewStashStore creates a stash store for the repository.
func NewStashStore(repoPath string) *StashStore {
	return &StashStore{
		repoPath: repoPath,
		stashDir: filepath.Join(repoPath, ".DFM", "stash"),
	}
}

func (s *StashStore) stashPath(hash string) string {
	return filepath.Join(s.stashDir, hash+".json")
}

// CreateStash writes stash metadata to .DFM/stash/<hash>.json.
func (s *StashStore) CreateStash(stash *models.Stash) (string, error) {
	if stash.Hash == "" {
		return "", fmt.Errorf("stash hash is required")
	}
	if err := utils.EnsureDirectory(s.stashDir); err != nil {
		return "", err
	}
	data, err := json.MarshalIndent(stash, "", "  ")
	if err != nil {
		return "", fmt.Errorf("marshal stash: %w", err)
	}
	if err := utils.WriteFile(s.stashPath(stash.Hash), data); err != nil {
		return "", fmt.Errorf("write stash: %w", err)
	}
	return stash.Hash, nil
}

// GetStash loads stash metadata by hash.
func (s *StashStore) GetStash(hash string) (*models.Stash, error) {
	path := s.stashPath(hash)
	if !utils.Exists(path) {
		return nil, fmt.Errorf("stash not found: %s", hash)
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read stash: %w", err)
	}
	var stash models.Stash
	if err := json.Unmarshal(data, &stash); err != nil {
		return nil, fmt.Errorf("parse stash: %w", err)
	}
	return &stash, nil
}

// ListStashes returns all stashes sorted by created_at descending.
func (s *StashStore) ListStashes() ([]*models.Stash, error) {
	if !utils.Exists(s.stashDir) {
		return []*models.Stash{}, nil
	}
	entries, err := os.ReadDir(s.stashDir)
	if err != nil {
		return nil, fmt.Errorf("list stash dir: %w", err)
	}
	var stashes []*models.Stash
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".json") {
			continue
		}
		data, err := os.ReadFile(filepath.Join(s.stashDir, entry.Name()))
		if err != nil {
			return nil, fmt.Errorf("read stash %s: %w", entry.Name(), err)
		}
		var stash models.Stash
		if err := json.Unmarshal(data, &stash); err != nil {
			return nil, fmt.Errorf("parse stash %s: %w", entry.Name(), err)
		}
		stashCopy := stash
		stashes = append(stashes, &stashCopy)
	}
	sort.Slice(stashes, func(i, j int) bool {
		return stashes[i].CreatedAt > stashes[j].CreatedAt
	})
	return stashes, nil
}

// DeleteStash removes stash metadata.
func (s *StashStore) DeleteStash(hash string) error {
	path := s.stashPath(hash)
	if !utils.Exists(path) {
		return fmt.Errorf("stash not found: %s", hash)
	}
	return os.Remove(path)
}
