package core

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/difference-machine/forester/internal/models"
)

func TestDatabase_AcquireLock(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "forester_test_*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	dbPath := filepath.Join(tmpDir, "test.db")
	db, err := NewDatabase(dbPath)
	if err != nil {
		t.Fatalf("Failed to create database: %v", err)
	}
	defer db.Close()

	lock1 := models.NewLock("test.txt", "user1", "main", models.LockTypeExclusive)
	acquired, err := db.AcquireLock(lock1)
	if err != nil {
		t.Fatalf("Failed to acquire lock: %v", err)
	}
	if !acquired {
		t.Errorf("AcquireLock() = false, want true")
	}

	lock2 := models.NewLock("test.txt", "user1", "main", models.LockTypeExclusive)
	acquired2, err := db.AcquireLock(lock2)
	if err != nil {
		t.Fatalf("Failed to check lock: %v", err)
	}
	if acquired2 {
		t.Errorf("AcquireLock() = true, want false (lock conflict)")
	}
}

func TestRepository_BranchRefs(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "forester_test_*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	if err := os.MkdirAll(filepath.Join(tmpDir, ".DFM", "refs", "heads"), 0755); err != nil {
		t.Fatalf("Failed to create refs dir: %v", err)
	}

	repo, err := OpenRepository(tmpDir)
	if err != nil {
		t.Fatalf("Failed to open repository: %v", err)
	}
	defer repo.Close()

	if err := repo.CreateBranch("test-branch", "abc1234567890abcdef1234567890abcdef1234567890abcdef1234567890"); err != nil {
		t.Fatalf("Failed to create branch: %v", err)
	}

	head, err := repo.GetBranchHead("test-branch")
	if err != nil {
		t.Fatalf("Failed to get branch head: %v", err)
	}
	if head == "" {
		t.Fatal("GetBranchHead() returned empty hash")
	}

	if err := repo.SetBranchHead("test-branch", "def4567890abcdef1234567890abcdef1234567890abcdef1234567890abcd", head); err != nil {
		t.Fatalf("Failed to set branch head: %v", err)
	}

	head, err = repo.GetBranchHead("test-branch")
	if err != nil {
		t.Fatalf("Failed to get branch head: %v", err)
	}
	if head != "def4567890abcdef1234567890abcdef1234567890abcdef1234567890abcd" {
		t.Errorf("GetBranchHead() = %s, want def456...", head)
	}
}

func TestRepository_HasChildCommits(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "forester_test_*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	if err := os.MkdirAll(filepath.Join(tmpDir, ".DFM", "objects"), 0755); err != nil {
		t.Fatalf("Failed to create objects dir: %v", err)
	}

	repo, err := OpenRepository(tmpDir)
	if err != nil {
		t.Fatalf("Failed to open repository: %v", err)
	}
	defer repo.Close()

	parent := models.NewCommit()
	parent.TreeHash = strings.Repeat("b", 64)
	parent.Author = "author"
	parent.Message = "parent"

	parentJSON, _ := parent.ToJSON()
	parent.Hash = HashCommitJSON(parentJSON)
	parentJSON, _ = parent.ToJSON()
	parentHash, err := repo.Storage.StoreCommit(parentJSON)
	if err != nil {
		t.Fatalf("Failed to store parent: %v", err)
	}

	child := models.NewCommit()
	child.TreeHash = strings.Repeat("d", 64)
	child.Author = "author"
	child.Message = "child"
	child.ParentHash = parentHash
	child.ParentHashes = []string{parentHash}

	childJSON, _ := child.ToJSON()
	child.Hash = HashCommitJSON(childJSON)
	childJSON, _ = child.ToJSON()
	if _, err := repo.Storage.StoreCommit(childJSON); err != nil {
		t.Fatalf("Failed to store child: %v", err)
	}

	hasChildren, err := repo.HasChildCommits(parentHash)
	if err != nil {
		t.Fatalf("HasChildCommits failed: %v", err)
	}
	if !hasChildren {
		t.Errorf("HasChildCommits(parent) = false, want true")
	}
}
