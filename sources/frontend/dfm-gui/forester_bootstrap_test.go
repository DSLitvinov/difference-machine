package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestNormalizeApplicationPathLiftsBundle(t *testing.T) {
	got := normalizeApplicationPath("/Applications/Blender.app/Contents/MacOS/Blender", "darwin")
	want := "/Applications/Blender.app"
	if got != want {
		t.Fatalf("normalize = %q, want %q", got, want)
	}
	if got := normalizeApplicationPath(`C:\Apps\blender.exe`, "windows"); got != `C:\Apps\blender.exe` {
		t.Fatalf("windows path changed: %q", got)
	}
}

func TestDiscoverMacBundleLayout(t *testing.T) {
	root := t.TempDir()
	exe := filepath.Join(root, "Difference Machine.app", "Contents", "MacOS", "difference-machine")
	cli := filepath.Join(root, "Forester.app", "Contents", "Resources", "bin", "forester")
	api := filepath.Join(root, "Forester.app", "Contents", "Frameworks", "libforester.dylib")
	addon := filepath.Join(root, "addons", "blender", "difference_machine")
	mustTouch(t, exe)
	mustTouch(t, cli)
	mustTouch(t, api)
	if err := os.MkdirAll(addon, 0o755); err != nil {
		t.Fatal(err)
	}

	lay := discoverForesterLayout(exe, "darwin")
	if lay.CLI != cli || lay.API != api || lay.Addon != addon {
		t.Fatalf("layout = %+v", lay)
	}
}

func TestDiscoverFlatLayout(t *testing.T) {
	root := t.TempDir()
	exe := filepath.Join(root, "apps", "Difference Machine.app", "Contents", "MacOS", "difference-machine")
	cli := filepath.Join(root, "bin", "forester")
	api := filepath.Join(root, "lib", "libforester.dylib")
	mustTouch(t, exe)
	mustTouch(t, cli)
	mustTouch(t, api)

	lay := discoverForesterLayout(exe, "darwin")
	if lay.CLI != cli || lay.API != api {
		t.Fatalf("layout = %+v", lay)
	}
}

func TestDiscoverWindowsLayout(t *testing.T) {
	root := t.TempDir()
	exe := filepath.Join(root, "difference-machine.exe")
	cli := filepath.Join(root, "bin", "forester.exe")
	api := filepath.Join(root, "lib", "forester.dll")
	mustTouch(t, exe)
	mustTouch(t, cli)
	mustTouch(t, api)

	lay := discoverForesterLayout(exe, "windows")
	if lay.CLI != cli || lay.API != api {
		t.Fatalf("layout = %+v", lay)
	}
}

func TestFillForesterDefaultsKeepsExisting(t *testing.T) {
	dir := t.TempDir()
	cfg := setupCfg{
		ForesterPath: filepath.Join(dir, "forester"),
		APIPath:      filepath.Join(dir, "libforester.dylib"),
		raw:          map[string]map[string]string{},
	}
	mustTouch(t, cfg.ForesterPath)
	mustTouch(t, cfg.APIPath)
	changed := fillForesterDefaults(&cfg, foresterLayout{
		CLI: "/other/forester",
		API: "/other/libforester.dylib",
	})
	if changed {
		t.Fatal("existing paths were replaced")
	}
	if cfg.ForesterPath != filepath.Join(dir, "forester") || cfg.APIPath != filepath.Join(dir, "libforester.dylib") {
		t.Fatalf("cfg = %+v", cfg)
	}
}

func TestEnsureForesterDefaultsWritesSetupCfg(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	t.Setenv("USERPROFILE", home)

	root := t.TempDir()
	exe := filepath.Join(root, "bin", "forester")
	api := filepath.Join(root, "lib", "libforester.so")
	mustTouch(t, exe)
	mustTouch(t, api)
	lay := discoverForesterLayout(filepath.Join(root, "difference-machine"), "linux")
	cfg, err := loadSetupCfg()
	if err != nil {
		t.Fatal(err)
	}
	if !fillForesterDefaults(&cfg, lay) {
		t.Fatal("expected defaults to fill an empty config")
	}
	if err := writeSetupCfg(cfg); err != nil {
		t.Fatal(err)
	}
	loaded, err := loadSetupCfg()
	if err != nil {
		t.Fatal(err)
	}
	if loaded.ForesterPath != exe || loaded.APIPath != api {
		t.Fatalf("loaded = %+v", loaded)
	}
	raw, err := os.ReadFile(filepath.Join(home, ".dfm", "setup.cfg"))
	if err != nil {
		t.Fatal(err)
	}
	text := string(raw)
	if !strings.Contains(text, "installed = true") {
		t.Fatalf("setup.cfg missing installed flag:\n%s", text)
	}
}

func TestDiscoverFallsBackToDefaultInstallRoot(t *testing.T) {
	root := t.TempDir()
	cli := filepath.Join(root, "Forester.app", "Contents", "Resources", "bin", "forester")
	api := filepath.Join(root, "Forester.app", "Contents", "Frameworks", "libforester.dylib")
	mustTouch(t, cli)
	mustTouch(t, api)

	lay := discoverInRoots([]string{filepath.Join(t.TempDir(), "unrelated"), root}, "darwin")
	if lay.CLI != cli || lay.API != api {
		t.Fatalf("layout = %+v", lay)
	}
	roots := defaultInstallRoots("darwin")
	if len(roots) != 1 || roots[0] != "/Applications/Difference Machine" {
		t.Fatalf("darwin defaults = %v", roots)
	}
}

func TestFillReplacesSetupCfgAsAPIPath(t *testing.T) {
	root := t.TempDir()
	exe := filepath.Join(root, "Difference Machine.app", "Contents", "MacOS", "difference-machine")
	cli := filepath.Join(root, "Forester.app", "Contents", "Resources", "bin", "forester")
	api := filepath.Join(root, "Forester.app", "Contents", "Frameworks", "libforester.dylib")
	cfgFile := filepath.Join(t.TempDir(), "setup.cfg")
	mustTouch(t, exe)
	mustTouch(t, cli)
	mustTouch(t, api)
	mustTouch(t, cfgFile)

	cfg := setupCfg{APIPath: cfgFile, raw: map[string]map[string]string{}}
	lay := discoverForesterLayout(exe, "darwin")
	if !fillForesterDefaults(&cfg, lay) {
		t.Fatal("setup.cfg stored as the API path should be replaced")
	}
	if cfg.APIPath != api {
		t.Fatalf("api = %s, want %s", cfg.APIPath, api)
	}
	if got := resolveAPILibrary(cli); got != api {
		t.Fatalf("resolve = %s, want %s", got, api)
	}
}

func mustTouch(t *testing.T, path string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte("x"), 0o755); err != nil {
		t.Fatal(err)
	}
}
