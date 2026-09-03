package core

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/difference-machine/forester/internal/models"
)

func TestRestoreTreeSkipsUnchangedBlob(t *testing.T) {
	repoPath := t.TempDir()
	storage, err := NewStorage(repoPath)
	if err != nil {
		t.Fatal(err)
	}
	blobHash, err := storage.StoreBlob([]byte("same"))
	if err != nil {
		t.Fatal(err)
	}
	filePath := filepath.Join(repoPath, "keep.txt")
	if err := os.WriteFile(filePath, []byte("same"), 0o644); err != nil {
		t.Fatal(err)
	}
	mtime := time.Now().Add(-time.Hour).UTC().Truncate(time.Second)
	if err := os.Chtimes(filePath, mtime, mtime); err != nil {
		t.Fatal(err)
	}

	tree := models.NewTree()
	tree.AddEntry(models.NewTreeEntry(blobHash, "keep.txt", "blob"))
	treeJSON, err := tree.ToJSON()
	if err != nil {
		t.Fatal(err)
	}
	treeHash, err := storage.StoreTree(treeJSON)
	if err != nil {
		t.Fatal(err)
	}
	if err := RestoreTreeToWorkdir(storage, repoPath, treeHash); err != nil {
		t.Fatal(err)
	}

	info, err := os.Stat(filePath)
	if err != nil {
		t.Fatal(err)
	}
	if !info.ModTime().Equal(mtime) {
		t.Fatalf("mtime changed: got %v want %v", info.ModTime(), mtime)
	}
}

func TestRestoreWorkdirDeltaSameTreeIsNoop(t *testing.T) {
	repoPath := t.TempDir()
	storage, err := NewStorage(repoPath)
	if err != nil {
		t.Fatal(err)
	}
	blobHash, err := storage.StoreBlob([]byte("keep"))
	if err != nil {
		t.Fatal(err)
	}
	filePath := filepath.Join(repoPath, "keep.txt")
	if err := os.WriteFile(filePath, []byte("keep"), 0o644); err != nil {
		t.Fatal(err)
	}
	mtime := time.Now().Add(-time.Hour).UTC().Truncate(time.Second)
	if err := os.Chtimes(filePath, mtime, mtime); err != nil {
		t.Fatal(err)
	}

	tree := models.NewTree()
	tree.AddEntry(models.NewTreeEntry(blobHash, "keep.txt", "blob"))
	treeJSON, err := tree.ToJSON()
	if err != nil {
		t.Fatal(err)
	}
	treeHash, err := storage.StoreTree(treeJSON)
	if err != nil {
		t.Fatal(err)
	}
	if err := RestoreWorkdirDelta(storage, repoPath, treeHash, treeHash); err != nil {
		t.Fatal(err)
	}
	info, err := os.Stat(filePath)
	if err != nil {
		t.Fatal(err)
	}
	if !info.ModTime().Equal(mtime) {
		t.Fatalf("mtime changed: got %v want %v", info.ModTime(), mtime)
	}
}
