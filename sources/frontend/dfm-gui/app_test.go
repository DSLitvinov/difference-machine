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

func TestWatchIgnored(t *testing.T) {
	root := t.TempDir()
	thumbs := filepath.Join(root, ".DFM", "cache", "thumbs", "a.png")
	if !watchIgnored(root, thumbs) {
		t.Fatal(".DFM cache should be ignored")
	}
	if !watchIgnored(root, filepath.Join(root, ".DFM")) {
		t.Fatal(".DFM should be ignored")
	}
	if watchIgnored(root, filepath.Join(root, "readme.txt")) {
		t.Fatal("workdir file should not be ignored")
	}
	if watchIgnored(root, root) {
		t.Fatal("repo root should not be ignored")
	}
}

func TestThumbCacheRoundTrip(t *testing.T) {
	dir := t.TempDir()
	if err := os.Mkdir(filepath.Join(dir, ".DFM"), 0o755); err != nil {
		t.Fatal(err)
	}
	app := &App{workPath: dir}
	const payload = "aGVsbG8=" // "hello"
	if err := app.WriteThumbCache("shots/a.png", 12, 99, payload); err != nil {
		t.Fatal(err)
	}
	got := app.ReadThumbCache("shots/a.png", 12, 99)
	if got != payload {
		t.Fatalf("cache hit = %q, want %q", got, payload)
	}
	if hit := app.ReadThumbCache("shots/a.png", 12, 100); hit != "" {
		t.Fatalf("mtime miss returned %q", hit)
	}
}
