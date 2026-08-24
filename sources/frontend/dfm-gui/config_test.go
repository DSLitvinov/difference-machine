package main

import (
	"os"
	"path/filepath"
	"reflect"
	"testing"
)

func TestLoadPathListSkipsHolesAndBarePath(t *testing.T) {
	got := loadPathList(map[string]string{
		"path":   "/bare",
		"path_1": "/one",
		"path_2": "",
		"path_3": "/three",
	})
	want := []string{"/bare", "/one", "/three"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("loadPathList = %v, want %v", got, want)
	}
}

func TestKnownReposPutsCurrentFirstAndDedupes(t *testing.T) {
	got := knownRepos(setupCfg{
		CurrentRepo: "/now",
		Repos:       []string{"/old", "/now", "/other"},
	})
	want := []string{"/now", "/old", "/other"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("knownRepos = %v, want %v", got, want)
	}
}

func TestLoadSetupCfgSettingsIncludeCurrentRepo(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	dir := filepath.Join(home, ".dfm")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	body := "[current repo]\npath = /Users/me/proj\n\n[ui]\ntheme = dark\n"
	if err := os.WriteFile(filepath.Join(dir, "setup.cfg"), []byte(body), 0o644); err != nil {
		t.Fatal(err)
	}
	cfg, err := loadSetupCfg()
	if err != nil {
		t.Fatal(err)
	}
	info := settingsFromCfg(cfg)
	if info.Theme != "dark" {
		t.Fatalf("theme = %q", info.Theme)
	}
	if len(info.Repos) != 1 || info.Repos[0] != "/Users/me/proj" {
		t.Fatalf("repos = %v", info.Repos)
	}
}
