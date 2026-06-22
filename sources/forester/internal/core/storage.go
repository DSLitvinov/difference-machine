package core

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/difference-machine/forester/internal/models"
	"github.com/difference-machine/forester/internal/utils"
)

// Storage manages the unified Git-like object store for a Forester repository.
type Storage struct {
	repoPath    string
	objectsPath string
}

// NewStorage creates a new Storage instance for the given repository path.
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

// GetObjectsPath returns the path to the unified objects directory.
func (s *Storage) GetObjectsPath() string {
	return s.objectsPath
}

func (s *Storage) hashToPath(hash string) (string, error) {
	if !utils.IsValidCommitHash(hash) {
		return "", fmt.Errorf("invalid hash format: %s", hash)
	}
	if len(hash) < 2 {
		return "", fmt.Errorf("hash too short")
	}
	return filepath.Join(hash[:2], hash[2:]), nil
}

func (s *Storage) objectPath(hash string) (string, error) {
	rel, err := s.hashToPath(hash)
	if err != nil {
		return "", err
	}
	return filepath.Join(s.objectsPath, rel), nil
}

func (s *Storage) writeObject(objectType, hash string, payload []byte) error {
	fullPath, err := s.objectPath(hash)
	if err != nil {
		return err
	}
	if err := utils.EnsureDirectory(filepath.Dir(fullPath)); err != nil {
		return fmt.Errorf("failed to create object directory: %w", err)
	}
	if err := utils.WriteFile(fullPath, encodeObject(objectType, payload)); err != nil {
		return fmt.Errorf("failed to write object: %w", err)
	}
	return nil
}

func (s *Storage) readObject(hash string) (objectType string, payload []byte, err error) {
	fullPath, err := s.objectPath(hash)
	if err != nil {
		return "", nil, err
	}
	if !utils.Exists(fullPath) {
		return "", nil, &ErrObjectNotFound{Hash: hash}
	}
	data, err := utils.ReadFile(fullPath)
	if err != nil {
		return "", nil, fmt.Errorf("failed to read object: %w", err)
	}
	return decodeObject(data)
}

func (s *Storage) objectExists(hash string) bool {
	fullPath, err := s.objectPath(hash)
	if err != nil {
		return false
	}
	return utils.Exists(fullPath)
}

// StoreBlob stores a blob and returns its SHA-256 hash.
func (s *Storage) StoreBlob(content []byte) (string, error) {
	hash := HashBytes(content)
	if s.BlobExists(hash) {
		return hash, nil
	}

	compressed, err := Compress(content)
	if err != nil {
		return "", fmt.Errorf("failed to compress blob: %w", err)
	}
	if err := s.writeObject(ObjectTypeBlob, hash, compressed); err != nil {
		return "", err
	}
	return hash, nil
}

// StoreBlobFromFile stores a blob from a file and returns its hash.
func (s *Storage) StoreBlobFromFile(filePath string) (string, error) {
	if !utils.Exists(filePath) {
		return "", fmt.Errorf("file does not exist: %s", filePath)
	}

	hash, err := HashFile(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to hash file: %w", err)
	}
	if s.BlobExists(hash) {
		return hash, nil
	}

	info, err := os.Stat(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to stat file: %w", err)
	}
	if info.Size() > MaxInMemoryFileSize {
		return s.storeBlobFromFileStreaming(filePath, hash)
	}

	content, err := utils.ReadFile(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to read file: %w", err)
	}
	compressed, err := Compress(content)
	if err != nil {
		return "", fmt.Errorf("failed to compress: %w", err)
	}
	if err := s.writeObject(ObjectTypeBlob, hash, compressed); err != nil {
		return "", err
	}
	return hash, nil
}

func (s *Storage) storeBlobFromFileStreaming(filePath, hash string) (string, error) {
	srcFile, err := os.Open(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to open file: %w", err)
	}
	defer srcFile.Close()

	fullPath, err := s.objectPath(hash)
	if err != nil {
		return "", err
	}
	if err := utils.EnsureDirectory(filepath.Dir(fullPath)); err != nil {
		return "", fmt.Errorf("failed to create object directory: %w", err)
	}

	dstFile, err := os.Create(fullPath)
	if err != nil {
		return "", fmt.Errorf("failed to create object file: %w", err)
	}
	defer dstFile.Close()

	if _, err := dstFile.WriteString(ObjectTypeBlob + "\n"); err != nil {
		return "", err
	}

	compressor := NewCompressor(dstFile)
	if compressor == nil {
		return "", fmt.Errorf("failed to create compressor")
	}
	if _, err := io.Copy(compressor, srcFile); err != nil {
		compressor.Close()
		_ = os.Remove(fullPath)
		return "", fmt.Errorf("failed to compress file: %w", err)
	}
	if err := compressor.Close(); err != nil {
		_ = os.Remove(fullPath)
		return "", fmt.Errorf("failed to finalize compression: %w", err)
	}
	return hash, nil
}

// GetBlobContent retrieves blob content by hash.
func (s *Storage) GetBlobContent(hash string) ([]byte, error) {
	objectType, payload, err := s.readObject(hash)
	if err != nil {
		return nil, err
	}
	if objectType != ObjectTypeBlob {
		return nil, fmt.Errorf("object %s is not a blob (type %s)", hash, objectType)
	}

	decompressed, err := Decompress(payload)
	if err != nil {
		if IsCompressed(payload) {
			return nil, fmt.Errorf("failed to decompress blob %s: %w", hash, err)
		}
		return payload, nil
	}
	return decompressed, nil
}

// GetBlobContentString retrieves blob content as string.
func (s *Storage) GetBlobContentString(hash string) (string, error) {
	content, err := s.GetBlobContent(hash)
	if err != nil {
		return "", err
	}
	return string(content), nil
}

// WriteBlobToFile writes blob content to a file.
func (s *Storage) WriteBlobToFile(hash, filePath string) error {
	content, err := s.GetBlobContent(hash)
	if err != nil {
		return err
	}
	return utils.WriteFile(filePath, content)
}

// BlobExists checks if a blob exists.
func (s *Storage) BlobExists(hash string) bool {
	if !s.objectExists(hash) {
		return false
	}
	objectType, _, err := s.readObject(hash)
	return err == nil && objectType == ObjectTypeBlob
}

// StoreTree stores a tree object.
func (s *Storage) StoreTree(treeJSON string) (string, error) {
	hash := HashTree(treeJSON)
	if s.TreeExists(hash) {
		return hash, nil
	}
	if err := s.writeObject(ObjectTypeTree, hash, []byte(treeJSON)); err != nil {
		return "", err
	}
	return hash, nil
}

// GetTreeContent retrieves tree content.
func (s *Storage) GetTreeContent(hash string) (string, error) {
	objectType, payload, err := s.readObject(hash)
	if err != nil {
		return "", err
	}
	if objectType != ObjectTypeTree {
		return "", fmt.Errorf("object %s is not a tree (type %s)", hash, objectType)
	}
	return string(payload), nil
}

// TreeExists checks if a tree exists.
func (s *Storage) TreeExists(hash string) bool {
	if !s.objectExists(hash) {
		return false
	}
	objectType, _, err := s.readObject(hash)
	return err == nil && objectType == ObjectTypeTree
}

// StoreCommit stores a commit object at the commit hash.
func (s *Storage) StoreCommit(commitJSON string) (string, error) {
	var commit models.Commit
	if err := json.Unmarshal([]byte(commitJSON), &commit); err != nil {
		return "", fmt.Errorf("invalid commit JSON: %w", err)
	}

	hash := commit.Hash
	if hash == "" {
		hash = HashCommitJSON(commitJSON)
		commit.Hash = hash
		var err error
		commitJSON, err = commit.ToJSON()
		if err != nil {
			return "", err
		}
	}

	if s.CommitExists(hash) {
		return hash, nil
	}
	if err := s.writeObject(ObjectTypeCommit, hash, []byte(commitJSON)); err != nil {
		return "", err
	}
	return hash, nil
}

// GetCommitContent retrieves commit JSON content.
func (s *Storage) GetCommitContent(hash string) (string, error) {
	objectType, payload, err := s.readObject(hash)
	if err != nil {
		return "", err
	}
	if objectType != ObjectTypeCommit {
		return "", fmt.Errorf("object %s is not a commit (type %s)", hash, objectType)
	}
	return string(payload), nil
}

// CommitExists checks if a commit exists.
func (s *Storage) CommitExists(hash string) bool {
	if !s.objectExists(hash) {
		return false
	}
	objectType, _, err := s.readObject(hash)
	return err == nil && objectType == ObjectTypeCommit
}

// StoreTag stores an annotated tag object.
func (s *Storage) StoreTag(tagJSON string) (string, error) {
	hash := HashString(tagJSON)
	if s.TagExists(hash) {
		return hash, nil
	}
	if err := s.writeObject(ObjectTypeTag, hash, []byte(tagJSON)); err != nil {
		return "", err
	}
	return hash, nil
}

// GetTagContent retrieves tag JSON content.
func (s *Storage) GetTagContent(hash string) (string, error) {
	objectType, payload, err := s.readObject(hash)
	if err != nil {
		return "", err
	}
	if objectType != ObjectTypeTag {
		return "", fmt.Errorf("object %s is not a tag (type %s)", hash, objectType)
	}
	return string(payload), nil
}

// TagExists checks if a tag object exists.
func (s *Storage) TagExists(hash string) bool {
	if !s.objectExists(hash) {
		return false
	}
	objectType, _, err := s.readObject(hash)
	return err == nil && objectType == ObjectTypeTag
}

// ObjectExists checks if any object exists at the hash.
func (s *Storage) ObjectExists(hash string) bool {
	return s.objectExists(hash)
}

// DeleteObject removes an object from the store.
func (s *Storage) DeleteObject(hash string) error {
	fullPath, err := s.objectPath(hash)
	if err != nil {
		return err
	}
	if !utils.Exists(fullPath) {
		return nil
	}
	return os.Remove(fullPath)
}

// ListObjects walks the object store and calls fn for each object.
func (s *Storage) ListObjects(fn func(hash, objectType string) error) error {
	if !utils.Exists(s.objectsPath) {
		return nil
	}
	return filepath.Walk(s.objectsPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return err
		}
		rel, err := filepath.Rel(s.objectsPath, path)
		if err != nil {
			return nil
		}
		rel = filepath.ToSlash(rel)
		parts := strings.Split(rel, "/")
		if len(parts) != 2 || len(parts[0])+len(parts[1]) != 64 {
			return nil
		}
		hash := parts[0] + parts[1]
		objectType, _, readErr := s.readObject(hash)
		if readErr != nil {
			return nil
		}
		return fn(hash, objectType)
	})
}

// BuildTreeMapRecursive builds a flat map of all files in a tree recursively.
func BuildTreeMapRecursive(storage *Storage, tree *models.Tree, prefix string, treeMap map[string]*models.TreeEntry) error {
	for _, entry := range tree.Entries {
		path := entry.Name
		if prefix != "" {
			path = filepath.Join(prefix, entry.Name)
		}
		path = filepath.ToSlash(path)

		if entry.Type == "blob" {
			treeMap[path] = entry
		} else if entry.Type == "tree" {
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

// GetRepoPath returns the repository path.
func (s *Storage) GetRepoPath() string {
	return s.repoPath
}
