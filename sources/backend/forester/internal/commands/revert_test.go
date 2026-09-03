package commands_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/difference-machine/forester/internal/commands"
	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/models"
)

func TestRevertCommitPreservesUnchangedFiles(t *testing.T) {
	repoPath := t.TempDir()
	if err := commands.Init([]string{repoPath}); err != nil {
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

	if err := os.WriteFile(filepath.Join(repoPath, "a.txt"), []byte("a1"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(repoPath, "b.txt"), []byte("b1"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := commands.Add([]string{"."}); err != nil {
		t.Fatal(err)
	}
	if err := commands.Commit([]string{"initial"}); err != nil {
		t.Fatal(err)
	}

	if err := os.WriteFile(filepath.Join(repoPath, "a.txt"), []byte("a2"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := commands.Add([]string{"a.txt"}); err != nil {
		t.Fatal(err)
	}
	if err := commands.Commit([]string{"change a"}); err != nil {
		t.Fatal(err)
	}

	repo, err := core.OpenRepository(repoPath)
	if err != nil {
		t.Fatal(err)
	}
	changeHash, err := repo.GetBranchHead("main")
	if err != nil {
		t.Fatal(err)
	}
	if err := repo.Close(); err != nil {
		t.Fatal(err)
	}

	if err := commands.Revert([]string{changeHash}); err != nil {
		t.Fatal(err)
	}

	repo, err = core.OpenRepository(repoPath)
	if err != nil {
		t.Fatal(err)
	}
	defer repo.Close()
	revertHash, err := repo.GetBranchHead("main")
	if err != nil {
		t.Fatal(err)
	}
	revertCommit, err := repo.GetCommit(revertHash)
	if err != nil {
		t.Fatal(err)
	}
	treeContent, err := repo.Storage.GetTreeContent(revertCommit.TreeHash)
	if err != nil {
		t.Fatal(err)
	}
	var tree models.Tree
	if err := tree.FromJSON(treeContent); err != nil {
		t.Fatal(err)
	}
	treeMap := make(map[string]*models.TreeEntry)
	if err := core.BuildTreeMapRecursive(repo.Storage, &tree, "", treeMap); err != nil {
		t.Fatal(err)
	}
	if treeMap["a.txt"].Hash != core.HashBytes([]byte("a1")) {
		t.Fatalf("a.txt hash = %s, want original content", treeMap["a.txt"].Hash)
	}
	if treeMap["b.txt"].Hash != core.HashBytes([]byte("b1")) {
		t.Fatalf("b.txt missing or changed after revert")
	}
}
