package jsonapi_test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/difference-machine/forester/internal/core"
)

func TestDiffNameStatusRename(t *testing.T) {
	dir, h := initTestRepo(t)
	writeFile(t, dir, "assets/old-name.txt", "same content")
	mustOK(t, h, "index.add", `{"files":["assets/old-name.txt"]}`)
	mustOK(t, h, "commit.create", `{"message":"add file","author":"tester"}`)

	oldAbs := filepath.Join(dir, "assets/old-name.txt")
	newAbs := filepath.Join(dir, "assets/new-name.txt")
	if err := os.Rename(oldAbs, newAbs); err != nil {
		t.Fatal(err)
	}

	hash, err := core.HashFile(newAbs)
	if err != nil {
		t.Fatal(err)
	}
	index, err := core.NewIndex(dir)
	if err != nil {
		t.Fatal(err)
	}
	if err := index.MarkDeleted(oldAbs); err != nil {
		t.Fatal(err)
	}
	if err := index.Add(newAbs, hash); err != nil {
		t.Fatal(err)
	}

	mustOK(t, h, "commit.create", `{"message":"rename file","author":"tester"}`)

	var logResult struct {
		Commits []struct {
			Hash string `json:"hash"`
		} `json:"commits"`
	}
	if err := json.Unmarshal(mustOK(t, h, "log.get", `{"max_count":1}`), &logResult); err != nil {
		t.Fatalf("decode log.get: %v", err)
	}
	if len(logResult.Commits) == 0 {
		t.Fatal("expected latest commit")
	}
	latest := logResult.Commits[0].Hash

	var nameStatus struct {
		Files []struct {
			Status  string `json:"status"`
			Path    string `json:"path"`
			OldPath string `json:"old_path"`
		} `json:"files"`
	}
	if err := json.Unmarshal(mustOK(t, h, "diff.name_status", `{"to":"`+latest+`"}`), &nameStatus); err != nil {
		t.Fatalf("decode diff.name_status: %v", err)
	}
	if len(nameStatus.Files) != 1 {
		t.Fatalf("files = %+v, want single rename entry", nameStatus.Files)
	}
	file := nameStatus.Files[0]
	if file.Status != "R" || file.Path != "assets/new-name.txt" || file.OldPath != "assets/old-name.txt" {
		t.Fatalf("rename entry = %+v", file)
	}

	var diffText struct {
		Content  string `json:"content"`
		IsBinary bool   `json:"is_binary"`
	}
	if err := json.Unmarshal(
		mustOK(t, h, "diff.text", `{"to":"`+latest+`","path":"assets/new-name.txt","unified":true}`),
		&diffText,
	); err != nil {
		t.Fatalf("decode diff.text: %v", err)
	}
	if diffText.IsBinary || diffText.Content != "" {
		t.Fatalf("diff.text = %+v, want empty text diff for pure rename", diffText)
	}
}

func TestStatusGetRenameBeforeCommit(t *testing.T) {
	dir, h := initTestRepo(t)
	writeFile(t, dir, "dir/old.txt", "payload")
	mustOK(t, h, "index.add", `{"files":["dir/old.txt"]}`)
	mustOK(t, h, "commit.create", `{"message":"seed","author":"tester"}`)

	oldAbs := filepath.Join(dir, "dir/old.txt")
	newAbs := filepath.Join(dir, "dir/new.txt")
	if err := os.Rename(oldAbs, newAbs); err != nil {
		t.Fatal(err)
	}

	hash, err := core.HashFile(newAbs)
	if err != nil {
		t.Fatal(err)
	}
	index, err := core.NewIndex(dir)
	if err != nil {
		t.Fatal(err)
	}
	if err := index.MarkDeleted(oldAbs); err != nil {
		t.Fatal(err)
	}
	if err := index.Add(newAbs, hash); err != nil {
		t.Fatal(err)
	}

	var statusPayload struct {
		RenamedFiles    []map[string]string `json:"renamed_files"`
		StagedNewFiles  []string            `json:"staged_new_files"`
		UnstagedDeleted []string            `json:"unstaged_deleted_files"`
	}
	if err := json.Unmarshal(mustOK(t, h, "status.get", `{}`), &statusPayload); err != nil {
		t.Fatalf("decode status.get: %v", err)
	}
	if len(statusPayload.RenamedFiles) != 1 {
		t.Fatalf("renamed_files = %+v", statusPayload.RenamedFiles)
	}
	if statusPayload.RenamedFiles[0]["path"] != "dir/new.txt" || statusPayload.RenamedFiles[0]["old_path"] != "dir/old.txt" {
		t.Fatalf("rename pair = %+v", statusPayload.RenamedFiles[0])
	}
	if len(statusPayload.StagedNewFiles) != 0 {
		t.Fatalf("staged_new_files = %v, want empty after rename pairing", statusPayload.StagedNewFiles)
	}
	if len(statusPayload.UnstagedDeleted) != 0 {
		t.Fatalf("unstaged_deleted_files = %v, want empty after rename pairing", statusPayload.UnstagedDeleted)
	}
}
