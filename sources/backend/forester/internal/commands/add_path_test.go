package commands_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/difference-machine/forester/internal/commands"
)

func TestAddRejectsPathOutsideRepository(t *testing.T) {
	repoPath := t.TempDir()
	if err := commands.Init([]string{repoPath}); err != nil {
		t.Fatal(err)
	}
	outside := filepath.Join(filepath.Dir(repoPath), "outside.txt")
	if err := os.WriteFile(outside, []byte("secret"), 0o644); err != nil {
		t.Fatal(err)
	}

	cwd, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := os.Chdir(cwd); err != nil {
			t.Fatal(err)
		}
	})
	if err := os.Chdir(repoPath); err != nil {
		t.Fatal(err)
	}

	if err := commands.Add([]string{outside}); err == nil {
		t.Fatal("Add accepted an absolute path outside the repository")
	}
	if err := commands.Add([]string{"../outside.txt"}); err == nil {
		t.Fatal("Add accepted a relative path outside the repository")
	}
}
