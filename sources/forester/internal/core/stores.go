package core

import "github.com/difference-machine/forester/internal/models"

// StashService reads and writes stash metadata.
type StashService interface {
	GetStash(hash string) (*models.Stash, error)
	ListStashes() ([]*models.Stash, error)
	ResolveHash(prefix string) (string, error)
	CreateStash(stash *models.Stash) (string, error)
	DeleteStash(hash string) error
}

// ManifestService manages per-commit DCC object manifests.
type ManifestService interface {
	GetObject(commitHash, filePath, objectName string) (*models.Object, error)
	GetObjectsByCommit(commitHash string) ([]*models.Object, error)
	GetObjectsByFile(commitHash, filePath string) ([]*models.Object, error)
	FindObjectsByFileAcrossCommits(filePath string) ([]*models.Object, error)
	AddObject(obj *models.Object) error
	DeleteObject(commitHash, filePath, objectName string) error
	DeleteObjectsByFile(commitHash, filePath string) error
	DeleteManifestsForCommit(commitHash string) error
	AddTagToObject(commitHash, filePath, objectName, tag string) error
	RemoveTagFromObject(commitHash, filePath, objectName, tag string) error
	SetObjectMetadata(commitHash, filePath, objectName, key, value string) error
}

// ReviewService manages asset review metadata.
type ReviewService interface {
	GetComments(assetType, assetID string) ([]*models.Comment, error)
	GetApprovals(assetType, assetID string) ([]*models.Approval, error)
	CreateComment(comment *models.Comment) (int, error)
	ResolveComment(commentID int) error
	CreateApproval(approval *models.Approval) error
}

// LockService manages collaborative file locks.
type LockService interface {
	AcquireLock(lock *models.Lock) (bool, error)
	ReleaseLock(filePath, user string) error
	GetLocks(branch string) ([]*models.Lock, error)
	IsLocked(filePath string) (bool, error)
	CleanupExpiredLocks() error
	Close() error
}

// Compile-time interface checks.
var (
	_ StashService     = (*StashStore)(nil)
	_ ManifestService  = (*ManifestStore)(nil)
	_ ReviewService    = (*ReviewStore)(nil)
	_ LockService      = (*Locking)(nil)
)
