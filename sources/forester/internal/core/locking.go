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

// Locking manages file locks stored as JSON files under .DFM/locks/.
type Locking struct {
	repoPath string
	locksDir string
}

// NewLocking creates a new Locking instance.
func NewLocking(repoPath string) *Locking {
	return &Locking{
		repoPath: repoPath,
		locksDir: filepath.Join(repoPath, ".DFM", "locks"),
	}
}

// Close is a no-op for file-based locks (kept for API compatibility).
func (l *Locking) Close() error {
	return nil
}

func encodeLockPath(filePath string) string {
	return strings.ReplaceAll(filepath.ToSlash(filePath), "/", "__")
}

func (l *Locking) lockFilePath(branch, filePath string) string {
	return filepath.Join(l.locksDir, branch, encodeLockPath(filePath)+".lock")
}

func (l *Locking) readLock(path string) (*models.Lock, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var lock models.Lock
	if err := json.Unmarshal(data, &lock); err != nil {
		return nil, err
	}
	return &lock, nil
}

func (l *Locking) writeLock(path string, lock *models.Lock) error {
	if err := utils.EnsureDirectory(filepath.Dir(path)); err != nil {
		return err
	}
	data, err := json.MarshalIndent(lock, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

// AcquireLock acquires a file lock using exclusive file creation.
func (l *Locking) AcquireLock(lock *models.Lock) (bool, error) {
	path := l.lockFilePath(lock.Branch, lock.FilePath)
	if err := utils.EnsureDirectory(filepath.Dir(path)); err != nil {
		return false, err
	}
	if utils.Exists(path) {
		existing, err := l.readLock(path)
		if err != nil {
			return false, fmt.Errorf("read existing lock: %w", err)
		}
		if existing.IsExpired() {
			if err := os.Remove(path); err != nil {
				return false, err
			}
		} else {
			return false, nil
		}
	}
	f, err := os.OpenFile(path, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0644)
	if err != nil {
		if os.IsExist(err) {
			return false, nil
		}
		return false, fmt.Errorf("acquire lock: %w", err)
	}
	f.Close()
	if err := l.writeLock(path, lock); err != nil {
		_ = os.Remove(path)
		return false, err
	}
	return true, nil
}

// ReleaseLock releases a file lock for the given user.
func (l *Locking) ReleaseLock(filePath, user string) error {
	refs := NewRefs(l.repoPath)
	branch, err := refs.GetCurrentBranch()
	if err != nil || branch == "" {
		branch = "main"
	}
	path := l.lockFilePath(branch, filePath)
	if !utils.Exists(path) {
		return nil
	}
	lock, err := l.readLock(path)
	if err != nil {
		return err
	}
	if lock.User != user {
		return fmt.Errorf("lock held by %s", lock.User)
	}
	return os.Remove(path)
}

// GetLocks returns active locks for a branch.
func (l *Locking) GetLocks(branch string) ([]*models.Lock, error) {
	dir := filepath.Join(l.locksDir, branch)
	if !utils.Exists(dir) {
		return []*models.Lock{}, nil
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	var locks []*models.Lock
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".lock") {
			continue
		}
		lock, err := l.readLock(filepath.Join(dir, entry.Name()))
		if err != nil {
			continue
		}
		if lock.IsExpired() {
			_ = os.Remove(filepath.Join(dir, entry.Name()))
			continue
		}
		locks = append(locks, lock)
	}
	return locks, nil
}

// IsLocked checks if a file is locked on the current branch.
func (l *Locking) IsLocked(filePath string) (bool, error) {
	refs := NewRefs(l.repoPath)
	branch, err := refs.GetCurrentBranch()
	if err != nil || branch == "" {
		branch = "main"
	}
	path := l.lockFilePath(branch, filePath)
	if !utils.Exists(path) {
		return false, nil
	}
	lock, err := l.readLock(path)
	if err != nil {
		return false, err
	}
	if lock.IsExpired() {
		_ = os.Remove(path)
		return false, nil
	}
	return true, nil
}

// CleanupExpiredLocks removes expired lock files for all branches.
func (l *Locking) CleanupExpiredLocks() error {
	if !utils.Exists(l.locksDir) {
		return nil
	}
	branches, err := os.ReadDir(l.locksDir)
	if err != nil {
		return err
	}
	now := time.Now().Unix()
	for _, branchEntry := range branches {
		if !branchEntry.IsDir() {
			continue
		}
		lockDir := filepath.Join(l.locksDir, branchEntry.Name())
		files, err := os.ReadDir(lockDir)
		if err != nil {
			continue
		}
		for _, file := range files {
			if file.IsDir() {
				continue
			}
			path := filepath.Join(lockDir, file.Name())
			lock, err := l.readLock(path)
			if err != nil {
				continue
			}
			if lock.ExpiresAt > 0 && lock.ExpiresAt <= now {
				_ = os.Remove(path)
			}
		}
	}
	return nil
}
