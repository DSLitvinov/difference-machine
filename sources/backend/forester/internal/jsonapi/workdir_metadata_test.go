package jsonapi_test

import (
	"bytes"
	"encoding/base64"
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

func TestWorkdirFileReturnsOriginalImageSize(t *testing.T) {
	dir, h := initTestRepo(t)
	imgPath := filepath.Join(dir, "textures", "hero.png")
	if err := os.MkdirAll(filepath.Dir(imgPath), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := writeTestPNG(imgPath, 640, 480); err != nil {
		t.Fatal(err)
	}

	raw := mustOK(t, h, "workdir.file", `{"path":"textures/hero.png"}`)
	var result struct {
		ContentBase64 string `json:"content_base64"`
		Mime          string `json:"mime"`
	}
	if err := json.Unmarshal(raw, &result); err != nil {
		t.Fatal(err)
	}
	if result.Mime != "image/png" {
		t.Fatalf("mime = %q", result.Mime)
	}
	decoded, err := base64.StdEncoding.DecodeString(result.ContentBase64)
	if err != nil {
		t.Fatal(err)
	}
	cfg, err := png.DecodeConfig(bytes.NewReader(decoded))
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Width != 640 || cfg.Height != 480 {
		t.Fatalf("workdir.file dimensions = %dx%d, want 640x480", cfg.Width, cfg.Height)
	}

	writeFile(t, dir, "notes.txt", "hello")
	mustFail(t, h, "workdir.file", `{"path":"notes.txt"}`)
}

func TestWorkdirSvgNativePreview(t *testing.T) {
	dir, h := initTestRepo(t)
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="12" cy="12" r="10" fill="#2563eb"/></svg>`
	writeFile(t, dir, "icons/mark.svg", svg)

	var thumb struct {
		Kind          string `json:"kind"`
		Mime          string `json:"mime"`
		ContentBase64 string `json:"content_base64"`
		TextPreview   string `json:"text_preview"`
	}
	if err := json.Unmarshal(mustOK(t, h, "workdir.thumbnail", `{"path":"icons/mark.svg"}`), &thumb); err != nil {
		t.Fatal(err)
	}
	if thumb.Kind != "image" {
		t.Fatalf("thumbnail kind = %q, want image", thumb.Kind)
	}
	if thumb.Mime != "image/svg+xml" {
		t.Fatalf("thumbnail mime = %q, want image/svg+xml", thumb.Mime)
	}
	if thumb.TextPreview != "" {
		t.Fatalf("text_preview = %q, want empty", thumb.TextPreview)
	}
	decoded, err := base64.StdEncoding.DecodeString(thumb.ContentBase64)
	if err != nil {
		t.Fatal(err)
	}
	if string(decoded) != svg {
		t.Fatalf("thumbnail bytes = %q, want original svg", decoded)
	}

	raw := mustOK(t, h, "workdir.file", `{"path":"icons/mark.svg"}`)
	var file struct {
		ContentBase64 string `json:"content_base64"`
		Mime          string `json:"mime"`
	}
	if err := json.Unmarshal(raw, &file); err != nil {
		t.Fatal(err)
	}
	if file.Mime != "image/svg+xml" {
		t.Fatalf("file mime = %q", file.Mime)
	}
	decoded, err = base64.StdEncoding.DecodeString(file.ContentBase64)
	if err != nil {
		t.Fatal(err)
	}
	if string(decoded) != svg {
		t.Fatalf("file bytes = %q, want original svg", decoded)
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
	mustFail(t, h, "workdir.file", `{"path":"../outside.txt"}`)
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
	mustFail(t, h, "workdir.file", `{"path":"outside-link.txt"}`)
	mustFail(t, h, "workdir.open", `{"path":"outside-link.txt"}`)
	mustFail(t, h, "workdir.delete", `{"path":"outside-link.txt"}`)

	if got, err := os.ReadFile(outsidePath); err != nil || string(got) != "secret" {
		t.Fatalf("outside file changed: %q, %v", string(got), err)
	}
}
