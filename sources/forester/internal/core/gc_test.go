package core

import (
	"fmt"
	"os"
	"strings"
	"testing"

	"github.com/difference-machine/forester/internal/models"
)

func TestCollectUsedObjects_StashTree(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "forester_gc_test_*")
	if err != nil {
		t.Fatalf("create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	repo, err := OpenRepository(tmpDir)
	if err != nil {
		t.Fatalf("open repository: %v", err)
	}
	defer repo.Close()

	blobHash, err := repo.Storage.StoreBlob([]byte("stash content"))
	if err != nil {
		t.Fatalf("store blob: %v", err)
	}

	tree := models.NewTree()
	tree.AddEntry(models.NewTreeEntry(blobHash, "file.txt", "blob"))
	treeJSON, err := tree.ToJSON()
	if err != nil {
		t.Fatalf("tree json: %v", err)
	}
	treeHash, err := repo.Storage.StoreTree(treeJSON)
	if err != nil {
		t.Fatalf("store tree: %v", err)
	}

	db, err := repo.DB()
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	stash := models.NewStash("test stash", treeHash)
	stashJSON := fmt.Sprintf(`{"message":"%s","tree_hash":"%s"}`, stash.Message, stash.TreeHash)
	stash.Hash = HashString(stashJSON)
	if _, err := db.CreateStash(stash); err != nil {
		t.Fatalf("create stash: %v", err)
	}

	used, err := repo.CollectUsedObjects()
	if err != nil {
		t.Fatalf("collect used objects: %v", err)
	}
	if !used[treeHash] {
		t.Errorf("stash tree %s not pinned", treeHash)
	}
	if !used[blobHash] {
		t.Errorf("stash blob %s not pinned", blobHash)
	}
}

func TestCollectUsedObjects_AnnotatedTagObject(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "forester_gc_test_*")
	if err != nil {
		t.Fatalf("create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	repo, err := OpenRepository(tmpDir)
	if err != nil {
		t.Fatalf("open repository: %v", err)
	}
	defer repo.Close()

	commitHash := strings.Repeat("a", 64)
	if err := repo.CreateBranch("main", commitHash); err != nil {
		t.Fatalf("create branch: %v", err)
	}

	commit := models.NewCommit()
	commit.Hash = commitHash
	commit.TreeHash = strings.Repeat("b", 64)
	commit.Author = "author"
	commit.Message = "msg"
	commitJSON, err := commit.ToJSON()
	if err != nil {
		t.Fatalf("commit json: %v", err)
	}
	if _, err := repo.Storage.StoreCommit(commitJSON); err != nil {
		t.Fatalf("store commit: %v", err)
	}

	tag := &models.Tag{
		Name:       "v1",
		CommitHash: commitHash,
		Author:     "author",
		Message:    "release",
	}
	if err := repo.CreateTag(tag, true); err != nil {
		t.Fatalf("create tag: %v", err)
	}

	refHash, err := repo.Refs.GetTag("v1")
	if err != nil {
		t.Fatalf("get tag ref: %v", err)
	}
	if !repo.Storage.TagExists(refHash) {
		t.Fatalf("expected annotated tag object at ref %s", refHash)
	}

	used, err := repo.CollectUsedObjects()
	if err != nil {
		t.Fatalf("collect used objects: %v", err)
	}
	if !used[refHash] {
		t.Errorf("annotated tag object %s not pinned", refHash)
	}
	if !used[commitHash] {
		t.Errorf("tag target commit %s not pinned", commitHash)
	}
}

func TestCollectUsedObjects_MergeSecondParent(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "forester_gc_test_*")
	if err != nil {
		t.Fatalf("create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	repo, err := OpenRepository(tmpDir)
	if err != nil {
		t.Fatalf("open repository: %v", err)
	}
	defer repo.Close()

	storeCommit := func(message, treeHash string, parents []string) string {
		t.Helper()
		commit := models.NewCommit()
		commit.TreeHash = treeHash
		commit.Author = "author"
		commit.Message = message
		commit.ParentHashes = parents
		if len(parents) > 0 {
			commit.ParentHash = parents[0]
		}
		commitJSON, err := commit.ToJSON()
		if err != nil {
			t.Fatalf("commit json: %v", err)
		}
		commit.Hash = HashCommitJSON(commitJSON)
		commitJSON, err = commit.ToJSON()
		if err != nil {
			t.Fatalf("commit json: %v", err)
		}
		hash, err := repo.Storage.StoreCommit(commitJSON)
		if err != nil {
			t.Fatalf("store commit: %v", err)
		}
		return hash
	}

	storeEmptyTree := func() string {
		t.Helper()
		tree := models.NewTree()
		treeJSON, err := tree.ToJSON()
		if err != nil {
			t.Fatalf("tree json: %v", err)
		}
		hash, err := repo.Storage.StoreTree(treeJSON)
		if err != nil {
			t.Fatalf("store tree: %v", err)
		}
		return hash
	}

	parent1Tree := storeEmptyTree()
	parent2Tree := storeEmptyTree()
	mergeTree := storeEmptyTree()

	parent1 := storeCommit("parent1", parent1Tree, nil)
	parent2 := storeCommit("parent2", parent2Tree, nil)
	mergeHash := storeCommit("merge", mergeTree, []string{parent1, parent2})

	if err := repo.CreateBranch("main", mergeHash); err != nil {
		t.Fatalf("create branch: %v", err)
	}

	used, err := repo.CollectUsedObjects()
	if err != nil {
		t.Fatalf("collect used objects: %v", err)
	}
	for _, hash := range []string{parent1, parent2, mergeHash, parent1Tree, parent2Tree, mergeTree} {
		if !used[hash] {
			t.Errorf("expected %s to be pinned", hash)
		}
	}
}

func TestMarkTreeReachable_NestedTrees(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "forester_gc_test_*")
	if err != nil {
		t.Fatalf("create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	repo, err := OpenRepository(tmpDir)
	if err != nil {
		t.Fatalf("open repository: %v", err)
	}
	defer repo.Close()

	blobHash, err := repo.Storage.StoreBlob([]byte("nested"))
	if err != nil {
		t.Fatalf("store blob: %v", err)
	}

	subTree := models.NewTree()
	subTree.AddEntry(models.NewTreeEntry(blobHash, "inner.txt", "blob"))
	subTreeJSON, _ := subTree.ToJSON()
	subTreeHash, err := repo.Storage.StoreTree(subTreeJSON)
	if err != nil {
		t.Fatalf("store sub tree: %v", err)
	}

	rootTree := models.NewTree()
	rootTree.AddEntry(models.NewTreeEntry(subTreeHash, "dir", "tree"))
	rootTreeJSON, _ := rootTree.ToJSON()
	rootTreeHash, err := repo.Storage.StoreTree(rootTreeJSON)
	if err != nil {
		t.Fatalf("store root tree: %v", err)
	}

	used := make(map[string]bool)
	if err := repo.markTreeReachable(rootTreeHash, used); err != nil {
		t.Fatalf("mark tree: %v", err)
	}
	for _, hash := range []string{rootTreeHash, subTreeHash, blobHash} {
		if !used[hash] {
			t.Errorf("expected %s to be pinned", hash)
		}
	}
}
