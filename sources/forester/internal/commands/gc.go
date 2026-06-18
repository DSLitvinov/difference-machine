package commands

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/utils"
)

// GC runs garbage collection to remove unreferenced commits and objects.
// It identifies commits that were deleted and have expired from reflog,
// then removes them along with unused trees and blobs.
//
// Usage:
//
//	forester gc                        # Run GC with default settings
//	forester gc --dry-run              # Preview what would be deleted
//	forester gc --reflog-expire 30     # Set reflog expiration to 30 days
func GC(args []string) error {
	dryRun := false
	reflogExpireDays := 90

	for i := 0; i < len(args); i++ {
		if args[i] == "--dry-run" || args[i] == "-n" {
			dryRun = true
		} else if args[i] == "--reflog-expire" && i+1 < len(args) {
			days, err := strconv.Atoi(args[i+1])
			if err != nil {
				return fmt.Errorf("invalid reflog expire days: %w", err)
			}
			reflogExpireDays = days
			i++
		} else if args[i] == "--reflog-expire" {
			return fmt.Errorf("flag --reflog-expire requires a value")
		} else if strings.HasPrefix(args[i], "-") {
			return fmt.Errorf("unknown flag: %s", args[i])
		} else {
			return fmt.Errorf("unexpected argument: %s", args[i])
		}
	}

	repoPath, err := utils.FindRepositoryRoot(".")
	if err != nil {
		return fmt.Errorf("not a Forester repository")
	}

	repo, err := core.OpenRepository(repoPath)
	if err != nil {
		return fmt.Errorf("failed to open repository: %w", err)
	}
	defer repo.Close()

	now := time.Now().Unix()
	expireBefore := now - int64(reflogExpireDays*24*60*60)

	storage := repo.Storage

	if dryRun {
		fmt.Println("Dry run mode - no changes will be made")
	}

	commitsDeleted := 0
	treesDeleted := 0
	blobsDeleted := 0

	deletedEntries, err := repo.Reflog.GetEntries("", 10000)
	if err != nil {
		return fmt.Errorf("failed to get reflog: %w", err)
	}

	expiredDeletedCommits := make(map[string]bool)

	for _, entry := range deletedEntries {
		if entry.Operation == "delete" {
			if entry.Timestamp < expireBefore {
				expiredDeletedCommits[entry.CommitHash] = true
			}
		}
	}

	referencedCommits, err := repo.CollectReferencedCommits()
	if err != nil {
		return fmt.Errorf("failed to collect referenced commits: %w", err)
	}

	commitsToDelete := make(map[string]bool)

	for commitHash := range expiredDeletedCommits {
		if referencedCommits[commitHash] {
			continue
		}

		hasChildren, err := repo.HasChildCommits(commitHash)
		if err != nil {
			continue
		}

		if hasChildren {
			allChildrenDeleted, err := checkAllChildrenDeleted(repo, commitHash, expiredDeletedCommits, referencedCommits)
			if err != nil {
				continue
			}
			if allChildrenDeleted {
				commitsToDelete[commitHash] = true
			}
		} else {
			commitsToDelete[commitHash] = true
		}
	}

	for commitHash := range commitsToDelete {
		if !dryRun {
			if _, err := repo.GetCommit(commitHash); err != nil {
				continue
			}
			if err := repo.ForceDeleteCommit(commitHash); err != nil {
				continue
			}
			commitsDeleted++
		} else {
			commitsDeleted++
		}
	}

	usedObjects, err := repo.CollectUsedObjects()
	if err != nil {
		return fmt.Errorf("failed to collect used objects: %w", err)
	}

	err = storage.ListObjects(func(hash, objectType string) error {
		if objectType == core.ObjectTypeCommit {
			return nil
		}
		if usedObjects[hash] {
			return nil
		}
		switch objectType {
		case core.ObjectTypeTree:
			treesDeleted++
		case core.ObjectTypeBlob:
			blobsDeleted++
		default:
			return nil
		}
		if dryRun {
			return nil
		}
		_ = storage.DeleteObject(hash)
		return nil
	})
	if err != nil {
		return fmt.Errorf("failed to delete unused objects: %w", err)
	}

	if !dryRun {
		if err := repo.Reflog.Expire(expireBefore); err != nil {
			return fmt.Errorf("failed to expire reflog: %w", err)
		}
	}

	fmt.Println("Garbage collection completed:")
	fmt.Printf("  Commits deleted: %d\n", commitsDeleted)
	fmt.Printf("  Trees deleted: %d\n", treesDeleted)
	fmt.Printf("  Blobs deleted: %d\n", blobsDeleted)

	if dryRun {
		fmt.Println("\n(Dry run - no actual deletions performed)")
	}

	return nil
}

func checkAllChildrenDeleted(repo *core.Repository, commitHash string, expiredDeletedCommits, referencedCommits map[string]bool) (bool, error) {
	children, err := repo.GetChildCommits(commitHash)
	if err != nil {
		return false, err
	}

	if len(children) == 0 {
		return true, nil
	}

	for _, childHash := range children {
		if referencedCommits[childHash] {
			return false, nil
		}
		if !expiredDeletedCommits[childHash] {
			return false, nil
		}
		allChildrenDeleted, err := checkAllChildrenDeleted(repo, childHash, expiredDeletedCommits, referencedCommits)
		if err != nil || !allChildrenDeleted {
			return false, err
		}
	}

	return true, nil
}
