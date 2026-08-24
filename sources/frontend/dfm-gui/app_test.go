package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestIsForesterRepo(t *testing.T) {
	dir := t.TempDir()
	if isForesterRepo(dir) {
		t.Fatal("empty directory is not a repository")
	}
	if err := os.Mkdir(filepath.Join(dir, ".DFM"), 0o755); err != nil {
		t.Fatal(err)
	}
	if !isForesterRepo(dir) {
		t.Fatal("directory with .DFM should be a repository")
	}
}

func TestEnvelopeError(t *testing.T) {
	if msg := envelopeError([]byte(`{"ok":true,"result":{}}`)); msg != "" {
		t.Fatalf("unexpected error: %s", msg)
	}
	if msg := envelopeError([]byte(`{"ok":false,"error":"not a Forester repository"}`)); msg != "not a Forester repository" {
		t.Fatalf("got %q", msg)
	}
}
