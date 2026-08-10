package core

import (
	"testing"

	"github.com/difference-machine/forester/internal/models"
)

func TestReviewStore_GlobalCommentIDs(t *testing.T) {
	tmpDir := t.TempDir()
	store := NewReviewStore(tmpDir)

	id1, err := store.CreateComment(models.NewComment("mesh", "asset-a", "alice", "first", 0, 0))
	if err != nil {
		t.Fatalf("CreateComment(1): %v", err)
	}
	id2, err := store.CreateComment(models.NewComment("mesh", "asset-b", "bob", "second", 0, 0))
	if err != nil {
		t.Fatalf("CreateComment(2): %v", err)
	}
	if id1 == id2 {
		t.Fatalf("comment IDs should be unique: both %d", id1)
	}

	if err := store.ResolveComment(id2); err != nil {
		t.Fatalf("ResolveComment(%d): %v", id2, err)
	}

	commentsA, err := store.GetComments("mesh", "asset-a")
	if err != nil {
		t.Fatalf("GetComments(asset-a): %v", err)
	}
	if commentsA[0].Resolved {
		t.Fatal("comment on asset-a should remain unresolved")
	}

	commentsB, err := store.GetComments("mesh", "asset-b")
	if err != nil {
		t.Fatalf("GetComments(asset-b): %v", err)
	}
	if !commentsB[0].Resolved {
		t.Fatal("comment on asset-b should be resolved")
	}
}

func TestHashStash_StableForSimpleMessage(t *testing.T) {
	old := HashString(`{"message":"test","tree_hash":"` + "a" + `"}`)
	newHash := HashStash("test", "a")
	if old != newHash {
		t.Fatalf("HashStash changed canonical hash: old=%s new=%s", old, newHash)
	}
}
