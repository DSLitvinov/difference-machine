package jsonapi_test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/difference-machine/forester/internal/jsonapi"
)

func TestCommitDeleteFileDropsPathFromCommit(t *testing.T) {
	dir, h := initTestRepo(t)
	writeFile(t, dir, "keep.txt", "keep-one")
	writeFile(t, dir, "drop.txt", "drop-one")
	mustOK(t, h, "index.add", `{"files":["keep.txt","drop.txt"]}`)
	mustOK(t, h, "commit.create", `{"message":"add both","author":"tester"}`)
	writeFile(t, dir, "drop.txt", "drop-two")
	mustOK(t, h, "index.add", `{"files":["drop.txt"]}`)
	mustOK(t, h, "commit.create", `{"message":"edit drop","author":"tester"}`)

	head := logHashes(t, h)[0]
	var deleted struct {
		Success bool   `json:"success"`
		Hash    string `json:"hash"`
	}
	if err := json.Unmarshal(mustOK(t, h, "commit.delete_file", `{"commit_hash":"`+head+`","path":"drop.txt"}`), &deleted); err != nil {
		t.Fatalf("decode commit.delete_file: %v", err)
	}
	if !deleted.Success || deleted.Hash == "" || deleted.Hash == head {
		t.Fatalf("delete_file result = %+v", deleted)
	}

	content, err := os.ReadFile(filepath.Join(dir, "drop.txt"))
	if err != nil {
		t.Fatal(err)
	}
	if string(content) != "drop-two" {
		t.Fatalf("workdir drop.txt = %q, want unchanged drop-two", content)
	}

	var names struct {
		Files []struct {
			Status string `json:"status"`
			Path   string `json:"path"`
		} `json:"files"`
	}
	if err := json.Unmarshal(mustOK(t, h, "diff.name_status", `{"to":"`+deleted.Hash+`"}`), &names); err != nil {
		t.Fatalf("decode name_status: %v", err)
	}
	deletedInCommit := false
	for _, file := range names.Files {
		if file.Path == "drop.txt" {
			if file.Status != "D" {
				t.Fatalf("drop.txt status = %q, want D", file.Status)
			}
			deletedInCommit = true
		}
	}
	if !deletedInCommit {
		t.Fatalf("drop.txt missing from rewritten name_status: %+v", names.Files)
	}

	mustFail(t, h, "blob.get", `{"commit":"`+deleted.Hash+`","path":"drop.txt"}`)
	oldest := logHashes(t, h)[len(logHashes(t, h))-1]
	mustOK(t, h, "blob.get", `{"commit":"`+oldest+`","path":"drop.txt"}`)
}

func TestCommitDeleteFileRewritesDescendants(t *testing.T) {
	dir, h := initTestRepo(t)
	writeFile(t, dir, "keep.txt", "keep")
	writeFile(t, dir, "secret.txt", "secret")
	mustOK(t, h, "index.add", `{"files":["keep.txt","secret.txt"]}`)
	mustOK(t, h, "commit.create", `{"message":"add secret","author":"tester"}`)
	writeFile(t, dir, "keep.txt", "keep-two")
	mustOK(t, h, "index.add", `{"files":["keep.txt"]}`)
	mustOK(t, h, "commit.create", `{"message":"edit keep","author":"tester"}`)

	hashes := logHashes(t, h)
	oldest := hashes[len(hashes)-1]
	var deleted struct {
		Hash string `json:"hash"`
	}
	if err := json.Unmarshal(mustOK(t, h, "commit.delete_file", `{"commit_hash":"`+oldest+`","path":"secret.txt"}`), &deleted); err != nil {
		t.Fatalf("decode commit.delete_file: %v", err)
	}

	newLog := logHashes(t, h)
	if len(newLog) != 2 {
		t.Fatalf("log after rewrite = %d, want 2", len(newLog))
	}
	for _, hash := range newLog {
		if hash == oldest {
			t.Fatal("old commit hash still on branch")
		}
		mustFail(t, h, "blob.get", `{"commit":"`+hash+`","path":"secret.txt"}`)
		mustOK(t, h, "blob.get", `{"commit":"`+hash+`","path":"keep.txt"}`)
	}

	content, err := os.ReadFile(filepath.Join(dir, "secret.txt"))
	if err != nil {
		t.Fatal(err)
	}
	if string(content) != "secret" {
		t.Fatalf("workdir secret.txt = %q, want unchanged", content)
	}
}

func TestCommitDeleteFileRejectsMissingPath(t *testing.T) {
	dir, h := initTestRepo(t)
	writeFile(t, dir, "keep.txt", "keep")
	mustOK(t, h, "index.add", `{"files":["keep.txt"]}`)
	mustOK(t, h, "commit.create", `{"message":"add keep","author":"tester"}`)
	head := logHashes(t, h)[0]
	mustFail(t, h, "commit.delete_file", `{"commit_hash":"`+head+`","path":"missing.txt"}`)
	mustFail(t, h, "commit.delete_file", `{"commit_hash":"`+head+`"}`)
	mustFail(t, h, "commit.delete_file", `{"path":"keep.txt"}`)
}

func logHashes(t *testing.T, h jsonapi.Handle) []string {
	t.Helper()
	var logResult struct {
		Commits []struct {
			Hash string `json:"hash"`
		} `json:"commits"`
	}
	if err := json.Unmarshal(mustOK(t, h, "log.get", `{"max_count":20}`), &logResult); err != nil {
		t.Fatalf("decode log.get: %v", err)
	}
	out := make([]string, 0, len(logResult.Commits))
	for _, commit := range logResult.Commits {
		out = append(out, commit.Hash)
	}
	return out
}
