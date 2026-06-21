package core

import (
	"path/filepath"

	"github.com/difference-machine/forester/internal/models"
)

// Locking manages file locks
type Locking struct {
	repoPath string
	db       *Database
}

// NewLocking creates a new Locking instance
func NewLocking(repoPath string) *Locking {
	return &Locking{repoPath: repoPath}
}

func (l *Locking) getDB() (*Database, error) {
	if l.db != nil {
		return l.db, nil
	}
	dbPath := filepath.Join(l.repoPath, ".DFM", "database.db")
	db, err := NewDatabase(dbPath)
	if err != nil {
		return nil, err
	}
	l.db = db
	return db, nil
}

// Close closes the cached database connection.
func (l *Locking) Close() error {
	if l.db != nil {
		err := l.db.Close()
		l.db = nil
		return err
	}
	return nil
}

// AcquireLock acquires a file lock
func (l *Locking) AcquireLock(lock *models.Lock) (bool, error) {
	db, err := l.getDB()
	if err != nil {
		return false, err
	}
	return db.AcquireLock(lock)
}

// ReleaseLock releases a file lock
func (l *Locking) ReleaseLock(filePath, user string) error {
	db, err := l.getDB()
	if err != nil {
		return err
	}
	return db.ReleaseLock(filePath, user)
}

// GetLocks gets locks for a branch
func (l *Locking) GetLocks(branch string) ([]*models.Lock, error) {
	db, err := l.getDB()
	if err != nil {
		return nil, err
	}
	return db.GetLocks(branch)
}

// IsLocked checks if a file is locked
func (l *Locking) IsLocked(filePath string) (bool, error) {
	db, err := l.getDB()
	if err != nil {
		return false, err
	}
	return db.IsLocked(filePath)
}
