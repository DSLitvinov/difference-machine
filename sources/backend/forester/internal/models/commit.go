package models

import (
	"encoding/json"
	"time"
)

// CommitType represents the type of commit
type CommitType int

const (
	CommitTypeProject CommitType = iota
)

// Commit represents a commit in the repository
type Commit struct {
	Hash          string     `json:"hash"`
	ParentHash    string     `json:"parent_hash"`    // First parent (for backward compatibility)
	ParentHashes  []string   `json:"parent_hashes"` // All parents (for merge commits)
	TreeHash      string     `json:"tree_hash"`
	Author        string     `json:"author"`
	Message       string     `json:"message"`
	Timestamp     int64      `json:"timestamp"`
	Type          CommitType `json:"type"`
	ScreenshotPath string    `json:"screenshot_path,omitempty"`
}

// NewCommit creates a new commit with default values
func NewCommit() *Commit {
	return &Commit{
		Timestamp: time.Now().Unix(),
		Type:      CommitTypeProject,
	}
}

// ToJSON converts commit to JSON string
func (c *Commit) ToJSON() (string, error) {
	data, err := json.Marshal(c)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// FromJSON creates a commit from JSON string
func (c *Commit) FromJSON(jsonStr string) error {
	return json.Unmarshal([]byte(jsonStr), c)
}

// Branch represents a branch in the repository
type Branch struct {
	Name       string `json:"name"`
	CommitHash string `json:"commit_hash"`
	CreatedAt  int64  `json:"created_at"`
}

// NewBranch creates a new branch with default values
func NewBranch(name, commitHash string) *Branch {
	return &Branch{
		Name:       name,
		CommitHash: commitHash,
		CreatedAt:  time.Now().Unix(),
	}
}

// Tag represents a tag in the repository
type Tag struct {
	Name       string `json:"name"`
	CommitHash string `json:"commit_hash"`
	Author     string `json:"author"`
	Message    string `json:"message"`
	CreatedAt  int64  `json:"created_at"`
}

// NewTag creates a new tag with default values
func NewTag(name, commitHash, author, message string) *Tag {
	return &Tag{
		Name:       name,
		CommitHash: commitHash,
		Author:     author,
		Message:    message,
		CreatedAt:  time.Now().Unix(),
	}
}

// Stash represents a stash entry
type Stash struct {
	Hash      string `json:"hash"`
	Message   string `json:"message"`
	TreeHash  string `json:"tree_hash"`
	CreatedAt int64  `json:"created_at"`
}

// NewStash creates a new stash with default values
func NewStash(message, treeHash string) *Stash {
	return &Stash{
		Message:   message,
		TreeHash:  treeHash,
		CreatedAt: time.Now().Unix(),
	}
}

// LockType represents the type of lock
type LockType int

const (
	LockTypeExclusive LockType = iota
	LockTypeShared
)

// Lock represents a file lock
type Lock struct {
	FilePath   string   `json:"file_path"`
	User       string   `json:"user"`
	Branch     string   `json:"branch"`
	LockType   LockType `json:"lock_type"`
	CreatedAt  int64    `json:"created_at"`
	ExpiresAt  int64    `json:"expires_at"` // 0 = never expires
}

// NewLock creates a new lock with default values
func NewLock(filePath, user, branch string, lockType LockType) *Lock {
	return &Lock{
		FilePath:  filePath,
		User:      user,
		Branch:    branch,
		LockType:  lockType,
		CreatedAt: time.Now().Unix(),
		ExpiresAt: 0,
	}
}

// IsExpired checks if the lock has expired
func (l *Lock) IsExpired() bool {
	if l.ExpiresAt == 0 {
		return false
	}
	return time.Now().Unix() > l.ExpiresAt
}

// Comment represents a comment on an asset
type Comment struct {
	ID        int     `json:"id"`
	AssetType string  `json:"asset_type"` // "mesh", "blob", "commit"
	AssetID   string  `json:"asset_id"`
	Author    string  `json:"author"`
	Content   string  `json:"content"`
	X         float64 `json:"x"` // Coordinates for 3D content
	Y         float64 `json:"y"`
	CreatedAt int64   `json:"created_at"`
	Resolved  bool    `json:"resolved"`
}

// NewComment creates a new comment with default values
func NewComment(assetType, assetID, author, content string, x, y float64) *Comment {
	return &Comment{
		AssetType: assetType,
		AssetID:   assetID,
		Author:    author,
		Content:   content,
		X:         x,
		Y:         y,
		CreatedAt: time.Now().Unix(),
		Resolved:  false,
	}
}

// ApprovalStatus represents the status of an approval
type ApprovalStatus string

const (
	ApprovalStatusPending  ApprovalStatus = "pending"
	ApprovalStatusApproved ApprovalStatus = "approved"
	ApprovalStatusRejected ApprovalStatus = "rejected"
)

// Approval represents an approval for an asset
type Approval struct {
	ID        int            `json:"id"`
	AssetType string         `json:"asset_type"`
	AssetID   string         `json:"asset_id"`
	Author    string         `json:"author"`
	Status    ApprovalStatus `json:"status"`
	Comment   string         `json:"comment"`
	CreatedAt int64          `json:"created_at"`
}

// NewApproval creates a new approval with default values
func NewApproval(assetType, assetID, author string, status ApprovalStatus, comment string) *Approval {
	return &Approval{
		AssetType: assetType,
		AssetID:   assetID,
		Author:    author,
		Status:    status,
		Comment:   comment,
		CreatedAt: time.Now().Unix(),
	}
}

// ReflogEntry represents an entry in the reflog
type ReflogEntry struct {
	ID         int    `json:"id"`
	CommitHash string `json:"commit_hash"`
	RefName    string `json:"ref_name"`  // "HEAD", "branch_name", "tag_name"
	RefType    string `json:"ref_type"`  // "HEAD", "branch", "tag"
	OldValue   string `json:"old_value"` // Old value (can be empty for new commits)
	NewValue   string `json:"new_value"` // New value (can be empty for deletions)
	Operation  string `json:"operation"` // "create", "update", "delete"
	Timestamp  int64  `json:"timestamp"`
}

// NewReflogEntry creates a new reflog entry with default values
func NewReflogEntry(commitHash, refName, refType, oldValue, newValue, operation string) *ReflogEntry {
	return &ReflogEntry{
		CommitHash: commitHash,
		RefName:    refName,
		RefType:    refType,
		OldValue:   oldValue,
		NewValue:   newValue,
		Operation:  operation,
		Timestamp:  time.Now().Unix(),
	}
}

// Object represents an object in the repository (for Mark To system)
type Object struct {
	ID          int64                  `json:"id"`
	EditorType  string                 `json:"editor_type"`  // 'blender', 'other_editor', etc.
	FilePath    string                 `json:"file_path"`    // relative path to file
	ObjectName  string                 `json:"object_name"`  // name of object
	ObjectType  string                 `json:"object_type"` // 'MESH', 'LIGHT', 'CAMERA', etc.
	CommitHash  string                 `json:"commit_hash"` // commit this object belongs to
	ObjectData  map[string]interface{} `json:"object_data"` // JSON metadata (matrix, bbox, v_count)
	Tags        []string               `json:"tags"`        // JSON array of tags
	Metadata    map[string]string      `json:"metadata"`   // JSON additional data
	CreatedAt   int64                  `json:"created_at"`
	UpdatedAt   int64                  `json:"updated_at"`
}

// NewObject creates a new object with default values
func NewObject(editorType, filePath, objectName, objectType, commitHash string) *Object {
	return &Object{
		EditorType: editorType,
		FilePath:   filePath,
		ObjectName: objectName,
		ObjectType: objectType,
		CommitHash: commitHash,
		ObjectData: make(map[string]interface{}),
		Tags:       []string{},
		Metadata:   make(map[string]string),
		CreatedAt:  time.Now().Unix(),
		UpdatedAt:  time.Now().Unix(),
	}
}

