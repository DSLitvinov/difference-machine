package commands

import (
	"fmt"
	"strings"

	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/models"
	"github.com/difference-machine/forester/internal/utils"
)

// ResolveCommitHash resolves a commit hash from various formats:
func ResolveCommitHash(repo *core.Repository, currentBranch, hash string) (string, error) {
	return resolveCommitHash(repo, currentBranch, hash)
}

// resolveCommitHash resolves a commit hash from various formats:
// - Full 64-character hash
// - Short hash (8+ characters)
// - HEAD (current branch HEAD)
// - HEAD~n (n commits before HEAD)
func resolveCommitHash(repo *core.Repository, currentBranch, hash string) (string, error) {
	// Handle HEAD references
	if hash == "HEAD" {
		head, err := repo.GetBranchHead(currentBranch)
		if err != nil || head == "" {
			return "", fmt.Errorf("no commits yet")
		}
		return head, nil
	}

	// Handle HEAD~n format
	if strings.HasPrefix(hash, "HEAD~") {
		nStr := strings.TrimPrefix(hash, "HEAD~")
		if nStr == "" {
			nStr = "1"
		}
		var n int
		if _, err := fmt.Sscanf(nStr, "%d", &n); err != nil || n < 0 {
			return "", fmt.Errorf("invalid HEAD~n format: %s", hash)
		}

		head, err := repo.GetBranchHead(currentBranch)
		if err != nil || head == "" {
			return "", fmt.Errorf("no commits yet")
		}

		current := head
		for i := 0; i < n; i++ {
			commit, err := repo.GetCommit(current)
			if err != nil {
				return "", fmt.Errorf("commit not found: %s", current)
			}
			parent := commit.ParentHash
			if parent == "" && len(commit.ParentHashes) > 0 {
				parent = commit.ParentHashes[0]
			}
			if parent == "" {
				return "", fmt.Errorf("cannot go back %d commits: reached initial commit", n)
			}
			current = parent
		}
		return current, nil
	}

	// If it's a full hash, validate and return
	if utils.IsValidCommitHash(hash) {
		return hash, nil
	}

	// Try to find by short hash prefix via repository
	if commit, err := repo.FindCommitByPrefix(hash); err == nil {
		return commit.Hash, nil
	}

	// Search in commit history on current branch
	commits, err := repo.GetCommitHistory(currentBranch, 1000)
	if err == nil {
		for _, commit := range commits {
			if strings.HasPrefix(commit.Hash, hash) {
				return commit.Hash, nil
			}
		}
	}

	// Also check all branches if not found
	branches, err := repo.ListBranches()
	if err == nil {
		for _, branch := range branches {
			history, err := repo.GetCommitHistory(branch, 1000)
			if err == nil {
				for _, commit := range history {
					if strings.HasPrefix(commit.Hash, hash) {
						return commit.Hash, nil
					}
				}
			}
		}
	}

	return "", fmt.Errorf("commit not found: %s", hash)
}

func storePreparedCommit(repo *core.Repository, commit *models.Commit) (string, error) {
	hash, err := core.FinalizeCommit(repo, commit)
	if err != nil {
		return "", fmt.Errorf("failed to store commit: %w", err)
	}
	return hash, nil
}
