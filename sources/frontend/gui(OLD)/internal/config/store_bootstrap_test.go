package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestNeedsForesterBootstrapRequiresAPILibrary(t *testing.T) {
	dir := t.TempDir()
	cfgPath := filepath.Join(dir, "setup.cfg")

	writeCfg := func(content string) {
		t.Helper()
		if err := os.WriteFile(cfgPath, []byte(content), 0o644); err != nil {
			t.Fatal(err)
		}
	}

	cli := filepath.Join(dir, "bin", "forester.exe")
	api := filepath.Join(dir, "lib", "forester.dll")
	addon := filepath.Join(dir, "addons", "blender", "difference_machine")

	for _, path := range []string{cli, api, addon} {
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, []byte{0}, 0o644); err != nil {
			t.Fatal(err)
		}
	}

	store := &Store{path: cfgPath, data: make(map[string]map[string]string)}

	writeCfg(`[forester]
path = ` + cli + `

[addons]
diffmachine_path = ` + addon + `
`)
	if err := store.Load(); err != nil {
		t.Fatal(err)
	}
	if !store.NeedsForesterBootstrap() {
		t.Fatal("expected bootstrap when [api] path is missing")
	}

	writeCfg(`[forester]
path = ` + cli + `

[api]
path = ` + api + `

[addons]
diffmachine_path = ` + addon + `
`)
	if err := store.Load(); err != nil {
		t.Fatal(err)
	}
	if store.NeedsForesterBootstrap() {
		t.Fatal("expected no bootstrap when forester, api, and addon paths exist")
	}
}
