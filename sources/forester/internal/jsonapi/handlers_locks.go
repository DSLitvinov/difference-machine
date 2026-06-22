package jsonapi

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/models"
)

func handleLockList(workPath string, _ json.RawMessage) (interface{}, error) {
	return withRepo(workPath, func(repo *core.Repository, repoPath string) (interface{}, error) {
		locking := core.NewLocking(repoPath)
		branch := currentBranch(repoPath)
		locks, err := locking.GetLocks(branch)
		if err != nil {
			return nil, err
		}
		out := make([]map[string]interface{}, 0, len(locks))
		for _, lock := range locks {
			out = append(out, map[string]interface{}{
				"file_path":  lock.FilePath,
				"user":       lock.User,
				"branch":     lock.Branch,
				"lock_type":  int(lock.LockType),
				"created_at": lock.CreatedAt,
				"expires_at": lock.ExpiresAt,
			})
		}
		_ = repo
		return map[string]interface{}{"locks": out}, nil
	})
}

func handleLockAcquire(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		FilePath    string `json:"file_path"`
		User        string `json:"user"`
		LockType    int    `json:"lock_type"`
		ExpireHours int    `json:"expire_hours"`
	}
	if err := decodeArgs(args, &params); err != nil {
		return nil, err
	}
	if params.FilePath == "" {
		return nil, fmt.Errorf("file_path is required")
	}
	user := params.User
	if user == "" {
		user = os.Getenv("USER")
		if user == "" {
			user = "Unknown"
		}
	}

	_, err := withRepo(workPath, func(_ *core.Repository, repoPath string) (interface{}, error) {
		locking := core.NewLocking(repoPath)
		branch := currentBranch(repoPath)
		lockType := models.LockTypeExclusive
		if params.LockType == int(models.LockTypeShared) {
			lockType = models.LockTypeShared
		}
		lock := models.NewLock(params.FilePath, user, branch, lockType)
		if params.ExpireHours > 0 {
			lock.ExpiresAt = lock.CreatedAt + int64(params.ExpireHours*3600)
		}
		acquired, err := locking.AcquireLock(lock)
		if err != nil {
			return nil, err
		}
		if !acquired {
			return nil, fmt.Errorf("failed to acquire lock. File may be already locked")
		}
		return successResult(), nil
	})
	return successResult(), err
}

func handleLockRelease(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		FilePath string `json:"file_path"`
		User     string `json:"user"`
	}
	if err := decodeArgs(args, &params); err != nil {
		return nil, err
	}
	if params.FilePath == "" {
		return nil, fmt.Errorf("file_path is required")
	}
	user := params.User
	if user == "" {
		user = os.Getenv("USER")
		if user == "" {
			user = "Unknown"
		}
	}

	_, err := withRepo(workPath, func(_ *core.Repository, repoPath string) (interface{}, error) {
		locking := core.NewLocking(repoPath)
		if err := locking.ReleaseLock(params.FilePath, user); err != nil {
			return nil, err
		}
		return successResult(), nil
	})
	return successResult(), err
}
