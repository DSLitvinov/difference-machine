package commands

import (
	"testing"

	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/models"
)

func TestStorePreparedCommit(t *testing.T) {
	repoPath := t.TempDir()
	if err := core.NewRefs(repoPath).CreateBranch("main", ""); err != nil {
		t.Fatalf("create branch: %v", err)
	}
	repo, err := core.OpenRepository(repoPath)
	if err != nil {
		t.Fatalf("open repo: %v", err)
	}
	defer repo.Close()

	treeHash, err := repo.Storage.StoreTree(`{"entries":[]}`)
	if err != nil {
		t.Fatalf("store tree: %v", err)
	}

	commit := models.NewCommit()
	commit.TreeHash = treeHash
	commit.Author = "tester"
	commit.Message = "msg"
	commit.Type = models.CommitTypeProject

	hash, err := storePreparedCommit(repo, commit)
	if err != nil {
		t.Fatalf("storePreparedCommit: %v", err)
	}
	if len(hash) != 64 {
		t.Fatalf("hash len = %d", len(hash))
	}
}
