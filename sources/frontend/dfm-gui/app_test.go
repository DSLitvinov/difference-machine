package main

import (
	"os"
	"path/filepath"
	"reflect"
	"testing"
)

func TestIsForesterRepo(t *testing.T) {
	dir := t.TempDir()
	if isForesterRepo(dir) {
		t.Fatal("empty directory is not a repository")
	}
	if err := os.Mkdir(filepath.Join(dir, ".DFM"), 0o755); err != nil {
		t.Fatal(err)
	}
	if !isForesterRepo(dir) {
		t.Fatal("directory with .DFM should be a repository")
	}
}

func TestEnvelopeError(t *testing.T) {
	if msg := envelopeError([]byte(`{"ok":true,"result":{}}`)); msg != "" {
		t.Fatalf("unexpected error: %s", msg)
	}
	if msg := envelopeError([]byte(`{"ok":false,"error":"not a Forester repository"}`)); msg != "not a Forester repository" {
		t.Fatalf("got %q", msg)
	}
}

func TestWatchIgnored(t *testing.T) {
	root := t.TempDir()
	thumbs := filepath.Join(root, ".DFM", "cache", "thumbs", "a.png")
	if !watchIgnored(root, thumbs) {
		t.Fatal(".DFM cache should be ignored")
	}
	if !watchIgnored(root, filepath.Join(root, ".DFM")) {
		t.Fatal(".DFM should be ignored")
	}
	if watchIgnored(root, filepath.Join(root, "readme.txt")) {
		t.Fatal("workdir file should not be ignored")
	}
	if watchIgnored(root, root) {
		t.Fatal("repo root should not be ignored")
	}
}

func TestNativeMenuCopy(t *testing.T) {
	en := nativeMenuCopyFor("en")
	if en.file != "File" || en.openFolder != "Open Folder" || en.addRepository != "Add repository" || en.branches != "Branches" || en.merge != "Merge" {
		t.Fatalf("english menu = %+v", en)
	}
	ru := nativeMenuCopyFor("ru")
	if ru.file != "Файл" || ru.openFolder != "Открыть папку" || ru.addRepository != "Добавить репозиторий" || ru.branches != "Ветки" || ru.merge != "Слияние" {
		t.Fatalf("russian menu = %+v", ru)
	}
}

func TestRepoMenuLabelsUsesFolderNameAndDisambiguates(t *testing.T) {
	got := repoMenuLabels([]string{"/Users/me/film", "/Users/me/ads", "/tmp/film"})
	want := []string{"/Users/me/film", "ads", "/tmp/film"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("labels = %v, want %v", got, want)
	}
}

func TestRepoMenuEntriesChecksCurrent(t *testing.T) {
	got := repoMenuEntries([]string{"/proj/a", "/proj/b"}, "/proj/b")
	if len(got) != 2 {
		t.Fatalf("len = %d", len(got))
	}
	if got[0].Label != "a" || got[0].Checked {
		t.Fatalf("first = %+v", got[0])
	}
	if got[1].Label != "b" || !got[1].Checked {
		t.Fatalf("second = %+v", got[1])
	}
}

func TestSettingsFromCfgIncludesCurrentRepo(t *testing.T) {
	info := settingsFromCfg(setupCfg{}, repoState{
		Current: "/tmp/project",
		Repos:   []string{"/tmp/other"},
	})
	if len(info.Repos) != 2 || info.Repos[0] != "/tmp/project" || info.Repos[1] != "/tmp/other" {
		t.Fatalf("repos = %v", info.Repos)
	}
}

func TestThumbCacheRoundTrip(t *testing.T) {
	dir := t.TempDir()
	if err := os.Mkdir(filepath.Join(dir, ".DFM"), 0o755); err != nil {
		t.Fatal(err)
	}
	app := &App{workPath: dir}
	const payload = "aGVsbG8=" // "hello"
	if err := app.WriteThumbCache("shots/a.png", 12, 99, payload); err != nil {
		t.Fatal(err)
	}
	got := app.ReadThumbCache("shots/a.png", 12, 99)
	if got != payload {
		t.Fatalf("cache hit = %q, want %q", got, payload)
	}
	if hit := app.ReadThumbCache("shots/a.png", 12, 100); hit != "" {
		t.Fatalf("mtime miss returned %q", hit)
	}
}
