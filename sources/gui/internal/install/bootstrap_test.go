package install

import (
	"os"
	"path/filepath"
	"testing"
)

func TestToolchainAtRoot(t *testing.T) {
	root := t.TempDir()
	foresterMacOS := filepath.Join(root, foresterAppName, "Contents", "MacOS")
	foresterFrameworks := filepath.Join(root, foresterAppName, "Contents", "Frameworks")
	addon := filepath.Join(root, addonRelative)

	if err := os.MkdirAll(foresterMacOS, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(foresterFrameworks, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(addon, 0o755); err != nil {
		t.Fatal(err)
	}

	cli := filepath.Join(foresterMacOS, "Forester")
	if err := os.WriteFile(cli, []byte("#!/bin/sh\n"), 0o755); err != nil {
		t.Fatal(err)
	}
	realCLI := filepath.Join(root, foresterAppName, "Contents", "Resources", "forester")
	if err := os.MkdirAll(filepath.Dir(realCLI), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(realCLI, []byte{0}, 0o755); err != nil {
		t.Fatal(err)
	}
	cliWrapper := filepath.Join(root, foresterAppName, "Contents", "Resources", "bin", "forester")
	if err := os.MkdirAll(filepath.Dir(cliWrapper), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(cliWrapper, []byte("#!/bin/sh\n"), 0o755); err != nil {
		t.Fatal(err)
	}

	api := filepath.Join(foresterFrameworks, "libforester.dylib")
	if err := os.WriteFile(api, []byte{0}, 0o644); err != nil {
		t.Fatal(err)
	}

	got, ok := macToolchainAtRoot(root)
	if !ok {
		t.Fatal("expected valid layout")
	}
	if got.ForesterCLI != cliWrapper {
		t.Fatalf("cli: got %q want %q", got.ForesterCLI, cliWrapper)
	}
	if got.APILib != api {
		t.Fatalf("api: got %q want %q", got.APILib, api)
	}
	if got.AddonDir != addon {
		t.Fatalf("addon: got %q want %q", got.AddonDir, addon)
	}
}
