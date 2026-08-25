package main

import (
	"os"
	"path/filepath"
	"reflect"
	"strings"
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
	got := knownRepos(repoState{
		Current: "/now",
		Repos:   []string{"/old", "/now", "/other"},
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
	body := "[current repo]\npath = /Users/me/proj\n\n[ui]\ntheme = dark\nlanguage = ru\n"
	if err := os.WriteFile(filepath.Join(dir, "setup.cfg"), []byte(body), 0o644); err != nil {
		t.Fatal(err)
	}
	cfg, err := loadSetupCfg()
	if err != nil {
		t.Fatal(err)
	}
	repos, err := loadRepoState()
	if err != nil {
		t.Fatal(err)
	}
	info := settingsFromCfg(cfg, repos)
	if info.Locale != "ru" {
		t.Fatalf("locale = %q", info.Locale)
	}
	if info.Theme != "dark" {
		t.Fatalf("theme = %q", info.Theme)
	}
	if len(info.Repos) != 1 || info.Repos[0] != "/Users/me/proj" {
		t.Fatalf("repos = %v", info.Repos)
	}
	moved, err := os.ReadFile(filepath.Join(dir, "repos.cfg"))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(moved), "/Users/me/proj") {
		t.Fatalf("repos.cfg = %s", moved)
	}
	setup, err := os.ReadFile(filepath.Join(dir, "setup.cfg"))
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(setup), "[current repo]") || strings.Contains(string(setup), "[repo]") {
		t.Fatalf("setup.cfg still has repo sections: %s", setup)
	}
	if !strings.Contains(string(setup), "theme = dark") {
		t.Fatalf("setup.cfg missing theme: %s", setup)
	}
}

func TestRememberRepoWritesReposFileNotSetupCfg(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	first := "/Users/me/film"
	second := "/Users/me/ads"
	if err := rememberRepo(first); err != nil {
		t.Fatal(err)
	}
	setupPath := filepath.Join(home, ".dfm", "setup.cfg")
	if _, err := os.Stat(setupPath); !os.IsNotExist(err) {
		t.Fatalf("setup.cfg should stay untouched, err=%v", err)
	}
	state, err := loadRepoState()
	if err != nil {
		t.Fatal(err)
	}
	if state.Current != first {
		t.Fatalf("current = %q", state.Current)
	}
	if !reflect.DeepEqual(state.Repos, []string{first}) {
		t.Fatalf("repos after first = %v", state.Repos)
	}
	if err := rememberRepo(second); err != nil {
		t.Fatal(err)
	}
	state, err = loadRepoState()
	if err != nil {
		t.Fatal(err)
	}
	if state.Current != second {
		t.Fatalf("current after switch = %q", state.Current)
	}
	if !reflect.DeepEqual(state.Repos, []string{second, first}) {
		t.Fatalf("repos after switch = %v", state.Repos)
	}
}

func TestWriteSetupCfgKeepsInstallerKeysAndLeavesReposFile(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	dir := filepath.Join(home, ".dfm")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	body := "[current repo]\npath = /Users/me/proj\n\n[forester]\npath = /opt/bin/forester\nffmpeg_path = /opt/bin/ffmpeg\ninstalled = true\n"
	if err := os.WriteFile(filepath.Join(dir, "setup.cfg"), []byte(body), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := updateSetupCfg(func(cfg *setupCfg) {
		cfg.Locale = "ru"
	}); err != nil {
		t.Fatal(err)
	}
	cfg, err := loadSetupCfg()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Locale != "ru" {
		t.Fatalf("locale = %q", cfg.Locale)
	}
	if cfg.raw["forester"]["ffmpeg_path"] != "/opt/bin/ffmpeg" || cfg.raw["forester"]["installed"] != "true" {
		t.Fatalf("forester = %v", cfg.raw["forester"])
	}
	if _, ok := cfg.raw["current repo"]; ok {
		t.Fatal("setup.cfg still has current repo")
	}
	state, err := loadRepoState()
	if err != nil {
		t.Fatal(err)
	}
	if state.Current != "/Users/me/proj" || !reflect.DeepEqual(state.Repos, []string{"/Users/me/proj"}) {
		t.Fatalf("repo state = %+v", state)
	}
}
