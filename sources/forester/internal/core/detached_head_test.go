package core

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDetachedHeadRoundTrip(t *testing.T) {
	repo := t.TempDir()
	if err := os.Mkdir(filepath.Join(repo, ".DFM"), 0o755); err != nil {
		t.Fatal(err)
	}

	if err := WriteDetachedHead(repo, "abc123", "main"); err != nil {
		t.Fatal(err)
	}
	ok, state, err := ReadDetachedHead(repo)
	if err != nil {
		t.Fatal(err)
	}
	if !ok || state.Commit != "abc123" || state.Branch != "main" {
		t.Fatalf("unexpected state: %+v ok=%v", state, ok)
	}

	if err := ClearDetachedHead(repo); err != nil {
		t.Fatal(err)
	}
	ok, _, err = ReadDetachedHead(repo)
	if err != nil {
		t.Fatal(err)
	}
	if ok {
		t.Fatal("expected detached state to be cleared")
	}
}
