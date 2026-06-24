package install

import (
	"archive/zip"
	"os"
	"path/filepath"
	"testing"
)

func TestResolveAddonDirFromZip(t *testing.T) {
	root := t.TempDir()
	addonDir := filepath.Join(root, addonRelative)
	zipPath := filepath.Join(root, addonZipRelative)

	if err := os.MkdirAll(filepath.Dir(zipPath), 0o755); err != nil {
		t.Fatal(err)
	}

	manifest := filepath.Join("difference_machine", "blender_manifest.toml")
	createTestZip(t, zipPath, map[string]string{
		manifest:                  "schema_version = \"1.0.0\"\n",
		"difference_machine/__init__.py": "# addon\n",
	})

	got, ok := resolveAddonDir(root)
	if !ok {
		t.Fatal("expected addon dir from zip")
	}
	if got != addonDir {
		t.Fatalf("dir: got %q want %q", got, addonDir)
	}
	if _, err := os.Stat(filepath.Join(addonDir, "blender_manifest.toml")); err != nil {
		t.Fatalf("expected extracted manifest: %v", err)
	}
}

func TestResolveAddonDirPrefersExistingDirectory(t *testing.T) {
	root := t.TempDir()
	addonDir := filepath.Join(root, addonRelative)
	zipPath := filepath.Join(root, addonZipRelative)

	if err := os.MkdirAll(addonDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(addonDir, "blender_manifest.toml"), []byte("ok"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Dir(zipPath), 0o755); err != nil {
		t.Fatal(err)
	}
	createTestZip(t, zipPath, map[string]string{
		"difference_machine/blender_manifest.toml": "stale\n",
	})

	got, ok := resolveAddonDir(root)
	if !ok {
		t.Fatal("expected existing addon dir")
	}
	if got != addonDir {
		t.Fatalf("dir: got %q want %q", got, addonDir)
	}
	data, err := os.ReadFile(filepath.Join(addonDir, "blender_manifest.toml"))
	if err != nil {
		t.Fatal(err)
	}
	if string(data) != "ok" {
		t.Fatalf("existing dir was overwritten: %q", string(data))
	}
}

func createTestZip(t *testing.T, zipPath string, files map[string]string) {
	t.Helper()

	f, err := os.Create(zipPath)
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()

	w := zip.NewWriter(f)
	for name, content := range files {
		entry, err := w.Create(name)
		if err != nil {
			t.Fatal(err)
		}
		if _, err := entry.Write([]byte(content)); err != nil {
			t.Fatal(err)
		}
	}
	if err := w.Close(); err != nil {
		t.Fatal(err)
	}
}
