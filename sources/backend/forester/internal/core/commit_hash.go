package core

import (
	"fmt"

	"github.com/difference-machine/forester/internal/models"
)

// ComputeCommitHash returns the object hash for a commit (hash field is excluded).
func ComputeCommitHash(commit *models.Commit) (string, error) {
	commitJSON, err := commit.ToJSON()
	if err != nil {
		return "", fmt.Errorf("serialize commit: %w", err)
	}
	return HashCommitJSON(commitJSON), nil
}

// FinalizeCommit assigns the computed hash and stores the commit object.
func FinalizeCommit(repo *Repository, commit *models.Commit) (string, error) {
	hash, err := ComputeCommitHash(commit)
	if err != nil {
		return "", err
	}
	commit.Hash = hash
	if _, err := repo.StoreCommit(commit); err != nil {
		return "", err
	}
	return hash, nil
}
