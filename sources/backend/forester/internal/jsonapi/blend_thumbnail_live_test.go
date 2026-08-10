package jsonapi_test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/difference-machine/forester/pkg/jsonapi"
)

func TestWorkdirThumbnailBlendLive(t *testing.T) {
	repo := filepath.Join(os.Getenv("HOME"), "Documents", "test")
	blend := filepath.Join(repo, "Untitled.blend")
	if _, err := os.Stat(blend); err != nil {
		t.Skip("live blend fixture not found")
	}

	raw := jsonapi.CallStateless(repo, "workdir.thumbnail", `{"path":"Untitled.blend"}`)
	var resp struct {
		OK     bool   `json:"ok"`
		Error  string `json:"error"`
		Result struct {
			Kind          string `json:"kind"`
			Mime          string `json:"mime"`
			ContentBase64 string `json:"content_base64"`
		} `json:"result"`
	}
	if err := json.Unmarshal(raw, &resp); err != nil {
		t.Fatal(err)
	}
	if !resp.OK {
		t.Fatalf("api error: %s", resp.Error)
	}
	if resp.Result.Kind != "image" {
		t.Fatalf("kind = %q, want image", resp.Result.Kind)
	}
	if len(resp.Result.ContentBase64) < 100 {
		t.Fatalf("content_base64 too short: %d", len(resp.Result.ContentBase64))
	}
}
