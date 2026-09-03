package core

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/difference-machine/forester/internal/models"
	"github.com/difference-machine/forester/internal/utils"
)

// FileManifest stores scene object metadata for a file at a commit.
type FileManifest struct {
	FilePath   string          `json:"file_path"`
	CommitHash string          `json:"commit_hash"`
	EditorType string          `json:"editor_type,omitempty"`
	Objects    []models.Object `json:"objects"`
	UpdatedAt  int64           `json:"updated_at"`
}

// ManifestStore stores per-commit file manifests under .DFM/manifests/.
type ManifestStore struct {
	repoPath    string
	manifestDir string
}

// NewManifestStore creates a manifest store.
func NewManifestStore(repoPath string) *ManifestStore {
	return &ManifestStore{
		repoPath:    repoPath,
		manifestDir: filepath.Join(repoPath, ".DFM", "manifests"),
	}
}

func encodeManifestPath(filePath string) string {
	return EncodeStoragePath(filePath)
}

func safeManifestCommitDir(commitHash string) (string, error) {
	clean, err := utils.CleanRepoRelativePath(commitHash)
	if err != nil {
		return "", err
	}
	if clean != commitHash || strings.ContainsAny(clean, `/\`) {
		return "", fmt.Errorf("invalid commit hash path: %s", commitHash)
	}
	return clean, nil
}

func (m *ManifestStore) manifestPath(commitHash, filePath string) (string, error) {
	dir, err := safeManifestCommitDir(commitHash)
	if err != nil {
		return "", err
	}
	return filepath.Join(m.manifestDir, dir, encodeManifestPath(filePath)+".json"), nil
}

func (m *ManifestStore) legacyManifestPath(commitHash, filePath string) (string, error) {
	dir, err := safeManifestCommitDir(commitHash)
	if err != nil {
		return "", err
	}
	return filepath.Join(m.manifestDir, dir, legacyEncodeStoragePath(filePath)+".json"), nil
}

func (m *ManifestStore) load(commitHash, filePath string) (*FileManifest, error) {
	path, err := m.manifestPath(commitHash, filePath)
	if err != nil {
		return nil, err
	}
	if !utils.Exists(path) {
		if legacyPath, legacyErr := m.legacyManifestPath(commitHash, filePath); legacyErr == nil && utils.Exists(legacyPath) {
			path = legacyPath
		}
	}
	if !utils.Exists(path) {
		return &FileManifest{
			FilePath:   filepath.ToSlash(filePath),
			CommitHash: commitHash,
			Objects:    []models.Object{},
		}, nil
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var manifest FileManifest
	if err := json.Unmarshal(data, &manifest); err != nil {
		return nil, err
	}
	return &manifest, nil
}

func (m *ManifestStore) save(manifest *FileManifest) error {
	path, err := m.manifestPath(manifest.CommitHash, manifest.FilePath)
	if err != nil {
		return err
	}
	manifest.UpdatedAt = time.Now().Unix()
	data, err := json.MarshalIndent(manifest, "", "  ")
	if err != nil {
		return err
	}
	return utils.WithFileLock(path, func() error {
		if err := utils.EnsureDirectory(filepath.Dir(path)); err != nil {
			return err
		}
		return utils.WriteFileAtomic(path, data)
	})
}

func findObject(objects []models.Object, objectName string) (int, bool) {
	for i, obj := range objects {
		if obj.ObjectName == objectName {
			return i, true
		}
	}
	return -1, false
}

// AddObject adds or replaces an object in the commit manifest.
func (m *ManifestStore) AddObject(obj *models.Object) error {
	manifest, err := m.load(obj.CommitHash, obj.FilePath)
	if err != nil {
		return err
	}
	obj.FilePath = filepath.ToSlash(obj.FilePath)
	if obj.CreatedAt == 0 {
		obj.CreatedAt = time.Now().Unix()
	}
	obj.UpdatedAt = time.Now().Unix()
	if idx, ok := findObject(manifest.Objects, obj.ObjectName); ok {
		obj.ID = manifest.Objects[idx].ID
		if obj.ID == 0 {
			obj.ID = int64(idx + 1)
		}
		manifest.Objects[idx] = *obj
	} else {
		obj.ID = int64(len(manifest.Objects) + 1)
		manifest.Objects = append(manifest.Objects, *obj)
	}
	if manifest.EditorType == "" {
		manifest.EditorType = obj.EditorType
	}
	return m.save(manifest)
}

// GetObject returns one object from a commit manifest.
func (m *ManifestStore) GetObject(commitHash, filePath, objectName string) (*models.Object, error) {
	manifest, err := m.load(commitHash, filePath)
	if err != nil {
		return nil, err
	}
	for i := range manifest.Objects {
		if manifest.Objects[i].ObjectName == objectName {
			obj := manifest.Objects[i]
			return &obj, nil
		}
	}
	return nil, fmt.Errorf("object not found: %s/%s/%s", objectName, commitHash, filePath)
}

// DeleteObject removes one object from a manifest.
func (m *ManifestStore) DeleteObject(commitHash, filePath, objectName string) error {
	manifest, err := m.load(commitHash, filePath)
	if err != nil {
		return err
	}
	idx, ok := findObject(manifest.Objects, objectName)
	if !ok {
		return fmt.Errorf("object not found: %s/%s/%s", objectName, commitHash, filePath)
	}
	manifest.Objects = append(manifest.Objects[:idx], manifest.Objects[idx+1:]...)
	return m.save(manifest)
}

// DeleteObjectsByFile removes all objects for a file in a commit manifest.
func (m *ManifestStore) DeleteObjectsByFile(commitHash, filePath string) error {
	path, err := m.manifestPath(commitHash, filePath)
	if err != nil {
		return err
	}
	if !utils.Exists(path) {
		return fmt.Errorf("no objects found for file: %s/%s", commitHash, filePath)
	}
	return os.Remove(path)
}

// DeleteManifestsForCommit removes all manifest files for a commit.
func (m *ManifestStore) DeleteManifestsForCommit(commitHash string) error {
	commitDir, err := safeManifestCommitDir(commitHash)
	if err != nil {
		return err
	}
	dir := filepath.Join(m.manifestDir, commitDir)
	if !utils.Exists(dir) {
		return nil
	}
	return os.RemoveAll(dir)
}

// GetObjectsByCommit returns all objects across manifests for a commit.
func (m *ManifestStore) GetObjectsByCommit(commitHash string) ([]*models.Object, error) {
	commitDir, err := safeManifestCommitDir(commitHash)
	if err != nil {
		return nil, err
	}
	dir := filepath.Join(m.manifestDir, commitDir)
	if !utils.Exists(dir) {
		return []*models.Object{}, nil
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	var objects []*models.Object
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".json") {
			continue
		}
		data, err := os.ReadFile(filepath.Join(dir, entry.Name()))
		if err != nil {
			return nil, err
		}
		var manifest FileManifest
		if err := json.Unmarshal(data, &manifest); err != nil {
			return nil, err
		}
		for i := range manifest.Objects {
			obj := manifest.Objects[i]
			objects = append(objects, &obj)
		}
	}
	return objects, nil
}

// GetObjectsByFile returns objects for one file at a commit.
func (m *ManifestStore) GetObjectsByFile(commitHash, filePath string) ([]*models.Object, error) {
	manifest, err := m.load(commitHash, filePath)
	if err != nil {
		return nil, err
	}
	var objects []*models.Object
	for i := range manifest.Objects {
		obj := manifest.Objects[i]
		objects = append(objects, &obj)
	}
	if len(objects) > 0 {
		return objects, nil
	}
	return m.FindObjectsByFileAcrossCommits(filePath)
}

func manifestPathsMatch(stored, requested string) bool {
	return utils.NormalizeRepoRelPath(stored) == utils.NormalizeRepoRelPath(requested)
}

// EachObject visits every object in every commit manifest. Stop if fn returns false.
func (m *ManifestStore) EachObject(fn func(*models.Object) bool) error {
	if fn == nil || !utils.Exists(m.manifestDir) {
		return nil
	}
	commitDirs, err := os.ReadDir(m.manifestDir)
	if err != nil {
		return err
	}
	for _, commitEntry := range commitDirs {
		if !commitEntry.IsDir() {
			continue
		}
		dir := filepath.Join(m.manifestDir, commitEntry.Name())
		manifestFiles, err := os.ReadDir(dir)
		if err != nil {
			return err
		}
		for _, manifestFile := range manifestFiles {
			if manifestFile.IsDir() || !strings.HasSuffix(manifestFile.Name(), ".json") {
				continue
			}
			data, err := os.ReadFile(filepath.Join(dir, manifestFile.Name()))
			if err != nil {
				return err
			}
			var manifest FileManifest
			if err := json.Unmarshal(data, &manifest); err != nil {
				return err
			}
			for i := range manifest.Objects {
				obj := manifest.Objects[i]
				if !fn(&obj) {
					return nil
				}
			}
		}
	}
	return nil
}

// FindObjectsByFileAcrossCommits returns tagged objects for a file from any commit manifest.
// When the same object_name appears in multiple manifests, the newest updated_at wins.
func (m *ManifestStore) FindObjectsByFileAcrossCommits(filePath string) ([]*models.Object, error) {
	if !utils.Exists(m.manifestDir) {
		return []*models.Object{}, nil
	}
	commitDirs, err := os.ReadDir(m.manifestDir)
	if err != nil {
		return nil, err
	}

	byName := make(map[string]*models.Object)
	for _, commitEntry := range commitDirs {
		if !commitEntry.IsDir() {
			continue
		}
		dir := filepath.Join(m.manifestDir, commitEntry.Name())
		manifestFiles, err := os.ReadDir(dir)
		if err != nil {
			return nil, err
		}
		for _, manifestFile := range manifestFiles {
			if manifestFile.IsDir() || !strings.HasSuffix(manifestFile.Name(), ".json") {
				continue
			}
			data, err := os.ReadFile(filepath.Join(dir, manifestFile.Name()))
			if err != nil {
				return nil, err
			}
			var manifest FileManifest
			if err := json.Unmarshal(data, &manifest); err != nil {
				return nil, err
			}
			if !manifestPathsMatch(manifest.FilePath, filePath) {
				continue
			}
			for i := range manifest.Objects {
				obj := manifest.Objects[i]
				if len(obj.Tags) == 0 {
					continue
				}
				existing, ok := byName[obj.ObjectName]
				if !ok || obj.UpdatedAt > existing.UpdatedAt {
					copyObj := obj
					byName[obj.ObjectName] = &copyObj
				}
			}
		}
	}

	objects := make([]*models.Object, 0, len(byName))
	for _, obj := range byName {
		objects = append(objects, obj)
	}
	return objects, nil
}

// AddTagToObject adds a tag to an object.
func (m *ManifestStore) AddTagToObject(commitHash, filePath, objectName, tag string) error {
	obj, err := m.GetObject(commitHash, filePath, objectName)
	if err != nil {
		return err
	}
	for _, t := range obj.Tags {
		if t == tag {
			return nil
		}
	}
	obj.Tags = append(obj.Tags, tag)
	return m.AddObject(obj)
}

// RemoveTagFromObject removes a tag from an object.
func (m *ManifestStore) RemoveTagFromObject(commitHash, filePath, objectName, tag string) error {
	obj, err := m.GetObject(commitHash, filePath, objectName)
	if err != nil {
		return err
	}
	newTags := []string{}
	for _, t := range obj.Tags {
		if t != tag {
			newTags = append(newTags, t)
		}
	}
	obj.Tags = newTags
	return m.AddObject(obj)
}

// SetObjectMetadata sets metadata on an object.
func (m *ManifestStore) SetObjectMetadata(commitHash, filePath, objectName, key, value string) error {
	obj, err := m.GetObject(commitHash, filePath, objectName)
	if err != nil {
		return err
	}
	if obj.Metadata == nil {
		obj.Metadata = make(map[string]string)
	}
	obj.Metadata[key] = value
	return m.AddObject(obj)
}

// ManifestSidecarPath returns the sidecar path for a structured DCC file in the working tree.
func ManifestSidecarPath(filePath string, suffix string) string {
	if suffix == "" {
		suffix = ".manifest.json"
	}
	return filepath.ToSlash(filePath) + suffix
}
