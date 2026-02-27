package core

import (
	"path/filepath"

	"github.com/difference-machine/forester/internal/models"
)

// Locking manages file locks
type Locking struct {
	repoPath string
}

// NewLocking creates a new Locking instance
func NewLocking(repoPath string) *Locking {
	return &Locking{repoPath: repoPath}
}

// AcquireLock acquires a file lock
func (l *Locking) AcquireLock(lock *models.Lock) (bool, error) {
	dbPath := filepath.Join(l.repoPath, ".DFM", "database.db")
	db, err := NewDatabase(dbPath)
	if err != nil {
		return false, err
	}
	defer db.Close()

	return db.AcquireLock(lock)
}

// ReleaseLock releases a file lock
func (l *Locking) ReleaseLock(filePath, user string) error {
	dbPath := filepath.Join(l.repoPath, ".DFM", "database.db")
	db, err := NewDatabase(dbPath)
	if err != nil {
		return err
	}
	defer db.Close()

	return db.ReleaseLock(filePath, user)
}

// GetLocks gets locks for a branch
func (l *Locking) GetLocks(branch string) ([]*models.Lock, error) {
	dbPath := filepath.Join(l.repoPath, ".DFM", "database.db")
	db, err := NewDatabase(dbPath)
	if err != nil {
		return nil, err
	}
	defer db.Close()

	return db.GetLocks(branch)
}

// IsLocked checks if a file is locked
func (l *Locking) IsLocked(filePath string) (bool, error) {
	dbPath := filepath.Join(l.repoPath, ".DFM", "database.db")
	db, err := NewDatabase(dbPath)
	if err != nil {
		return false, err
	}
	defer db.Close()

	return db.IsLocked(filePath)
}


