package core

import (
	"fmt"
	"path/filepath"
	"strings"

	"github.com/difference-machine/forester/internal/utils"
)

// Refs manages Git-like refs (branches, tags, HEAD) stored in the filesystem.
// Refs provide a lightweight way to reference commits without storing them in the database.
type Refs struct {
	repoPath string
}

// NewRefs creates a new Refs instance for the given repository path.
//
// Example:
//
//	refs := NewRefs("/path/to/repo")
func NewRefs(repoPath string) *Refs {
	return &Refs{repoPath: repoPath}
}

// SetHead sets the HEAD commit of a branch
func (r *Refs) SetHead(branch, commitHash string) error {
	refPath, err := r.getRefPath("heads/" + branch)
	if err != nil {
		return fmt.Errorf("invalid branch name: %w", err)
	}
	return r.writeRef(refPath, commitHash)
}

// GetHead gets the HEAD commit of a branch
func (r *Refs) GetHead(branch string) (string, error) {
	refPath, err := r.getRefPath("heads/" + branch)
	if err != nil {
		return "", fmt.Errorf("invalid branch name: %w", err)
	}
	return r.readRef(refPath)
}

// CreateBranch creates a branch ref
func (r *Refs) CreateBranch(name, commitHash string) error {
	refPath, err := r.getRefPath("heads/" + name)
	if err != nil {
		return fmt.Errorf("invalid branch name: %w", err)
	}
	if utils.Exists(refPath) {
		return fmt.Errorf("branch already exists: %s", name)
	}
	return r.writeRef(refPath, commitHash)
}

// DeleteBranch deletes a branch ref
func (r *Refs) DeleteBranch(name string) error {
	refPath, err := r.getRefPath("heads/" + name)
	if err != nil {
		return fmt.Errorf("invalid branch name: %w", err)
	}
	if utils.Exists(refPath) {
		return utils.RemoveRecursive(refPath)
	}
	return nil
}

// ListBranches lists all branches
func (r *Refs) ListBranches() ([]string, error) {
	headsDir := filepath.Join(r.repoPath, ".DFM", "refs", "heads")
	if !utils.Exists(headsDir) {
		return []string{}, nil
	}

	files, err := utils.ListFiles(headsDir, false)
	if err != nil {
		return nil, err
	}

	var branches []string
	for _, file := range files {
		if utils.IsFile(file) {
			branches = append(branches, utils.GetFilename(file))
		}
	}

	return branches, nil
}

// CreateTag creates a tag ref
func (r *Refs) CreateTag(name, commitHash string) error {
	refPath, err := r.getRefPath("tags/" + name)
	if err != nil {
		return fmt.Errorf("invalid tag name: %w", err)
	}
	if utils.Exists(refPath) {
		return fmt.Errorf("tag already exists: %s", name)
	}
	return r.writeRef(refPath, commitHash)
}

// DeleteTag deletes a tag ref
func (r *Refs) DeleteTag(name string) error {
	refPath, err := r.getRefPath("tags/" + name)
	if err != nil {
		return fmt.Errorf("invalid tag name: %w", err)
	}
	if utils.Exists(refPath) {
		return utils.RemoveRecursive(refPath)
	}
	return nil
}

// GetTag gets the commit hash for a tag
func (r *Refs) GetTag(name string) (string, error) {
	refPath, err := r.getRefPath("tags/" + name)
	if err != nil {
		return "", fmt.Errorf("invalid tag name: %w", err)
	}
	return r.readRef(refPath)
}

// ListTags lists all tags
func (r *Refs) ListTags() ([]string, error) {
	tagsDir := filepath.Join(r.repoPath, ".DFM", "refs", "tags")
	if !utils.Exists(tagsDir) {
		return []string{}, nil
	}

	files, err := utils.ListFiles(tagsDir, false)
	if err != nil {
		return nil, err
	}

	var tags []string
	for _, file := range files {
		if utils.IsFile(file) {
			tags = append(tags, utils.GetFilename(file))
		}
	}

	return tags, nil
}

// GetCurrentBranch gets the current branch name from HEAD
func (r *Refs) GetCurrentBranch() (string, error) {
	headPath := filepath.Join(r.repoPath, ".DFM", "HEAD")
	if !utils.Exists(headPath) {
		return "main", nil // Default branch
	}

	content, err := utils.ReadFileString(headPath)
	if err != nil {
		return "", err
	}

	// HEAD format: ref: refs/heads/branch_name
	content = strings.TrimSpace(content)
	if strings.HasPrefix(content, "ref: refs/heads/") {
		return strings.TrimPrefix(content, "ref: refs/heads/"), nil
	}

	return "", nil
}

// SetCurrentBranch sets the current branch name in HEAD
func (r *Refs) SetCurrentBranch(branch string) error {
	headPath := filepath.Join(r.repoPath, ".DFM", "HEAD")
	content := fmt.Sprintf("ref: refs/heads/%s\n", branch)
	return utils.WriteFileString(headPath, content)
}

// getRefPath returns the full path to a ref file with validation
func (r *Refs) getRefPath(refName string) (string, error) {
	baseDir := filepath.Join(r.repoPath, ".DFM", "refs")
	return utils.ValidateRefPath(baseDir, refName)
}

// writeRef writes a commit hash to a ref file
func (r *Refs) writeRef(refPath, commitHash string) error {
	dir := filepath.Dir(refPath)
	if err := utils.EnsureDirectory(dir); err != nil {
		return fmt.Errorf("failed to create ref directory: %w", err)
	}
	return utils.WriteFileString(refPath, commitHash+"\n")
}

// readRef reads a commit hash from a ref file
func (r *Refs) readRef(refPath string) (string, error) {
	if !utils.Exists(refPath) {
		return "", nil
	}

	content, err := utils.ReadFileString(refPath)
	if err != nil {
		return "", err
	}

	// Remove whitespace
	content = strings.TrimSpace(content)
	return content, nil
}


