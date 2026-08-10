package core

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/difference-machine/forester/internal/models"
)

func TestIndexRejectsPathOutsideRepository(t *testing.T) {
	repoPath := t.TempDir()
	outside := filepath.Join(filepath.Dir(repoPath), "outside.txt")
	if err := os.WriteFile(outside, []byte("secret"), 0o644); err != nil {
		t.Fatal(err)
	}

	index, err := NewIndex(repoPath)
	if err != nil {
		t.Fatal(err)
	}
	if err := index.Add(outside, HashBytes([]byte("secret"))); err == nil {
		t.Fatal("Index.Add accepted a path outside the repository")
	}
	if err := index.MarkDeleted(outside); err == nil {
		t.Fatal("Index.MarkDeleted accepted a path outside the repository")
	}
}

func TestRestoreTreeRejectsTraversalEntry(t *testing.T) {
	repoPath := t.TempDir()
	outside := filepath.Join(filepath.Dir(repoPath), "outside.txt")

	storage, err := NewStorage(repoPath)
	if err != nil {
		t.Fatal(err)
	}
	blobHash, err := storage.StoreBlob([]byte("secret"))
	if err != nil {
		t.Fatal(err)
	}
	tree := models.NewTree()
	tree.AddEntry(models.NewTreeEntry(blobHash, "../outside.txt", "blob"))
	treeJSON, err := tree.ToJSON()
	if err != nil {
		t.Fatal(err)
	}
	treeHash, err := storage.StoreTree(treeJSON)
	if err != nil {
		t.Fatal(err)
	}

	if err := RestoreTreeToWorkdir(storage, repoPath, treeHash); err == nil {
		t.Fatal("RestoreTreeToWorkdir accepted a traversal tree entry")
	}
	if _, err := os.Stat(outside); !os.IsNotExist(err) {
		t.Fatalf("outside file was created: %v", err)
	}
}
