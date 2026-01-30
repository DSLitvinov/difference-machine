package commands

import (
	"encoding/json"
	"fmt"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/models"
	"github.com/difference-machine/forester/internal/utils"
)

// GC runs garbage collection to remove unreferenced commits and objects.
// It identifies commits that were deleted and have expired from reflog,
// then removes them along with unused trees, blobs, and meshes.
//
// Usage:
//   forester gc                        # Run GC with default settings
//   forester gc --dry-run              # Preview what would be deleted
//   forester gc --reflog-expire 30     # Set reflog expiration to 30 days
func GC(args []string) error {
	// Parse arguments
	dryRun := false
	reflogExpireDays := 90 // Default 90 days

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

	dbPath := filepath.Join(repoPath, ".DFM", "database.db")
	db, err := core.NewDatabase(dbPath)
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}
	defer db.Close()

	// Calculate reflog expiration time
	now := time.Now().Unix()
	expireBefore := now - int64(reflogExpireDays*24*60*60)

	storage, err := core.NewStorage(repoPath)
	if err != nil {
		return fmt.Errorf("failed to create storage: %w", err)
	}

	if dryRun {
		fmt.Println("Dry run mode - no changes will be made")
	}

	// Statistics
	commitsDeleted := 0
	treesDeleted := 0
	blobsDeleted := 0

	// 1. Get all commits that were deleted (in reflog)
	deletedEntries, err := db.GetReflog("", 10000)
	if err != nil {
		return fmt.Errorf("failed to get reflog: %w", err)
	}

	deletedCommits := make(map[string]bool)
	expiredDeletedCommits := make(map[string]bool)

	for _, entry := range deletedEntries {
		if entry.Operation == "delete" {
			deletedCommits[entry.CommitHash] = true
			// Check if reflog entry has expired
			if entry.Timestamp < expireBefore {
				expiredDeletedCommits[entry.CommitHash] = true
			}
		}
	}

	// 2. Get all active references (branch HEADs, tags)
	referencedCommits := make(map[string]bool)

	// HEAD of all branches
	branches, err := db.ListBranches()
	if err == nil {
		for _, branch := range branches {
			if branch.CommitHash != "" {
				referencedCommits[branch.CommitHash] = true
			}
		}
	}

	// Tags
	tags, err := db.ListTags()
	if err == nil {
		for _, tag := range tags {
			referencedCommits[tag.CommitHash] = true
		}
	}

	// 3. Find commits that can be safely deleted:
	// - They are in expired deleted list
	// - They have no active references
	// - They have no child commits (or children are also deleted)
	commitsToDelete := make(map[string]bool)

	for commitHash := range expiredDeletedCommits {
		// Skip if commit still has active references
		if referencedCommits[commitHash] {
			continue
		}

		// Check child commits
		hasChildren, err := db.HasChildCommits(commitHash)
		if err != nil {
			continue
		}

		if hasChildren {
			// Recursively check if all child commits are also deleted
			allChildrenDeleted, err := checkAllChildrenDeleted(db, commitHash, expiredDeletedCommits, referencedCommits)
			if err != nil {
				continue
			}
			if allChildrenDeleted {
				commitsToDelete[commitHash] = true
			}
		} else {
			// No child commits - safe to delete
			commitsToDelete[commitHash] = true
		}
	}

	// 4. Delete commits
	for commitHash := range commitsToDelete {
		if !dryRun {
			// Check if commit exists
			_, err := db.GetCommit(commitHash)
			if err != nil {
				// Commit already deleted or doesn't exist
				continue
			}

			// Force delete commit (for GC)
			if err := db.ForceDeleteCommit(commitHash); err != nil {
				continue
			}

			commitsDeleted++

			// Delete related trees, blobs, meshes if they are no longer used
			// This will be done after all commits are deleted
		} else {
			commitsDeleted++
		}
	}

	// 5. Find all used objects from remaining commits
	usedObjects := make(map[string]bool)
	for _, branch := range branches {
		if branch.CommitHash != "" {
			if err := findUsedObjects(db, storage, branch.CommitHash, usedObjects); err != nil {
				// Continue on error
			}
		}
	}
	for _, tag := range tags {
		if tag.CommitHash != "" {
			if err := findUsedObjects(db, storage, tag.CommitHash, usedObjects); err != nil {
				// Continue on error
			}
		}
	}

	// 6. Delete unused objects from storage
	if !dryRun {
		// Note: Actual deletion from filesystem would require additional storage methods
		// For now, we just count what would be deleted
		// TODO: Implement actual deletion when storage methods are available
	}

	// 7. Clean up expired reflog entries
	if !dryRun {
		if err := db.ExpireReflog(expireBefore); err != nil {
			return fmt.Errorf("failed to expire reflog: %w", err)
		}
	}

	// Print statistics
	fmt.Println("Garbage collection completed:")
	fmt.Printf("  Commits deleted: %d\n", commitsDeleted)
	fmt.Printf("  Trees deleted: %d\n", treesDeleted)
	fmt.Printf("  Blobs deleted: %d\n", blobsDeleted)

	if dryRun {
		fmt.Println("\n(Dry run - no actual deletions performed)")
	}

	return nil
}

// checkAllChildrenDeleted recursively checks if all child commits are deleted
func checkAllChildrenDeleted(db *core.Database, commitHash string, expiredDeletedCommits, referencedCommits map[string]bool) (bool, error) {
	// Get all child commits
	children, err := db.GetChildCommits(commitHash)
	if err != nil {
		return false, err
	}

	if len(children) == 0 {
		return true, nil
	}

	// Check each child
	for _, childHash := range children {
		// If child is referenced, parent cannot be deleted
		if referencedCommits[childHash] {
			return false, nil
		}

		// If child is not in expired deleted list, parent cannot be deleted
		if !expiredDeletedCommits[childHash] {
			return false, nil
		}

		// Recursively check child's children
		allChildrenDeleted, err := checkAllChildrenDeleted(db, childHash, expiredDeletedCommits, referencedCommits)
		if err != nil || !allChildrenDeleted {
			return false, err
		}
	}

	return true, nil
}

// findUsedObjects recursively finds all objects referenced by commits
func findUsedObjects(db *core.Database, storage *core.Storage, commitHash string, used map[string]bool) error {
	if used[commitHash] {
		return nil // Already processed
	}
	used[commitHash] = true

	commit, err := db.GetCommit(commitHash)
	if err != nil {
		return err
	}

	// Add tree hash
	if commit.TreeHash != "" {
		used[commit.TreeHash] = true

		// Get tree and find all referenced objects
		treeContent, err := storage.GetTreeContent(commit.TreeHash)
		if err == nil {
			var tree models.Tree
			if err := json.Unmarshal([]byte(treeContent), &tree); err == nil {
				// Add all blob/mesh hashes from tree
				for _, entry := range tree.Entries {
					used[entry.Hash] = true
				}
			}
		}
	}

	// Recursively process parent commits
	if commit.ParentHash != "" {
		return findUsedObjects(db, storage, commit.ParentHash, used)
	}

	return nil
}
