package jsonapi_test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/difference-machine/forester/pkg/jsonapi"
)

func TestBlobGetImageInCommit(t *testing.T) {
	dir, h := initTestRepo(t)
	pngBytes := []byte{0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d}
	writeFile(t, dir, "assets/photo.png", string(pngBytes))

	mustOK(t, h, "index.add", `{"files":["assets/photo.png"]}`)
	mustOK(t, h, "commit.create", `{"message":"add photo","author":"tester"}`)

	var logResult struct {
		Commits []struct {
			Hash string `json:"hash"`
		} `json:"commits"`
	}
	if err := json.Unmarshal(mustOK(t, h, "log.get", `{"branch":"main","max_count":1}`), &logResult); err != nil {
		t.Fatal(err)
	}
	if len(logResult.Commits) == 0 {
		t.Fatal("expected commit")
	}
	hash := logResult.Commits[0].Hash

	var blobResult struct {
		ContentBase64 string `json:"content_base64"`
		Mime          string `json:"mime"`
		Size          int    `json:"size"`
	}
	if err := json.Unmarshal(mustOK(t, h, "blob.get", `{"commit":"`+hash+`","path":"assets/photo.png"}`), &blobResult); err != nil {
		t.Fatal(err)
	}
	if blobResult.ContentBase64 == "" {
		t.Fatal("expected content_base64")
	}
	if blobResult.Mime != "image/png" {
		t.Fatalf("mime = %q", blobResult.Mime)
	}
}

func TestBlobGetImageLiveRepo(t *testing.T) {
	repo := filepath.Join(os.Getenv("HOME"), "Documents", "test")
	if _, err := os.Stat(filepath.Join(repo, ".DFM")); err != nil {
		t.Skip("live repo not found")
	}

	raw := jsonapi.CallStateless(repo, "log.get", `{"branch":"main","max_count":10}`)
	var logResp struct {
		OK     bool   `json:"ok"`
		Error  string `json:"error"`
		Result struct {
			Commits []struct {
				Hash string `json:"hash"`
			} `json:"commits"`
		} `json:"result"`
	}
	if err := json.Unmarshal(raw, &logResp); err != nil {
		t.Fatal(err)
	}
	if !logResp.OK {
		t.Fatalf("log.get: %s", logResp.Error)
	}

	for _, commit := range logResp.Result.Commits {
		nsRaw := jsonapi.CallStateless(repo, "diff.name_status", `{"to":"`+commit.Hash+`"}`)
		var nsResp struct {
			OK     bool   `json:"ok"`
			Result struct {
				Files []struct {
					Status string `json:"status"`
					Path   string `json:"path"`
				} `json:"files"`
			} `json:"result"`
		}
		if err := json.Unmarshal(nsRaw, &nsResp); err != nil {
			t.Fatal(err)
		}
		for _, file := range nsResp.Result.Files {
			if filepath.Ext(file.Path) != ".png" {
				continue
			}
			blobRaw := jsonapi.CallStateless(repo, "blob.get", `{"commit":"`+commit.Hash+`","path":"`+file.Path+`"}`)
			var blobResp struct {
				OK     bool   `json:"ok"`
				Error  string `json:"error"`
				Result struct {
					ContentBase64 string `json:"content_base64"`
					Size          int    `json:"size"`
				} `json:"result"`
			}
			if err := json.Unmarshal(blobRaw, &blobResp); err != nil {
				t.Fatal(err)
			}
			if !blobResp.OK {
				t.Fatalf("blob.get %s @ %s: %s", file.Path, commit.Hash[:8], blobResp.Error)
			}
			if len(blobResp.Result.ContentBase64) < 100 {
				t.Fatalf("blob too small for %s", file.Path)
			}
			return
		}
	}
	t.Skip("no png in recent commits")
}
