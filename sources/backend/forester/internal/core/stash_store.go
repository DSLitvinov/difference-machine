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
	path := s.stashPath(stash.Hash)
	if err := utils.WithFileLock(path, func() error {
		return utils.WriteFileAtomic(path, data)
	}); err != nil {
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

// ResolveHash resolves a full stash hash from a full or prefix hash.
func (s *StashStore) ResolveHash(prefix string) (string, error) {
	if utils.IsValidCommitHash(prefix) {
		if _, err := s.GetStash(prefix); err == nil {
			return prefix, nil
		}
	}
	stashes, err := s.ListStashes()
	if err != nil {
		return "", err
	}
	var matches []string
	for _, stash := range stashes {
		if strings.HasPrefix(stash.Hash, prefix) {
			matches = append(matches, stash.Hash)
		}
	}
	switch len(matches) {
	case 0:
		return "", fmt.Errorf("stash not found: %s", prefix)
	case 1:
		return matches[0], nil
	default:
		return "", &ErrAmbiguousStashPrefix{Prefix: prefix}
	}
}

// DeleteStash removes stash metadata.
func (s *StashStore) DeleteStash(hash string) error {
	path := s.stashPath(hash)
	if !utils.Exists(path) {
		return fmt.Errorf("stash not found: %s", hash)
	}
	return os.Remove(path)
}
