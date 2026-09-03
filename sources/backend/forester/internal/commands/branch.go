package commands

import (
	"fmt"
	"strings"

	"github.com/difference-machine/forester/internal/core"
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

	repo, err := core.OpenRepository(repoPath)
	if err != nil {
		return fmt.Errorf("failed to open repository: %w", err)
	}
	defer repo.Close()

	refs := repo.Refs

	if len(args) == 0 || (len(args) == 1 && (args[0] == "-v" || args[0] == "--verbose")) {
		verbose := len(args) == 1 && (args[0] == "-v" || args[0] == "--verbose")

		branches, err := repo.ListBranches()
		if err != nil {
			return fmt.Errorf("failed to list branches: %w", err)
		}

		currentBranch, err := refs.GetCurrentBranch()
		if err != nil || currentBranch == "" {
			currentBranch = "main"
		}

		for _, branchName := range branches {
			prefix := "  "
			if branchName == currentBranch {
				prefix = "* "
			}

			if verbose {
				commitHash, _ := repo.GetBranchHead(branchName)

				if commitHash != "" {
					commit, err := repo.GetCommit(commitHash)
					if err == nil {
						hashShort := commitHash
						if len(hashShort) > 8 {
							hashShort = hashShort[:8]
						}
						fmt.Printf("%s%s %s %s\n", prefix, branchName, hashShort, commit.Message)
					} else {
						fmt.Printf("%s%s %s\n", prefix, branchName, commitHash[:8])
					}
				} else {
					fmt.Printf("%s%s (no commits yet)\n", prefix, branchName)
				}
			} else {
				fmt.Printf("%s%s\n", prefix, branchName)
			}
		}
		return nil
	}

	command := args[0]

	if command == "-m" || command == "--move" || command == "--rename" {
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

		branches, err := repo.ListBranches()
		if err != nil {
			return fmt.Errorf("failed to list branches: %w", err)
		}

		oldExists := false
		for _, name := range branches {
			if name == oldName {
				oldExists = true
				break
			}
		}
		if !oldExists {
			return fmt.Errorf("branch '%s' not found", oldName)
		}

		for _, name := range branches {
			if name == newName {
				return fmt.Errorf("branch '%s' already exists", newName)
			}
		}

		currentBranch, err := refs.GetCurrentBranch()
		if err != nil || currentBranch == "" {
			currentBranch = "main"
		}

		commitHash, _ := repo.GetBranchHead(oldName)

		if err := repo.CreateBranch(newName, commitHash); err != nil {
			return fmt.Errorf("failed to create new branch: %w", err)
		}
		if oldName == currentBranch {
			if err := refs.SetCurrentBranch(newName); err != nil {
				return fmt.Errorf("failed to update current branch: %w", err)
			}
		}
		if err := repo.DeleteBranch(oldName); err != nil {
			return fmt.Errorf("failed to delete old branch: %w", err)
		}

		fmt.Printf("Renamed branch '%s' to '%s'\n", oldName, newName)
		return nil
	}

	if command == "-d" || command == "--delete" {
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

		currentBranch, err := refs.GetCurrentBranch()
		if err != nil || currentBranch == "" {
			currentBranch = "main"
		}
		if branchName == currentBranch {
			return fmt.Errorf("cannot delete current branch '%s'. Switch to another branch first", branchName)
		}

		if err := repo.DeleteBranch(branchName); err != nil {
			return fmt.Errorf("failed to delete branch: %w", err)
		}

		fmt.Printf("Deleted branch %s\n", branchName)
		return nil
	}

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

	currentBranch, err := refs.GetCurrentBranch()
	if err != nil || currentBranch == "" {
		currentBranch = "main"
	}

	commitHash, err := repo.GetBranchHead(currentBranch)
	if err != nil {
		return fmt.Errorf("failed to get HEAD: %w", err)
	}

	if err := repo.CreateBranch(branchName, commitHash); err != nil {
		return fmt.Errorf("failed to create branch: %w", err)
	}

	fmt.Printf("Created branch %s\n", branchName)
	return nil
}
