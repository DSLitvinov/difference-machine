package jsonapi_test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestWorkdirIgnoreWritesDfmignore(t *testing.T) {
	dir, h := initTestRepo(t)
	writeFile(t, dir, "secret.blend", "data")
	if err := os.MkdirAll(filepath.Join(dir, "cache_dir"), 0o755); err != nil {
		t.Fatal(err)
	}
	writeFile(t, dir, "cache_dir/keep.txt", "keep")

	mustOK(t, h, "workdir.ignore", `{"paths":["secret.blend","cache_dir"]}`)

	raw, err := os.ReadFile(filepath.Join(dir, ".dfmignore"))
	if err != nil {
		t.Fatal(err)
	}
	text := string(raw)
	if !strings.Contains(text, "\nsecret.blend\n") && !strings.HasSuffix(text, "secret.blend\n") {
		t.Fatalf(".dfmignore missing secret.blend:\n%s", text)
	}
	if !strings.Contains(text, "cache_dir/") {
		t.Fatalf(".dfmignore missing cache_dir/:\n%s", text)
	}

	var hidden struct {
		Entries []struct {
			Path    string `json:"path"`
			Ignored bool   `json:"ignored"`
		} `json:"entries"`
	}
	if err := json.Unmarshal(mustOK(t, h, "workdir.entries", `{"path":"","offset":0,"limit":50}`), &hidden); err != nil {
		t.Fatal(err)
	}
	for _, entry := range hidden.Entries {
		if entry.Path == "secret.blend" || entry.Path == "cache_dir" {
			t.Fatalf("default entries included ignored %q", entry.Path)
		}
	}

	var shown struct {
		Entries []struct {
			Path    string `json:"path"`
			IsDir   bool   `json:"is_dir"`
			Ignored bool   `json:"ignored"`
		} `json:"entries"`
	}
	if err := json.Unmarshal(mustOK(t, h, "workdir.entries", `{"path":"","offset":0,"limit":50,"include_ignored":true}`), &shown); err != nil {
		t.Fatal(err)
	}
	foundFile, foundDir := false, false
	for _, entry := range shown.Entries {
		if entry.Path == "secret.blend" {
			foundFile = true
			if !entry.Ignored || entry.IsDir {
				t.Fatalf("secret.blend = %+v, want ignored file", entry)
			}
		}
		if entry.Path == "cache_dir" {
			foundDir = true
			if !entry.Ignored || !entry.IsDir {
				t.Fatalf("cache_dir = %+v, want ignored folder", entry)
			}
		}
	}
	if !foundFile || !foundDir {
		t.Fatalf("include_ignored entries = %+v, want secret.blend and cache_dir", shown.Entries)
	}

	var search struct {
		Entries []struct {
			Path    string `json:"path"`
			Ignored bool   `json:"ignored"`
		} `json:"entries"`
	}
	if err := json.Unmarshal(mustOK(t, h, "workdir.search", `{"query":"secret","limit":50}`), &search); err != nil {
		t.Fatal(err)
	}
	for _, entry := range search.Entries {
		if entry.Path == "secret.blend" {
			t.Fatal("search without include_ignored listed secret.blend")
		}
	}
	if err := json.Unmarshal(mustOK(t, h, "workdir.search", `{"query":"secret","limit":50,"include_ignored":true}`), &search); err != nil {
		t.Fatal(err)
	}
	foundSearch := false
	for _, entry := range search.Entries {
		if entry.Path == "secret.blend" && entry.Ignored {
			foundSearch = true
		}
	}
	if !foundSearch {
		t.Fatalf("search include_ignored = %+v, want secret.blend", search.Entries)
	}

	mustOK(t, h, "workdir.ignore", `{"paths":["secret.blend"]}`)
	again, err := os.ReadFile(filepath.Join(dir, ".dfmignore"))
	if err != nil {
		t.Fatal(err)
	}
	if strings.Count(string(again), "secret.blend") != strings.Count(text, "secret.blend") {
		t.Fatalf("duplicate ignore line written:\n%s", again)
	}

	mustOK(t, h, "workdir.unignore", `{"paths":["secret.blend","cache_dir"]}`)
	cleared, err := os.ReadFile(filepath.Join(dir, ".dfmignore"))
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(cleared), "secret.blend") || strings.Contains(string(cleared), "cache_dir/") {
		t.Fatalf("unignore left patterns in .dfmignore:\n%s", cleared)
	}
	if err := json.Unmarshal(mustOK(t, h, "workdir.entries", `{"path":"","offset":0,"limit":50}`), &hidden); err != nil {
		t.Fatal(err)
	}
	foundFile, foundDir = false, false
	for _, entry := range hidden.Entries {
		if entry.Path == "secret.blend" {
			foundFile = true
			if entry.Ignored {
				t.Fatal("secret.blend still ignored after unignore")
			}
		}
		if entry.Path == "cache_dir" {
			foundDir = true
			if entry.Ignored {
				t.Fatal("cache_dir still ignored after unignore")
			}
		}
	}
	if !foundFile || !foundDir {
		t.Fatalf("after unignore entries = %+v, want secret.blend and cache_dir", hidden.Entries)
	}
}

func TestWorkdirDfmignoreGetSet(t *testing.T) {
	dir, h := initTestRepo(t)

	var got struct {
		Content string `json:"content"`
	}
	if err := json.Unmarshal(mustOK(t, h, "workdir.dfmignore.get", `{}`), &got); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(got.Content, "# Forester ignore file") {
		t.Fatalf("get after init = %q, want default template", got.Content)
	}

	const custom = "# custom\n*.tmp\nsecret.blend\n"
	mustOK(t, h, "workdir.dfmignore.set", `{"content":"# custom\n*.tmp\nsecret.blend\n"}`)
	raw, err := os.ReadFile(filepath.Join(dir, ".dfmignore"))
	if err != nil {
		t.Fatal(err)
	}
	if string(raw) != custom {
		t.Fatalf("disk .dfmignore = %q, want %q", raw, custom)
	}
	if err := json.Unmarshal(mustOK(t, h, "workdir.dfmignore.get", `{}`), &got); err != nil {
		t.Fatal(err)
	}
	if got.Content != custom {
		t.Fatalf("get after set = %q, want %q", got.Content, custom)
	}

	writeFile(t, dir, "secret.blend", "data")
	writeFile(t, dir, "keep.txt", "keep")
	var entries struct {
		Entries []struct {
			Path string `json:"path"`
		} `json:"entries"`
	}
	if err := json.Unmarshal(mustOK(t, h, "workdir.entries", `{"path":"","offset":0,"limit":50}`), &entries); err != nil {
		t.Fatal(err)
	}
	foundKeep := false
	for _, entry := range entries.Entries {
		if entry.Path == "secret.blend" {
			t.Fatal("set .dfmignore did not hide secret.blend")
		}
		if entry.Path == "keep.txt" {
			foundKeep = true
		}
	}
	if !foundKeep {
		t.Fatal("keep.txt missing from entries after dfmignore.set")
	}

	mustOK(t, h, "workdir.dfmignore.set", "{\"content\":\"line1\\r\\nline2\\r\"}")
	if err := json.Unmarshal(mustOK(t, h, "workdir.dfmignore.get", `{}`), &got); err != nil {
		t.Fatal(err)
	}
	if got.Content != "line1\nline2\n" {
		t.Fatalf("CRLF normalize = %q", got.Content)
	}

	if err := os.Remove(filepath.Join(dir, ".dfmignore")); err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(mustOK(t, h, "workdir.dfmignore.get", `{}`), &got); err != nil {
		t.Fatal(err)
	}
	if got.Content != "" {
		t.Fatalf("missing file get = %q, want empty", got.Content)
	}
}

func TestWorkdirIgnoreRejectsInternalPaths(t *testing.T) {
	_, h := initTestRepo(t)
	mustFail(t, h, "workdir.ignore", `{"paths":[".dfmignore"]}`)
	mustFail(t, h, "workdir.ignore", `{"paths":[".DFM"]}`)
	mustFail(t, h, "workdir.ignore", `{"paths":[]}`)
	mustFail(t, h, "workdir.unignore", `{"paths":[".dfmignore"]}`)
	mustFail(t, h, "workdir.unignore", `{"paths":[]}`)
}
