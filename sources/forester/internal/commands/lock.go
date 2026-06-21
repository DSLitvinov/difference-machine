package commands

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/models"
	"github.com/difference-machine/forester/internal/utils"
)

// Lock manages file locks
func Lock(args []string) error {
	repoPath, err := utils.FindRepositoryRoot(".")
	if err != nil {
		return fmt.Errorf("not a Forester repository")
	}

	locking := core.NewLocking(repoPath)
	defer locking.Close()
	refs := core.NewRefs(repoPath)

	if len(args) == 0 || args[0] == "list" {
		if len(args) > 1 {
			return fmt.Errorf("usage: lock [list]")
		}
		// List locks
		branch, err := refs.GetCurrentBranch()
		if err != nil || branch == "" {
			branch = "main"
		}

		locks, err := locking.GetLocks(branch)
		if err != nil {
			return fmt.Errorf("failed to get locks: %w", err)
		}

		if len(locks) == 0 {
			fmt.Println("No locks found")
			return nil
		}

		fmt.Println("Locks:")
		for _, lock := range locks {
			lockTypeStr := "exclusive"
			if lock.LockType == models.LockTypeShared {
				lockTypeStr = "shared"
			}
			fmt.Printf("  %s (%s) by %s", lock.FilePath, lockTypeStr, lock.User)
			if lock.ExpiresAt > 0 {
				t := time.Unix(lock.ExpiresAt, 0)
				fmt.Printf(" expires: %s", t.Format("2006-01-02 15:04:05"))
			}
			fmt.Println()
		}
		return nil
	}

	command := args[0]

	if command == "unlock" || command == "-u" {
		// Release lock
		if len(args) < 2 {
			return fmt.Errorf("file path required")
		}
		if len(args) > 2 {
			return fmt.Errorf("usage: lock unlock <file>")
		}

		filePath := args[1]
		user := "Unknown"
		if envUser := os.Getenv("USER"); envUser != "" {
			user = envUser
		}

		if err := locking.ReleaseLock(filePath, user); err != nil {
			return fmt.Errorf("failed to release lock: %w", err)
		}

		fmt.Printf("Released lock on %s\n", filePath)
		return nil
	}

	// Create lock
	filePath := command
	if strings.HasPrefix(filePath, "-") {
		return fmt.Errorf("file path required")
	}
	exclusive := true
	expireHours := 0
	seenExclusive := false
	seenShared := false

	for i := 1; i < len(args); i++ {
		if args[i] == "--shared" || args[i] == "-s" {
			exclusive = false
			seenShared = true
		} else if args[i] == "--exclusive" || args[i] == "-e" {
			exclusive = true
			seenExclusive = true
		} else if args[i] == "--expire" && i+1 < len(args) {
			hours, err := strconv.Atoi(args[i+1])
			if err != nil {
				return fmt.Errorf("invalid expire hours: %w", err)
			}
			expireHours = hours
			i++
		} else if strings.HasPrefix(args[i], "-") {
			return fmt.Errorf("unknown flag: %s", args[i])
		} else {
			return fmt.Errorf("unexpected argument: %s", args[i])
		}
	}
	if seenExclusive && seenShared {
		return fmt.Errorf("flags --exclusive and --shared are mutually exclusive")
	}

	user := "Unknown"
	if envUser := os.Getenv("USER"); envUser != "" {
		user = envUser
	}

	branch, err := refs.GetCurrentBranch()
	if err != nil || branch == "" {
		branch = "main"
	}

	lockType := models.LockTypeExclusive
	if !exclusive {
		lockType = models.LockTypeShared
	}

	lock := models.NewLock(filePath, user, branch, lockType)
	if expireHours > 0 {
		lock.ExpiresAt = lock.CreatedAt + int64(expireHours*3600)
	}

	acquired, err := locking.AcquireLock(lock)
	if err != nil {
		return fmt.Errorf("failed to acquire lock: %w", err)
	}

	if acquired {
		lockTypeStr := "exclusive"
		if !exclusive {
			lockTypeStr = "shared"
		}
		fmt.Printf("Locked %s (%s)\n", filePath, lockTypeStr)
		return nil
	} else {
		return fmt.Errorf("failed to acquire lock. File may be already locked")
	}
}
