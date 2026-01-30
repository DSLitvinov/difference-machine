package commands

import (
	"fmt"
	"strings"

	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/utils"
)

// resolveCommitHash resolves a commit hash from various formats:
// - Full 64-character hash
// - Short hash (8+ characters)
// - HEAD (current branch HEAD)
// - HEAD~n (n commits before HEAD)
func resolveCommitHash(db *core.Database, refs *core.Refs, currentBranch, hash string) (string, error) {
	// Handle HEAD references
	if hash == "HEAD" {
		head, err := db.GetBranchHead(currentBranch)
		if err != nil || head == "" {
			head, err = refs.GetHead(currentBranch)
			if err != nil || head == "" {
				return "", fmt.Errorf("no commits yet")
			}
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

		// Get HEAD
		head, err := db.GetBranchHead(currentBranch)
		if err != nil || head == "" {
			head, err = refs.GetHead(currentBranch)
			if err != nil || head == "" {
				return "", fmt.Errorf("no commits yet")
			}
		}

		// Walk back n commits
		current := head
		for i := 0; i < n; i++ {
			commit, err := db.GetCommit(current)
			if err != nil {
				return "", fmt.Errorf("commit not found: %s", current)
			}
			if commit.ParentHash == "" {
				return "", fmt.Errorf("cannot go back %d commits: reached initial commit", n)
			}
			current = commit.ParentHash
		}
		return current, nil
	}

	// If it's a full hash, validate and return
	if utils.IsValidCommitHash(hash) {
		return hash, nil
	}

	// Try to find by short hash prefix
	// Search in commit history
	commits, err := db.GetCommitHistory(currentBranch, 1000)
	if err == nil {
		for _, commit := range commits {
			if strings.HasPrefix(commit.Hash, hash) {
				return commit.Hash, nil
			}
		}
	}

	// Also check all branches if not found
	branches, err := db.ListBranches()
	if err == nil {
		for _, branch := range branches {
			history, err := db.GetCommitHistory(branch.Name, 1000)
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
