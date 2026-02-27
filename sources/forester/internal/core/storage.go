package core

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"

	"github.com/difference-machine/forester/internal/models"
	"github.com/difference-machine/forester/internal/utils"
)

// Storage manages the object storage for Forester repository.
// It handles storage and retrieval of blobs, trees, and commits
// using content-addressable storage with SHA-256 hashing.
type Storage struct {
	repoPath    string
	objectsPath string
}

// NewStorage creates a new Storage instance for the given repository path.
//
// Example:
//
//	storage, err := NewStorage("/path/to/repo")
func NewStorage(repoPath string) (*Storage, error) {
	objectsPath := filepath.Join(repoPath, ".DFM", "objects")
	if err := utils.EnsureDirectory(objectsPath); err != nil {
		return nil, fmt.Errorf("failed to create objects directory: %w", err)
	}

	return &Storage{
		repoPath:    repoPath,
		objectsPath: objectsPath,
	}, nil
}

// GetObjectsPath returns the path to objects directory
func (s *Storage) GetObjectsPath() string {
	return s.objectsPath
}

// GetBlobsPath returns the path to blobs directory
func (s *Storage) GetBlobsPath() string {
	return filepath.Join(s.objectsPath, "blobs", "sha256")
}

// GetCommitsPath returns the path to commits directory
func (s *Storage) GetCommitsPath() string {
	return filepath.Join(s.objectsPath, "commits", "sha256")
}

// GetTreesPath returns the path to trees directory
func (s *Storage) GetTreesPath() string {
	return filepath.Join(s.objectsPath, "trees", "sha256")
}

// hashToPath converts a hash to a directory path structure (ab/cdef...)
// Validates hash format to prevent path traversal
func (s *Storage) hashToPath(hash string) (string, error) {
	// Validate hash format to prevent path traversal
	if !utils.IsValidCommitHash(hash) {
		return "", fmt.Errorf("invalid hash format: %s", hash)
	}
	if len(hash) < 2 {
		return "", fmt.Errorf("hash too short")
	}

	prefix := hash[:2]
	suffix := hash[2:]
	return filepath.Join(prefix, suffix), nil
}

// StoreBlob stores a blob in the object storage and returns its SHA-256 hash.
// The blob is compressed before storage to save disk space.
// If a blob with the same hash already exists, it is not stored again (deduplication).
//
// Example:
//
//	hash, err := storage.StoreBlob([]byte("content"))
func (s *Storage) StoreBlob(content []byte) (string, error) {
	// Hash is computed from uncompressed data for proper deduplication
	hash := HashBytes(content)

	if s.BlobExists(hash) {
		return hash, nil // Deduplication
	}

	// Compress data before saving to save space
	compressed, err := Compress(content)
	if err != nil {
		return "", fmt.Errorf("failed to compress blob: %w", err)
	}

	blobPath, err := s.hashToPath(hash)
	if err != nil {
		return "", err
	}
	fullPath := filepath.Join(s.GetBlobsPath(), blobPath)

	if err := utils.EnsureDirectory(filepath.Dir(fullPath)); err != nil {
		return "", fmt.Errorf("failed to create blob directory: %w", err)
	}

	if err := utils.WriteFile(fullPath, compressed); err != nil {
		return "", fmt.Errorf("failed to write blob: %w", err)
	}

	return hash, nil
}

// StoreBlobFromFile stores a blob from a file and returns its hash.
// For files larger than MaxInMemoryFileSize, streaming compression is used
// to avoid loading the entire file into memory.
//
// Example:
//
//	hash, err := storage.StoreBlobFromFile("/path/to/file.txt")
func (s *Storage) StoreBlobFromFile(filePath string) (string, error) {
	if !utils.Exists(filePath) {
		return "", fmt.Errorf("file does not exist: %s", filePath)
	}

	// Hash is computed from original file (uncompressed)
	hash, err := HashFile(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to hash file: %w", err)
	}

	if s.BlobExists(hash) {
		return hash, nil // Deduplication
	}

	// Check file size for optimization
	info, err := os.Stat(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to stat file: %w", err)
	}

	// For large files, use streaming approach
	if info.Size() > MaxInMemoryFileSize {
		return s.storeBlobFromFileStreaming(filePath, hash)
	}

	// Read file content (for small files)
	content, err := utils.ReadFile(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to read file: %w", err)
	}

	// Compress and save
	compressed, err := Compress(content)
	if err != nil {
		return "", fmt.Errorf("failed to compress: %w", err)
	}

	blobPath, err := s.hashToPath(hash)
	if err != nil {
		return "", err
	}
	fullPath := filepath.Join(s.GetBlobsPath(), blobPath)

	if err := utils.EnsureDirectory(filepath.Dir(fullPath)); err != nil {
		return "", fmt.Errorf("failed to create blob directory: %w", err)
	}

	if err := utils.WriteFile(fullPath, compressed); err != nil {
		return "", fmt.Errorf("failed to write blob: %w", err)
	}

	return hash, nil
}

// storeBlobFromFileStreaming stores a large blob using streaming to avoid loading entire file into memory
func (s *Storage) storeBlobFromFileStreaming(filePath, hash string) (string, error) {
	// Open source file
	srcFile, err := os.Open(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to open file: %w", err)
	}
	defer srcFile.Close()

	// Get blob path
	blobPath, err := s.hashToPath(hash)
	if err != nil {
		return "", err
	}
	fullPath := filepath.Join(s.GetBlobsPath(), blobPath)

	// Ensure directory exists
	if err := utils.EnsureDirectory(filepath.Dir(fullPath)); err != nil {
		return "", fmt.Errorf("failed to create blob directory: %w", err)
	}

	// Create destination file
	dstFile, err := os.Create(fullPath)
	if err != nil {
		return "", fmt.Errorf("failed to create blob file: %w", err)
	}
	defer dstFile.Close()

	// Create compressor
	compressor := NewCompressor(dstFile)
	if compressor == nil {
		return "", fmt.Errorf("failed to create compressor")
	}

	// Stream file content through compressor
	_, err = io.Copy(compressor, srcFile)
	if err != nil {
		compressor.Close()
		return "", fmt.Errorf("failed to compress file: %w", err)
	}

	if err := compressor.Close(); err != nil {
		return "", fmt.Errorf("failed to finalize compression: %w", err)
	}

	return hash, nil
}

// GetBlobContent retrieves blob content by hash.
// The content is automatically decompressed if it was stored compressed.
//
// Example:
//
//	content, err := storage.GetBlobContent("abc123...")
func (s *Storage) GetBlobContent(hash string) ([]byte, error) {
	blobPath, err := s.hashToPath(hash)
	if err != nil {
		return nil, err
	}
	fullPath := filepath.Join(s.GetBlobsPath(), blobPath)

	if !utils.Exists(fullPath) {
		return nil, fmt.Errorf("blob not found: %s", hash)
	}

	compressed, err := utils.ReadFile(fullPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read blob: %w", err)
	}

	// Try to decompress (blobs are always stored compressed)
	// If decompression fails, return original content
	decompressed, err := Decompress(compressed)
	if err == nil {
		return decompressed, nil
	}

	// If decompression failed, return original (might be uncompressed blob)
	return compressed, nil
}

// GetBlobContentString retrieves blob content as string
func (s *Storage) GetBlobContentString(hash string) (string, error) {
	content, err := s.GetBlobContent(hash)
	if err != nil {
		return "", err
	}
	return string(content), nil
}

// BuildTreeMapRecursive builds a flat map of all files in a tree recursively.
// Returns an error if any sub-tree cannot be loaded or parsed.
func BuildTreeMapRecursive(storage *Storage, tree *models.Tree, prefix string, treeMap map[string]*models.TreeEntry) error {
	for _, entry := range tree.Entries {
		path := entry.Name
		if prefix != "" {
			path = filepath.Join(prefix, entry.Name)
		}
		// Normalize path separators
		path = filepath.ToSlash(path)

		if entry.Type == "blob" {
			treeMap[path] = entry
		} else if entry.Type == "tree" {
			// Recursively load and process sub-tree
			subTreeContent, err := storage.GetTreeContent(entry.Hash)
			if err != nil {
				return fmt.Errorf("get tree %s: %w", entry.Hash, err)
			}
			var subTree models.Tree
			if err := json.Unmarshal([]byte(subTreeContent), &subTree); err != nil {
				return fmt.Errorf("parse tree %s: %w", entry.Hash, err)
			}
			if err := BuildTreeMapRecursive(storage, &subTree, path, treeMap); err != nil {
				return err
			}
		}
	}
	return nil
}

// WriteBlobToFile writes blob content to a file
func (s *Storage) WriteBlobToFile(hash, filePath string) error {
	content, err := s.GetBlobContent(hash)
	if err != nil {
		return err
	}
	return utils.WriteFile(filePath, content)
}

// BlobExists checks if a blob exists
func (s *Storage) BlobExists(hash string) bool {
	blobPath, err := s.hashToPath(hash)
	if err != nil {
		return false
	}
	fullPath := filepath.Join(s.GetBlobsPath(), blobPath)
	return utils.Exists(fullPath)
}

// StoreTree stores a tree object
func (s *Storage) StoreTree(treeJSON string) (string, error) {
	hash := HashTree(treeJSON)

	if s.TreeExists(hash) {
		return hash, nil // Deduplication
	}

	treePath, err := s.hashToPath(hash)
	if err != nil {
		return "", err
	}
	fullPath := filepath.Join(s.GetTreesPath(), treePath)

	if err := utils.EnsureDirectory(filepath.Dir(fullPath)); err != nil {
		return "", fmt.Errorf("failed to create tree directory: %w", err)
	}

	if err := utils.WriteFileString(fullPath, treeJSON); err != nil {
		return "", fmt.Errorf("failed to write tree: %w", err)
	}

	return hash, nil
}

// GetTreeContent retrieves tree content
func (s *Storage) GetTreeContent(hash string) (string, error) {
	treePath, err := s.hashToPath(hash)
	if err != nil {
		return "", err
	}
	fullPath := filepath.Join(s.GetTreesPath(), treePath)

	if !utils.Exists(fullPath) {
		return "", fmt.Errorf("tree not found: %s", hash)
	}

	return utils.ReadFileString(fullPath)
}

// TreeExists checks if a tree exists
func (s *Storage) TreeExists(hash string) bool {
	treePath, err := s.hashToPath(hash)
	if err != nil {
		return false
	}
	fullPath := filepath.Join(s.GetTreesPath(), treePath)
	return utils.Exists(fullPath)
}

// StoreCommit stores a commit object
func (s *Storage) StoreCommit(commitJSON string) (string, error) {
	hash := HashString(commitJSON)

	if s.CommitExists(hash) {
		return hash, nil // Deduplication
	}

	commitPath, err := s.hashToPath(hash)
	if err != nil {
		return "", err
	}
	fullPath := filepath.Join(s.GetCommitsPath(), commitPath)

	if err := utils.EnsureDirectory(filepath.Dir(fullPath)); err != nil {
		return "", fmt.Errorf("failed to create commit directory: %w", err)
	}

	if err := utils.WriteFileString(fullPath, commitJSON); err != nil {
		return "", fmt.Errorf("failed to write commit: %w", err)
	}

	return hash, nil
}

// GetCommitContent retrieves commit content
func (s *Storage) GetCommitContent(hash string) (string, error) {
	commitPath, err := s.hashToPath(hash)
	if err != nil {
		return "", err
	}
	fullPath := filepath.Join(s.GetCommitsPath(), commitPath)

	if !utils.Exists(fullPath) {
		return "", fmt.Errorf("commit not found: %s", hash)
	}

	return utils.ReadFileString(fullPath)
}

// CommitExists checks if a commit exists
func (s *Storage) CommitExists(hash string) bool {
	commitPath, err := s.hashToPath(hash)
	if err != nil {
		return false
	}
	fullPath := filepath.Join(s.GetCommitsPath(), commitPath)
	return utils.Exists(fullPath)
}

// ObjectExists checks if any object exists (blob, tree, or commit)
func (s *Storage) ObjectExists(hash string) bool {
	return s.BlobExists(hash) || s.TreeExists(hash) || s.CommitExists(hash)
}

// GetRepoPath returns the repository path
func (s *Storage) GetRepoPath() string {
	return s.repoPath
}
