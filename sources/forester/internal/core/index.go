package core

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/difference-machine/forester/internal/utils"
)

// Index represents the staging area (index)
type Index struct {
	repoPath  string
	indexPath string
	entries   map[string]string // path -> hash
}

const DeletedIndexHash = "DELETED"

func IsDeletedHash(hash string) bool {
	return hash == DeletedIndexHash
}

// NewIndex creates a new Index instance
func NewIndex(repoPath string) (*Index, error) {
	indexPath := filepath.Join(repoPath, ".DFM", "index")

	index := &Index{
		repoPath:  repoPath,
		indexPath: indexPath,
		entries:   make(map[string]string),
	}

	// Load existing index if it exists
	if utils.Exists(indexPath) {
		if err := index.Load(); err != nil {
			return nil, fmt.Errorf("failed to load index: %w", err)
		}
	}

	return index, nil
}

// Load loads the index from disk
func (idx *Index) Load() error {
	if !utils.Exists(idx.indexPath) {
		idx.entries = make(map[string]string)
		return nil
	}

	data, err := os.ReadFile(idx.indexPath)
	if err != nil {
		return fmt.Errorf("failed to read index: %w", err)
	}

	if len(data) == 0 {
		idx.entries = make(map[string]string)
		return nil
	}

	if err := json.Unmarshal(data, &idx.entries); err != nil {
		return fmt.Errorf("failed to parse index: %w", err)
	}

	return nil
}

// Save saves the index to disk
func (idx *Index) Save() error {
	if idx.entries == nil {
		idx.entries = make(map[string]string)
	}

	data, err := json.MarshalIndent(idx.entries, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal index: %w", err)
	}

	if err := utils.EnsureDirectory(filepath.Dir(idx.indexPath)); err != nil {
		return fmt.Errorf("failed to create index directory: %w", err)
	}

	if err := os.WriteFile(idx.indexPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write index: %w", err)
	}

	return nil
}

// Add adds a file to the index
func (idx *Index) Add(filePath string, hash string) error {
	if idx.entries == nil {
		idx.entries = make(map[string]string)
	}

	relPath, err := utils.GetRepoRelativePath(idx.repoPath, filePath)
	if err != nil {
		return fmt.Errorf("failed to get relative path: %w", err)
	}

	idx.entries[relPath] = hash
	return idx.Save()
}

// MarkDeleted stages a deletion for a tracked file.
func (idx *Index) MarkDeleted(filePath string) error {
	if idx.entries == nil {
		idx.entries = make(map[string]string)
	}

	if !filepath.IsAbs(filePath) {
		filePath = filepath.Join(idx.repoPath, filePath)
	}

	relPath, err := utils.GetRepoRelativePath(idx.repoPath, filePath)
	if err != nil {
		return fmt.Errorf("failed to get relative path: %w", err)
	}

	idx.entries[relPath] = DeletedIndexHash
	return idx.Save()
}

// Remove removes a file from the index
func (idx *Index) Remove(filePath string) error {
	if idx.entries == nil {
		return nil
	}

	relPath, err := utils.GetRepoRelativePath(idx.repoPath, filePath)
	if err != nil {
		// If we can't get relative path, try to find by absolute path
		for path := range idx.entries {
			if path == filePath || filepath.Join(idx.repoPath, path) == filePath {
				delete(idx.entries, path)
				return idx.Save()
			}
		}
		return nil
	}

	delete(idx.entries, relPath)
	return idx.Save()
}

// Clear clears all entries from the index
func (idx *Index) Clear() error {
	idx.entries = make(map[string]string)
	return idx.Save()
}

// GetEntries returns all entries in the index
func (idx *Index) GetEntries() map[string]string {
	if idx.entries == nil {
		return make(map[string]string)
	}

	// Return a copy to prevent external modifications
	result := make(map[string]string)
	for k, v := range idx.entries {
		result[k] = v
	}
	return result
}

// HasFile checks if a file is in the index
func (idx *Index) HasFile(filePath string) bool {
	if idx.entries == nil {
		return false
	}

	relPath, err := utils.GetRepoRelativePath(idx.repoPath, filePath)
	if err != nil {
		return false
	}

	_, exists := idx.entries[relPath]
	return exists
}

// GetHash returns the hash for a file in the index
func (idx *Index) GetHash(filePath string) (string, bool) {
	if idx.entries == nil {
		return "", false
	}

	relPath, err := utils.GetRepoRelativePath(idx.repoPath, filePath)
	if err != nil {
		return "", false
	}

	hash, exists := idx.entries[relPath]
	return hash, exists
}

// IsEmpty checks if the index is empty
func (idx *Index) IsEmpty() bool {
	return len(idx.entries) == 0
}
