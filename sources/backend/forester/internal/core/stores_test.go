package core

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/difference-machine/forester/internal/models"
)

func TestStashStore_ListStashesPreservesDistinctRows(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "forester_test_*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	stashStore := NewStashStore(tmpDir)

	stash1 := &models.Stash{Hash: "hash1", Message: "first", TreeHash: strings.Repeat("a", 64), CreatedAt: 1}
	stash2 := &models.Stash{Hash: "hash2", Message: "second", TreeHash: strings.Repeat("b", 64), CreatedAt: 2}

	if _, err := stashStore.CreateStash(stash1); err != nil {
		t.Fatalf("CreateStash(1): %v", err)
	}
	if _, err := stashStore.CreateStash(stash2); err != nil {
		t.Fatalf("CreateStash(2): %v", err)
	}

	stashes, err := stashStore.ListStashes()
	if err != nil {
		t.Fatalf("ListStashes: %v", err)
	}
	if len(stashes) != 2 {
		t.Fatalf("ListStashes() len = %d, want 2", len(stashes))
	}

	byHash := make(map[string]string)
	for _, s := range stashes {
		byHash[s.Hash] = s.Message
	}
	if byHash["hash1"] != "first" || byHash["hash2"] != "second" {
		t.Fatalf("ListStashes returned corrupted rows: %#v", stashes)
	}
}

func TestLocking_AcquireLock(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "forester_test_*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	locking := NewLocking(tmpDir)

	lock1 := models.NewLock("test.txt", "user1", "main", models.LockTypeExclusive)
	acquired, err := locking.AcquireLock(lock1)
	if err != nil {
		t.Fatalf("Failed to acquire lock: %v", err)
	}
	if !acquired {
		t.Errorf("AcquireLock() = false, want true")
	}

	lock2 := models.NewLock("test.txt", "user1", "main", models.LockTypeExclusive)
	acquired2, err := locking.AcquireLock(lock2)
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

func TestRepository_FindCommitByPrefixAmbiguous(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "forester_test_*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	repo, err := OpenRepository(tmpDir)
	if err != nil {
		t.Fatalf("Failed to open repository: %v", err)
	}
	defer repo.Close()

	hash1 := "abcdef01" + strings.Repeat("0", 56)
	hash2 := "abcdef01" + strings.Repeat("1", 56)
	for _, hash := range []string{hash1, hash2} {
		commit := models.NewCommit()
		commit.Hash = hash
		commit.TreeHash = strings.Repeat("b", 64)
		commit.Author = "author"
		commit.Message = "msg-" + hash[:12]
		commitJSON, err := commit.ToJSON()
		if err != nil {
			t.Fatalf("ToJSON: %v", err)
		}
		if _, err := repo.Storage.StoreCommit(commitJSON); err != nil {
			t.Fatalf("StoreCommit(%s): %v", hash, err)
		}
	}

	_, err = repo.FindCommitByPrefix("abcdef01")
	var amb *ErrAmbiguousCommitPrefix
	if !errors.As(err, &amb) {
		t.Fatalf("FindCommitByPrefix() error = %v, want ErrAmbiguousCommitPrefix", err)
	}
}
