package core

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/difference-machine/forester/internal/models"
	"github.com/difference-machine/forester/internal/utils"
)

func TestManifestStore_AddAndGetObject(t *testing.T) {
	repoPath := t.TempDir()
	store := NewManifestStore(repoPath)

	obj := models.NewObject("blender", "scene.blend", "Cube", "MESH", "commit1")
	if err := store.AddObject(obj); err != nil {
		t.Fatalf("AddObject: %v", err)
	}

	got, err := store.GetObject("commit1", "scene.blend", "Cube")
	if err != nil {
		t.Fatalf("GetObject: %v", err)
	}
	if got.ObjectName != "Cube" {
		t.Fatalf("ObjectName = %q", got.ObjectName)
	}

	byFile, err := store.GetObjectsByFile("commit1", "scene.blend")
	if err != nil {
		t.Fatalf("GetObjectsByFile: %v", err)
	}
	if len(byFile) != 1 {
		t.Fatalf("GetObjectsByFile len = %d", len(byFile))
	}
}

func TestManifestStore_FindObjectsByFileAcrossCommits(t *testing.T) {
	repoPath := t.TempDir()
	store := NewManifestStore(repoPath)

	stale := models.NewObject("blender", "scene.blend", "Cube", "MESH", "stale-commit")
	stale.Tags = []string{"DELETE"}
	stale.UpdatedAt = 10
	if err := store.AddObject(stale); err != nil {
		t.Fatalf("AddObject stale: %v", err)
	}

	current := models.NewObject("blender", "scene.blend", "Cube", "MESH", "current-commit")
	current.Tags = []string{"MERGE"}
	current.UpdatedAt = 20
	if err := store.AddObject(current); err != nil {
		t.Fatalf("AddObject current: %v", err)
	}

	objects, err := store.GetObjectsByFile("missing-commit", "scene.blend")
	if err != nil {
		t.Fatalf("GetObjectsByFile fallback: %v", err)
	}
	if len(objects) != 1 {
		t.Fatalf("GetObjectsByFile fallback len = %d", len(objects))
	}
	if objects[0].Tags[0] != "MERGE" {
		t.Fatalf("expected newest tagged object, got %#v", objects[0].Tags)
	}
}

func TestManifestStoreRejectsTraversalCommitHash(t *testing.T) {
	repoPath := t.TempDir()
	store := NewManifestStore(repoPath)
	outside := filepath.Join(repoPath, ".DFM", "outside", "b64:c2NlbmUuYmxlbmQ.json")

	obj := models.NewObject("blender", "scene.blend", "Cube", "MESH", "../outside")
	if err := store.AddObject(obj); err == nil {
		t.Fatal("AddObject accepted traversal commit hash")
	}
	if _, err := os.Stat(outside); !os.IsNotExist(err) {
		t.Fatalf("outside manifest was created: %v", err)
	}
	if err := store.DeleteManifestsForCommit("../outside"); err == nil {
		t.Fatal("DeleteManifestsForCommit accepted traversal commit hash")
	}
}

func TestMergeConfig_IsBinaryMergePath(t *testing.T) {
	repoPath := t.TempDir()
	configDir := filepath.Join(repoPath, ".DFM")
	if err := utils.EnsureDirectory(configDir); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	config := `[merge]
    binary = *.blend,*.png
`
	if err := os.WriteFile(filepath.Join(configDir, "config"), []byte(config), 0644); err != nil {
		t.Fatalf("write config: %v", err)
	}

	cfg := NewMergeConfig(repoPath)
	if !cfg.IsBinaryMergePath("assets/hero.blend") {
		t.Fatal("expected .blend to use binary merge")
	}
	if !cfg.IsTextMergePath("scripts/run.py") {
		t.Fatal("expected .py to use text merge")
	}
}
