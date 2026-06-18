package core

import (
	"encoding/json"
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"github.com/difference-machine/forester/internal/models"
	"github.com/difference-machine/forester/internal/utils"
)

// Repository is the Git-like VCS layer: objects, refs, and filesystem reflog.
type Repository struct {
	Path    string
	Storage *Storage
	Refs    *Refs
	Reflog  *Reflog
	db      *Database
}

// OpenRepository opens a Forester repository.
func OpenRepository(repoPath string) (*Repository, error) {
	storage, err := NewStorage(repoPath)
	if err != nil {
		return nil, err
	}
	return &Repository{
		Path:    repoPath,
		Storage: storage,
		Refs:    NewRefs(repoPath),
		Reflog:  NewReflog(repoPath),
	}, nil
}

// DB opens the product metadata database (locks, reviews, objects, stashes).
func (r *Repository) DB() (*Database, error) {
	if r.db != nil {
		return r.db, nil
	}
	dbPath := filepath.Join(r.Path, ".DFM", "database.db")
	db, err := NewDatabase(dbPath)
	if err != nil {
		return nil, err
	}
	r.db = db
	return db, nil
}

// Close closes the product database if open.
func (r *Repository) Close() error {
	if r.db != nil {
		err := r.db.Close()
		r.db = nil
		return err
	}
	return nil
}

// GetCommit loads a commit from the object store.
func (r *Repository) GetCommit(hash string) (*models.Commit, error) {
	if hash == "" {
		return nil, &ErrCommitNotFound{Hash: hash}
	}
	content, err := r.Storage.GetCommitContent(hash)
	if err != nil {
		return nil, &ErrCommitNotFound{Hash: hash}
	}
	var commit models.Commit
	if err := json.Unmarshal([]byte(content), &commit); err != nil {
		return nil, fmt.Errorf("failed to parse commit %s: %w", hash, err)
	}
	if commit.Hash == "" {
		commit.Hash = hash
	}
	if len(commit.ParentHashes) == 0 && commit.ParentHash != "" {
		commit.ParentHashes = []string{commit.ParentHash}
	}
	if commit.ParentHash == "" && len(commit.ParentHashes) > 0 {
		commit.ParentHash = commit.ParentHashes[0]
	}
	return &commit, nil
}

// StoreCommit persists a commit object.
func (r *Repository) StoreCommit(commit *models.Commit) (string, error) {
	commitJSON, err := commit.ToJSON()
	if err != nil {
		return "", err
	}
	return r.Storage.StoreCommit(commitJSON)
}

// GetBranchHead returns the commit hash for a branch (refs are source of truth).
func (r *Repository) GetBranchHead(branch string) (string, error) {
	return r.Refs.GetHead(branch)
}

// SetBranchHead updates a branch ref and appends a reflog entry.
func (r *Repository) SetBranchHead(branch, newHash, oldHash string) error {
	if err := r.Refs.SetHead(branch, newHash); err != nil {
		return err
	}
	commitHash := newHash
	if commitHash == "" {
		commitHash = oldHash
	}
	return r.Reflog.Append(branch, commitHash, oldHash, newHash, "update")
}

// ListBranches returns branch names from refs.
func (r *Repository) ListBranches() ([]string, error) {
	return r.Refs.ListBranches()
}

// CreateBranch creates a branch ref.
func (r *Repository) CreateBranch(name, commitHash string) error {
	return r.Refs.CreateBranch(name, commitHash)
}

// DeleteBranch deletes a branch ref.
func (r *Repository) DeleteBranch(name string) error {
	return r.Refs.DeleteBranch(name)
}

// GetCommitHistory walks commit history from a branch HEAD.
func (r *Repository) GetCommitHistory(branch string, limit int) ([]*models.Commit, error) {
	if limit <= 0 {
		limit = DefaultCommitLimit
	}

	branchHead, err := r.GetBranchHead(branch)
	if err != nil || branchHead == "" {
		return []*models.Commit{}, nil
	}

	deletedCommits := make(map[string]bool)
	entries, err := r.Reflog.GetEntries("", 10000)
	if err == nil {
		for _, e := range entries {
			if e.Operation == "delete" {
				deletedCommits[e.CommitHash] = true
			}
		}
	}

	var commits []*models.Commit
	currentHash := branchHead
	for currentHash != "" && len(commits) < limit {
		if deletedCommits[currentHash] {
			commit, err := r.GetCommit(currentHash)
			if err != nil {
				break
			}
			currentHash = r.firstParent(commit)
			continue
		}

		commit, err := r.GetCommit(currentHash)
		if err != nil {
			break
		}
		commits = append(commits, commit)
		currentHash = r.firstParent(commit)
	}
	return commits, nil
}

func (r *Repository) firstParent(commit *models.Commit) string {
	if len(commit.ParentHashes) > 0 {
		return commit.ParentHashes[0]
	}
	return commit.ParentHash
}

// HasChildCommits checks whether any commit lists hash as a parent.
func (r *Repository) HasChildCommits(hash string) (bool, error) {
	children, err := r.GetChildCommits(hash)
	if err != nil {
		return false, err
	}
	return len(children) > 0, nil
}

// GetChildCommits returns child commit hashes.
func (r *Repository) GetChildCommits(hash string) ([]string, error) {
	var children []string
	err := r.Storage.ListObjects(func(objHash, objectType string) error {
		if objectType != ObjectTypeCommit {
			return nil
		}
		commit, err := r.GetCommit(objHash)
		if err != nil {
			return nil
		}
		for _, parent := range commit.ParentHashes {
			if parent == hash {
				children = append(children, objHash)
				return nil
			}
		}
		if commit.ParentHash == hash {
			children = append(children, objHash)
		}
		return nil
	})
	return children, err
}

// DeleteCommit marks a commit as deleted in the reflog.
func (r *Repository) DeleteCommit(hash string) error {
	return r.Reflog.MarkCommitDeleted(hash)
}

// ForceDeleteCommit removes a commit object from storage.
func (r *Repository) ForceDeleteCommit(hash string) error {
	return r.Storage.DeleteObject(hash)
}

// FindCommitByPrefix resolves a full or prefix hash.
func (r *Repository) FindCommitByPrefix(prefix string) (*models.Commit, error) {
	if utils.IsValidCommitHash(prefix) {
		return r.GetCommit(prefix)
	}
	if len(prefix) < 8 {
		return nil, &ErrCommitNotFound{Hash: prefix}
	}

	var found *models.Commit
	_ = r.Storage.ListObjects(func(hash, objectType string) error {
		if objectType != ObjectTypeCommit {
			return nil
		}
		if strings.HasPrefix(hash, prefix) {
			commit, err := r.GetCommit(hash)
			if err == nil {
				found = commit
				return fmt.Errorf("found") // stop walk
			}
		}
		return nil
	})
	if found != nil {
		return found, nil
	}
	return nil, &ErrCommitNotFound{Hash: prefix}
}

// CreateTag creates a lightweight or annotated tag.
func (r *Repository) CreateTag(tag *models.Tag, annotated bool) error {
	if annotated || tag.Message != "" {
		tagObj := map[string]interface{}{
			"name":        tag.Name,
			"target":      tag.CommitHash,
			"author":      tag.Author,
			"message":     tag.Message,
			"created_at":  tag.CreatedAt,
		}
		if tag.CreatedAt == 0 {
			tagObj["created_at"] = time.Now().Unix()
		}
		tagJSON, err := json.Marshal(tagObj)
		if err != nil {
			return err
		}
		tagHash, err := r.Storage.StoreTag(string(tagJSON))
		if err != nil {
			return err
		}
		return r.Refs.CreateTag(tag.Name, tagHash)
	}
	return r.Refs.CreateTag(tag.Name, tag.CommitHash)
}

// DeleteTag removes a tag ref.
func (r *Repository) DeleteTag(name string) error {
	return r.Refs.DeleteTag(name)
}

// ListTags lists all tags with resolved commit hashes.
func (r *Repository) ListTags() ([]*models.Tag, error) {
	names, err := r.Refs.ListTags()
	if err != nil {
		return nil, err
	}

	var tags []*models.Tag
	for _, name := range names {
		tag, err := r.GetTag(name)
		if err != nil {
			continue
		}
		tags = append(tags, tag)
	}
	return tags, nil
}

// GetTag resolves a tag by name.
func (r *Repository) GetTag(name string) (*models.Tag, error) {
	refHash, err := r.Refs.GetTag(name)
	if err != nil || refHash == "" {
		return nil, &ErrTagNotFound{Name: name}
	}

	// Annotated tag object.
	if r.Storage.TagExists(refHash) {
		content, err := r.Storage.GetTagContent(refHash)
		if err != nil {
			return nil, err
		}
		var raw map[string]interface{}
		if err := json.Unmarshal([]byte(content), &raw); err != nil {
			return nil, err
		}
		tag := &models.Tag{Name: name}
		if v, ok := raw["target"].(string); ok {
			tag.CommitHash = v
		}
		if v, ok := raw["author"].(string); ok {
			tag.Author = v
		}
		if v, ok := raw["message"].(string); ok {
			tag.Message = v
		}
		if v, ok := raw["created_at"].(float64); ok {
			tag.CreatedAt = int64(v)
		}
		return tag, nil
	}

	// Lightweight tag: ref points directly to commit.
	return &models.Tag{Name: name, CommitHash: refHash}, nil
}

// GetTagByCommitHash returns the first tag name pointing at a commit.
func (r *Repository) GetTagByCommitHash(commitHash string) (string, error) {
	tags, err := r.ListTags()
	if err != nil {
		return "", err
	}
	for _, tag := range tags {
		if tag.CommitHash == commitHash {
			return tag.Name, nil
		}
	}
	return "", nil
}

// TagExists checks if a tag name exists.
func (r *Repository) TagExists(name string) bool {
	_, err := r.Refs.GetTag(name)
	return err == nil
}

// CollectReferencedCommits returns all commit hashes reachable from refs.
func (r *Repository) CollectReferencedCommits() (map[string]bool, error) {
	referenced := make(map[string]bool)

	branches, err := r.ListBranches()
	if err != nil {
		return referenced, err
	}
	for _, branch := range branches {
		head, _ := r.GetBranchHead(branch)
		if head != "" {
			referenced[head] = true
		}
	}

	tagNames, err := r.Refs.ListTags()
	if err != nil {
		return referenced, err
	}
	for _, name := range tagNames {
		tag, err := r.GetTag(name)
		if err == nil && tag.CommitHash != "" {
			referenced[tag.CommitHash] = true
		}
	}
	return referenced, nil
}
