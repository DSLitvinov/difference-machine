package commands

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/models"
	"github.com/difference-machine/forester/internal/utils"
)

func TestTaggedObjectsForBlendMerge_PrefersNewestAcrossCommits(t *testing.T) {
	repoPath := t.TempDir()
	if err := utils.EnsureDirectory(filepath.Join(repoPath, ".DFM")); err != nil {
		t.Fatal(err)
	}
	repo, err := core.OpenRepository(repoPath)
	if err != nil {
		t.Fatal(err)
	}
	defer repo.Close()

	stale := models.NewObject("blender", "scene.blend", "Cube", "MESH", "head-old")
	stale.Tags = []string{"DELETE"}
	stale.UpdatedAt = 10
	if err := repo.Manifests.AddObject(stale); err != nil {
		t.Fatal(err)
	}

	current := models.NewObject("blender", "scene.blend", "Cube", "MESH", "head-new")
	current.Tags = []string{"MERGE"}
	current.UpdatedAt = 20
	if err := repo.Manifests.AddObject(current); err != nil {
		t.Fatal(err)
	}

	tagged, err := taggedObjectsForBlendMerge(repo, "missing-head", "also-missing", "scene.blend")
	if err != nil {
		t.Fatal(err)
	}
	if len(tagged) != 1 {
		t.Fatalf("tagged len = %d, want 1", len(tagged))
	}
	if tagged[0].Tags[0] != "MERGE" {
		t.Fatalf("tags = %#v, want MERGE", tagged[0].Tags)
	}
}

func TestResolveMergeApplyScriptFromDir(t *testing.T) {
	root := t.TempDir()
	scriptDir := filepath.Join(root, "share", "scripts")
	if err := os.MkdirAll(scriptDir, 0o755); err != nil {
		t.Fatal(err)
	}
	scriptPath := filepath.Join(scriptDir, "merge_apply_background.py")
	if err := os.WriteFile(scriptPath, []byte("# test"), 0o644); err != nil {
		t.Fatal(err)
	}

	binDir := filepath.Join(root, "bin")
	if err := os.MkdirAll(binDir, 0o755); err != nil {
		t.Fatal(err)
	}
	got := resolveMergeApplyScriptFromDir(binDir)
	if got != scriptPath {
		t.Fatalf("resolveMergeApplyScriptFromDir = %q, want %q", got, scriptPath)
	}
}

func TestResolveMergeApplyScript_PrefersForesterCLI(t *testing.T) {
	root := t.TempDir()
	scriptDir := filepath.Join(root, "Forester.app", "Contents", "Resources", "share", "scripts")
	if err := os.MkdirAll(scriptDir, 0o755); err != nil {
		t.Fatal(err)
	}
	scriptPath := filepath.Join(scriptDir, "merge_apply_background.py")
	if err := os.WriteFile(scriptPath, []byte("# test"), 0o644); err != nil {
		t.Fatal(err)
	}
	foresterCLI := filepath.Join(root, "Forester.app", "Contents", "Resources", "bin", "forester")
	if err := os.MkdirAll(filepath.Dir(foresterCLI), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(foresterCLI, []byte("#!/bin/sh"), 0o755); err != nil {
		t.Fatal(err)
	}

	got := resolveMergeApplyScript("", foresterCLI)
	if got != scriptPath {
		t.Fatalf("resolveMergeApplyScript = %q, want %q", got, scriptPath)
	}
}

func TestEnsureTheirsBlendStaging(t *testing.T) {
	repoPath := t.TempDir()
	storage, err := core.NewStorage(repoPath)
	if err != nil {
		t.Fatal(err)
	}

	blobPath := filepath.Join(repoPath, "theirs.blend")
	if err := os.WriteFile(blobPath, []byte("blend-bytes"), 0o644); err != nil {
		t.Fatal(err)
	}
	hash, err := core.HashFile(blobPath)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := storage.StoreBlobFromFile(blobPath); err != nil {
		t.Fatal(err)
	}

	if err := ensureTheirsBlendStaging(repoPath, "assets/scene.blend", hash, storage); err != nil {
		t.Fatal(err)
	}
	theirsPath := filepath.Join(repoPath, ".DFM", "merge_theirs", "assets", "scene.blend")
	if !utils.Exists(theirsPath) {
		t.Fatalf("expected theirs blend at %s", theirsPath)
	}
}
