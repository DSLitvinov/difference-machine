package jsonapi_test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestWorkdirRenameAllowsNewDestination(t *testing.T) {
	dir, h := initTestRepo(t)
	if err := os.MkdirAll(filepath.Join(dir, "assets"), 0o755); err != nil {
		t.Fatal(err)
	}
	oldPath := filepath.Join(dir, "assets", "old.txt")
	if err := os.WriteFile(oldPath, []byte("hello"), 0o644); err != nil {
		t.Fatal(err)
	}

	raw := mustOK(t, h, "workdir.rename", `{"path":"assets/old.txt","new_name":"new.txt"}`)
	var result struct {
		NewPath string `json:"new_path"`
	}
	if err := json.Unmarshal(raw, &result); err != nil {
		t.Fatal(err)
	}
	if result.NewPath != "assets/new.txt" {
		t.Fatalf("new_path = %q, want assets/new.txt", result.NewPath)
	}
	if _, err := os.Stat(oldPath); !os.IsNotExist(err) {
		t.Fatalf("old path still exists: %v", err)
	}
	if got, err := os.ReadFile(filepath.Join(dir, "assets", "new.txt")); err != nil || string(got) != "hello" {
		t.Fatalf("renamed file = %q, %v", string(got), err)
	}
}
