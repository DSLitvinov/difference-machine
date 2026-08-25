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

func TestResolveBlenderExecutableFromAppBundle(t *testing.T) {
	root := t.TempDir()
	bundle := filepath.Join(root, "Blender.app")
	macOSDir := filepath.Join(bundle, "Contents", "MacOS")
	if err := os.MkdirAll(macOSDir, 0o755); err != nil {
		t.Fatal(err)
	}
	binary := filepath.Join(macOSDir, "Blender")
	if err := os.WriteFile(binary, []byte("#!/bin/sh"), 0o755); err != nil {
		t.Fatal(err)
	}
	got := resolveBlenderExecutable(bundle)
	if got != binary {
		t.Fatalf("resolveBlenderExecutable = %q, want %q", got, binary)
	}
	if got := resolveBlenderExecutable(binary); got != binary {
		t.Fatalf("resolveBlenderExecutable(binary) = %q, want %q", got, binary)
	}
}

func TestRepoHasBlendMergeMarks(t *testing.T) {
	repoPath := t.TempDir()
	if err := utils.EnsureDirectory(filepath.Join(repoPath, ".DFM")); err != nil {
		t.Fatal(err)
	}
	repo, err := core.OpenRepository(repoPath)
	if err != nil {
		t.Fatal(err)
	}
	defer repo.Close()

	plain := models.NewObject("blender", "scene.blend", "Cube", "MESH", "head-a")
	if err := repo.Manifests.AddObject(plain); err != nil {
		t.Fatal(err)
	}
	if repoHasBlendMergeMarks(repo, "head-a") {
		t.Fatal("expected no merge marks for untagged object")
	}

	marked := models.NewObject("blender", "scene.blend", "Sphere", "MESH", "head-b")
	marked.Tags = []string{"DELETE"}
	if err := repo.Manifests.AddObject(marked); err != nil {
		t.Fatal(err)
	}
	if !repoHasBlendMergeMarks(repo, "head-a", "head-b") {
		t.Fatal("expected merge marks on head-b")
	}
}

func TestResolveMergeApplyScriptFromBackendSources(t *testing.T) {
	root := t.TempDir()
	scriptDir := filepath.Join(root, "sources", "backend", "forester", "scripts")
	if err := os.MkdirAll(scriptDir, 0o755); err != nil {
		t.Fatal(err)
	}
	scriptPath := filepath.Join(scriptDir, "merge_apply_background.py")
	if err := os.WriteFile(scriptPath, []byte("# test"), 0o644); err != nil {
		t.Fatal(err)
	}
	start := filepath.Join(root, "sources", "frontend", "dfm-gui")
	if err := os.MkdirAll(start, 0o755); err != nil {
		t.Fatal(err)
	}
	got := resolveMergeApplyScriptFromDir(start)
	if got != scriptPath {
		t.Fatalf("resolveMergeApplyScriptFromDir = %q, want %q", got, scriptPath)
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

	got := resolveMergeApplyScript("", foresterCLI, "")
	if got != scriptPath {
		t.Fatalf("resolveMergeApplyScript = %q, want %q", got, scriptPath)
	}
}

func TestMergeApplyScriptInAddon(t *testing.T) {
	root := t.TempDir()
	scriptDir := filepath.Join(root, "difference_machine", "scripts")
	if err := os.MkdirAll(scriptDir, 0o755); err != nil {
		t.Fatal(err)
	}
	scriptPath := filepath.Join(scriptDir, "merge_apply_background.py")
	if err := os.WriteFile(scriptPath, []byte("# test"), 0o644); err != nil {
		t.Fatal(err)
	}

	addonRoot := filepath.Join(root, "difference_machine")
	got := mergeApplyScriptInAddon(addonRoot)
	if got != scriptPath {
		t.Fatalf("mergeApplyScriptInAddon(dir) = %q, want %q", got, scriptPath)
	}

	initPy := filepath.Join(addonRoot, "__init__.py")
	if err := os.WriteFile(initPy, []byte(""), 0o644); err != nil {
		t.Fatal(err)
	}
	got = mergeApplyScriptInAddon(initPy)
	if got != scriptPath {
		t.Fatalf("mergeApplyScriptInAddon(file) = %q, want %q", got, scriptPath)
	}
}

func TestResolveMergeApplyScript_PrefersAddonPath(t *testing.T) {
	t.Setenv("DFM_MERGE_APPLY_SCRIPT", "")
	root := t.TempDir()
	addonScriptDir := filepath.Join(root, "addon", "scripts")
	if err := os.MkdirAll(addonScriptDir, 0o755); err != nil {
		t.Fatal(err)
	}
	addonScript := filepath.Join(addonScriptDir, "merge_apply_background.py")
	if err := os.WriteFile(addonScript, []byte("# addon"), 0o644); err != nil {
		t.Fatal(err)
	}

	foresterScriptDir := filepath.Join(root, "Forester.app", "Contents", "Resources", "share", "scripts")
	if err := os.MkdirAll(foresterScriptDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(foresterScriptDir, "merge_apply_background.py"), []byte("# forester"), 0o644); err != nil {
		t.Fatal(err)
	}
	foresterCLI := filepath.Join(root, "Forester.app", "Contents", "Resources", "bin", "forester")
	if err := os.MkdirAll(filepath.Dir(foresterCLI), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(foresterCLI, []byte("#!/bin/sh"), 0o755); err != nil {
		t.Fatal(err)
	}

	got := resolveMergeApplyScript("", foresterCLI, filepath.Join(root, "addon"))
	if got != addonScript {
		t.Fatalf("resolveMergeApplyScript = %q, want addon %q", got, addonScript)
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
