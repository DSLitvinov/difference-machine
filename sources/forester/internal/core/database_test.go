package core

import (
	"os"
	"path/filepath"
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

	// Try to acquire same lock again (should fail)
	lock2 := models.NewLock("test.txt", "user1", "main", models.LockTypeExclusive)
	acquired2, err := db.AcquireLock(lock2)
	if err != nil {
		t.Fatalf("Failed to check lock: %v", err)
	}
	if acquired2 {
		t.Errorf("AcquireLock() = true, want false (lock conflict)")
	}
}

func TestDatabase_CreateBranch(t *testing.T) {
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

	err = db.CreateBranch("test-branch", "abc123")
	if err != nil {
		t.Fatalf("Failed to create branch: %v", err)
	}

	// Try to create same branch again (should fail)
	err = db.CreateBranch("test-branch", "def456")
	if err == nil {
		t.Errorf("CreateBranch() should fail for duplicate branch name")
	}
}

func TestDatabase_SetBranchHead(t *testing.T) {
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

	// Create branch first
	err = db.CreateBranch("test-branch", "abc123")
	if err != nil {
		t.Fatalf("Failed to create branch: %v", err)
	}

	// Update HEAD
	err = db.SetBranchHead("test-branch", "def456")
	if err != nil {
		t.Fatalf("Failed to set branch head: %v", err)
	}

	// Verify HEAD was updated
	head, err := db.GetBranchHead("test-branch")
	if err != nil {
		t.Fatalf("Failed to get branch head: %v", err)
	}
	if head != "def456" {
		t.Errorf("GetBranchHead() = %s, want def456", head)
	}
}

func TestDatabase_HasChildCommits(t *testing.T) {
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

	// Create parent commit
	parentCommit := models.NewCommit()
	parentCommit.Hash = "parent"
	parentCommit.TreeHash = "tree123"
	parentCommit.Author = "author"
	parentCommit.Message = "message"
	parentCommit.ParentHash = ""
	_, err = db.CreateCommit(parentCommit)
	if err != nil {
		t.Fatalf("Failed to create parent commit: %v", err)
	}

	// Create child commit
	childCommit := models.NewCommit()
	childCommit.Hash = "child"
	childCommit.TreeHash = "tree456"
	childCommit.Author = "author"
	childCommit.Message = "message"
	childCommit.ParentHash = "parent"
	_, err = db.CreateCommit(childCommit)
	if err != nil {
		t.Fatalf("Failed to create child commit: %v", err)
	}

	// Check if parent has children
	hasChildren, err := db.HasChildCommits("parent")
	if err != nil {
		t.Fatalf("Failed to check child commits: %v", err)
	}
	if !hasChildren {
		t.Errorf("HasChildCommits() = false, want true")
	}

	// Check if child has children
	hasChildren, err = db.HasChildCommits("child")
	if err != nil {
		t.Fatalf("Failed to check child commits: %v", err)
	}
	if hasChildren {
		t.Errorf("HasChildCommits() = true, want false")
	}
}
