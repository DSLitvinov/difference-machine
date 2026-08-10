package jsonapi

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestMoveToFreedesktopTrash(t *testing.T) {
	if runtime.GOOS != "linux" {
		t.Skip("freedesktop trash test runs on Linux only")
	}

	root := t.TempDir()
	dataHome := filepath.Join(root, "data")
	t.Setenv("XDG_DATA_HOME", dataHome)

	srcDir := filepath.Join(root, "workdir")
	if err := os.MkdirAll(srcDir, 0o755); err != nil {
		t.Fatal(err)
	}
	src := filepath.Join(srcDir, "sample.txt")
	if err := os.WriteFile(src, []byte("hello"), 0o644); err != nil {
		t.Fatal(err)
	}

	if err := moveToFreedesktopTrash(src); err != nil {
		t.Fatalf("moveToFreedesktopTrash: %v", err)
	}
	if _, err := os.Stat(src); !os.IsNotExist(err) {
		t.Fatalf("source still exists: %v", err)
	}

	trashed := filepath.Join(dataHome, "Trash", "files", "sample.txt")
	if _, err := os.Stat(trashed); err != nil {
		t.Fatalf("trashed file missing: %v", err)
	}

	infoPath := filepath.Join(dataHome, "Trash", "info", "sample.txt.trashinfo")
	raw, err := os.ReadFile(infoPath)
	if err != nil {
		t.Fatalf("trashinfo missing: %v", err)
	}
	if !strings.Contains(string(raw), "Path=") || !strings.Contains(string(raw), "DeletionDate=") {
		t.Fatalf("unexpected trashinfo: %q", string(raw))
	}
}

func TestUniqueTrashEntryName(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "file.txt"), []byte("a"), 0o644); err != nil {
		t.Fatal(err)
	}
	got := uniqueTrashEntryName(dir, "file.txt")
	if got != "file.1.txt" {
		t.Fatalf("uniqueTrashEntryName() = %q, want file.1.txt", got)
	}
}
