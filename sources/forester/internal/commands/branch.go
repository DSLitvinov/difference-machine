package commands

import (
	"fmt"
	"path/filepath"
	"strings"

	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/models"
	"github.com/difference-machine/forester/internal/utils"
)

// Branch manages branches in the repository.
// It can create, delete, and list branches.
//
// Usage:
//
//	forester branch                    # List branches
//	forester branch <name>             # Create branch
//	forester branch -d <name>          # Delete branch
func Branch(args []string) error {
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

	refs := core.NewRefs(repoPath)

	if len(args) == 0 || (len(args) == 1 && (args[0] == "-v" || args[0] == "--verbose")) {
		// List branches
		verbose := len(args) == 1 && (args[0] == "-v" || args[0] == "--verbose")

		branches, err := db.ListBranches()
		if err != nil {
			return fmt.Errorf("failed to list branches: %w", err)
		}

		currentBranch, err := refs.GetCurrentBranch()
		if err != nil || currentBranch == "" {
			currentBranch = "main"
		}

		for _, branch := range branches {
			prefix := "  "
			if branch.Name == currentBranch {
				prefix = "* "
			}

			if verbose {
				// Show last commit for each branch
				commitHash := branch.CommitHash
				if commitHash == "" {
					commitHash, _ = refs.GetHead(branch.Name)
				}

				if commitHash != "" {
					commit, err := db.GetCommit(commitHash)
					if err == nil {
						hashShort := commitHash
						if len(hashShort) > 8 {
							hashShort = hashShort[:8]
						}
						fmt.Printf("%s%s %s %s\n", prefix, branch.Name, hashShort, commit.Message)
					} else {
						fmt.Printf("%s%s %s\n", prefix, branch.Name, commitHash[:8])
					}
				} else {
					fmt.Printf("%s%s (no commits yet)\n", prefix, branch.Name)
				}
			} else {
				fmt.Printf("%s%s\n", prefix, branch.Name)
			}
		}
		return nil
	}

	command := args[0]

	if command == "-m" || command == "--move" || command == "--rename" {
		// Rename branch
		if len(args) < 3 {
			return fmt.Errorf("usage: branch -m <old-name> <new-name>")
		}
		if len(args) > 3 {
			return fmt.Errorf("usage: branch -m <old-name> <new-name>")
		}

		oldName := args[1]
		newName := args[2]

		if !utils.IsValidBranchName(oldName) {
			return fmt.Errorf("invalid old branch name")
		}
		if !utils.IsValidBranchName(newName) {
			return fmt.Errorf("invalid new branch name")
		}

		// Check if old branch exists
		branches, err := db.ListBranches()
		if err != nil {
			return fmt.Errorf("failed to list branches: %w", err)
		}

		var oldBranch *models.Branch
		for _, branch := range branches {
			if branch.Name == oldName {
				oldBranch = branch
				break
			}
		}

		if oldBranch == nil {
			return fmt.Errorf("branch '%s' not found", oldName)
		}

		// Check if new branch already exists
		for _, branch := range branches {
			if branch.Name == newName {
				return fmt.Errorf("branch '%s' already exists", newName)
			}
		}

		// Get current branch
		currentBranch, err := refs.GetCurrentBranch()
		if err != nil || currentBranch == "" {
			currentBranch = "main"
		}

		// Rename in database
		commitHash := oldBranch.CommitHash
		if commitHash == "" {
			commitHash, _ = refs.GetHead(oldName)
		}

		// Delete old branch
		if err := db.DeleteBranch(oldName); err != nil {
			return fmt.Errorf("failed to delete old branch: %w", err)
		}
		if err := refs.DeleteBranch(oldName); err != nil {
			return fmt.Errorf("failed to delete old branch ref: %w", err)
		}

		// Create new branch
		if err := db.CreateBranch(newName, commitHash); err != nil {
			return fmt.Errorf("failed to create new branch: %w", err)
		}
		if err := refs.CreateBranch(newName, commitHash); err != nil {
			return fmt.Errorf("failed to create new branch ref: %w", err)
		}

		// If it was the current branch, update current branch
		if oldName == currentBranch {
			if err := refs.SetCurrentBranch(newName); err != nil {
				return fmt.Errorf("failed to update current branch: %w", err)
			}
		}

		fmt.Printf("Renamed branch '%s' to '%s'\n", oldName, newName)
		return nil
	}

	if command == "-d" || command == "--delete" {
		// Delete branch
		if len(args) < 2 {
			return fmt.Errorf("branch name required")
		}
		if len(args) > 2 {
			return fmt.Errorf("usage: branch -d <name>")
		}

		branchName := args[1]
		if !utils.IsValidBranchName(branchName) {
			return fmt.Errorf("invalid branch name")
		}

		// Check if it's the current branch
		currentBranch, err := refs.GetCurrentBranch()
		if err != nil || currentBranch == "" {
			currentBranch = "main"
		}
		if branchName == currentBranch {
			return fmt.Errorf("cannot delete current branch '%s'. Switch to another branch first", branchName)
		}

		if err := db.DeleteBranch(branchName); err != nil {
			return fmt.Errorf("failed to delete branch: %w", err)
		}
		if err := refs.DeleteBranch(branchName); err != nil {
			return fmt.Errorf("failed to delete branch ref: %w", err)
		}

		fmt.Printf("Deleted branch %s\n", branchName)
		return nil
	}

	// Create new branch
	if strings.HasPrefix(command, "-") {
		return fmt.Errorf("unknown flag: %s", command)
	}
	if len(args) > 1 {
		return fmt.Errorf("unexpected arguments after branch name")
	}
	branchName := command
	if !utils.IsValidBranchName(branchName) {
		return fmt.Errorf("invalid branch name")
	}

	// Get current HEAD
	currentBranch, err := refs.GetCurrentBranch()
	if err != nil || currentBranch == "" {
		currentBranch = "main"
	}

	commitHash, err := refs.GetHead(currentBranch)
	if err != nil {
		return fmt.Errorf("failed to get HEAD: %w", err)
	}

	// If current branch is empty, check database
	if commitHash == "" {
		commitHash, err = db.GetBranchHead(currentBranch)
		if err != nil {
			return fmt.Errorf("failed to get branch head: %w", err)
		}
	}

	// Create branch (can be empty if repository has no commits yet)
	if err := db.CreateBranch(branchName, commitHash); err != nil {
		return fmt.Errorf("failed to create branch: %w", err)
	}
	if err := refs.CreateBranch(branchName, commitHash); err != nil {
		return fmt.Errorf("failed to create branch ref: %w", err)
	}

	fmt.Printf("Created branch %s\n", branchName)
	return nil
}
