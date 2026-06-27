package jsonapi_test

import (
	"encoding/json"
	"image"
	"image/png"
	"os"
	"path/filepath"
	"testing"
)

func TestWorkdirMetadataImageDimensions(t *testing.T) {
	dir, h := initTestRepo(t)
	imgPath := filepath.Join(dir, "textures", "tile.png")
	if err := os.MkdirAll(filepath.Dir(imgPath), 0o755); err != nil {
		t.Fatal(err)
	}
	file, err := os.Create(imgPath)
	if err != nil {
		t.Fatal(err)
	}
	if err := png.Encode(file, image.NewRGBA(image.Rect(0, 0, 32, 16))); err != nil {
		t.Fatal(err)
	}
	file.Close()

	raw := mustOK(t, h, "workdir.metadata", `{"path":"textures/tile.png"}`)
	var result struct {
		Width  int `json:"width"`
		Height int `json:"height"`
		Size   int `json:"size"`
	}
	if err := json.Unmarshal(raw, &result); err != nil {
		t.Fatal(err)
	}
	if result.Width != 32 || result.Height != 16 {
		t.Fatalf("dimensions: got %dx%d want 32x16", result.Width, result.Height)
	}
	if result.Size <= 0 {
		t.Fatalf("expected positive size, got %d", result.Size)
	}
}

func TestWorkdirPreviewEndpointsRejectTraversal(t *testing.T) {
	dir, h := initTestRepo(t)
	outsidePath := filepath.Join(filepath.Dir(dir), "outside.txt")
	if err := os.WriteFile(outsidePath, []byte("secret"), 0o644); err != nil {
		t.Fatal(err)
	}

	mustFail(t, h, "workdir.metadata", `{"path":"../outside.txt"}`)
	mustFail(t, h, "workdir.thumbnail", `{"path":"../outside.txt"}`)
}

func TestWorkdirEndpointsRejectSymlinkEscape(t *testing.T) {
	dir, h := initTestRepo(t)
	outsidePath := filepath.Join(filepath.Dir(dir), "outside.txt")
	if err := os.WriteFile(outsidePath, []byte("secret"), 0o644); err != nil {
		t.Fatal(err)
	}
	linkPath := filepath.Join(dir, "outside-link.txt")
	if err := os.Symlink(outsidePath, linkPath); err != nil {
		t.Skipf("symlink not available: %v", err)
	}

	mustFail(t, h, "workdir.metadata", `{"path":"outside-link.txt"}`)
	mustFail(t, h, "workdir.thumbnail", `{"path":"outside-link.txt"}`)
	mustFail(t, h, "workdir.open", `{"path":"outside-link.txt"}`)
	mustFail(t, h, "workdir.delete", `{"path":"outside-link.txt"}`)

	if got, err := os.ReadFile(outsidePath); err != nil || string(got) != "secret" {
		t.Fatalf("outside file changed: %q, %v", string(got), err)
	}
}
