package install

import (
	"os"
	"path/filepath"
	"testing"
)

func TestPortableToolchainAtRoot(t *testing.T) {
	root := t.TempDir()
	cliName, apiName := portableBinaryNames()

	cli := filepath.Join(root, portableCLIRelative, cliName)
	api := filepath.Join(root, portableLibRelative, apiName)
	addon := filepath.Join(root, addonRelative)

	if err := os.MkdirAll(filepath.Dir(cli), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(cli, []byte{0}, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Dir(api), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(api, []byte{0}, 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(addon, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(addon, "blender_manifest.toml"), []byte("ok"), 0o644); err != nil {
		t.Fatal(err)
	}

	got, ok := portableToolchainAtRoot(root)
	if !ok {
		t.Fatal("expected valid portable layout")
	}
	if got.ForesterCLI != cli {
		t.Fatalf("cli: got %q want %q", got.ForesterCLI, cli)
	}
	if got.APILib != api {
		t.Fatalf("api: got %q want %q", got.APILib, api)
	}
	if got.AddonDir != addon {
		t.Fatalf("addon: got %q want %q", got.AddonDir, addon)
	}
}

func TestPortableToolchainAtRootFromZip(t *testing.T) {
	root := t.TempDir()
	cliName, apiName := portableBinaryNames()

	cli := filepath.Join(root, portableCLIRelative, cliName)
	api := filepath.Join(root, portableLibRelative, apiName)
	addonDir := filepath.Join(root, addonRelative)
	zipPath := filepath.Join(root, addonZipRelative)

	if err := os.MkdirAll(filepath.Dir(cli), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(cli, []byte{0}, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Dir(api), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(api, []byte{0}, 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Dir(zipPath), 0o755); err != nil {
		t.Fatal(err)
	}
	createTestZip(t, zipPath, map[string]string{
		"difference_machine/blender_manifest.toml": "schema_version = \"1.0.0\"\n",
	})

	got, ok := portableToolchainAtRoot(root)
	if !ok {
		t.Fatal("expected portable layout with zip addon")
	}
	if got.AddonDir != addonDir {
		t.Fatalf("addon: got %q want %q", got.AddonDir, addonDir)
	}
}
