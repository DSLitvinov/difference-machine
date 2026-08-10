package jsonapi

import (
	"bytes"
	"crypto/rand"
	"image"
	"image/color"
	"image/png"
	"os"
	"path/filepath"
	"testing"
)

func requireFFmpeg(t *testing.T) {
	t.Helper()
	if _, err := resolveFFmpegPath(); err != nil {
		t.Skipf("ffmpeg not available: %v", err)
	}
}

func TestBuildImageThumbnailLargePNG(t *testing.T) {
	requireFFmpeg(t)

	dir := t.TempDir()
	path := filepath.Join(dir, "large.png")

	img := image.NewRGBA(image.Rect(0, 0, 2048, 2048))
	for y := 0; y < 2048; y++ {
		for x := 0; x < 2048; x++ {
			img.SetRGBA(x, y, color.RGBA{
				R: uint8(x % 256),
				G: uint8(y % 256),
				B: 128,
				A: 255,
			})
		}
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		t.Fatalf("encode png: %v", err)
	}
	if err := os.WriteFile(path, buf.Bytes(), 0o644); err != nil {
		t.Fatalf("write png: %v", err)
	}

	thumb, mime, err := buildImageThumbnail(path, ".png")
	if err != nil {
		t.Fatalf("buildImageThumbnail: %v", err)
	}
	if mime != "image/png" {
		t.Fatalf("mime = %q, want image/png", mime)
	}
	if len(thumb) == 0 {
		t.Fatal("expected thumbnail bytes")
	}

	cfg, _, err := image.DecodeConfig(bytes.NewReader(thumb))
	if err != nil {
		t.Fatalf("decode thumbnail: %v", err)
	}
	if cfg.Width > maxThumbnailEdge || cfg.Height > maxThumbnailEdge {
		t.Fatalf("thumbnail dimensions = %dx%d, want max edge %d", cfg.Width, cfg.Height, maxThumbnailEdge)
	}
}

func TestBuildImageThumbnailLargeNoisyPNG(t *testing.T) {
	requireFFmpeg(t)

	dir := t.TempDir()
	path := filepath.Join(dir, "noisy.png")

	img := image.NewRGBA(image.Rect(0, 0, 2200, 2200))
	if _, err := rand.Read(img.Pix); err != nil {
		t.Fatalf("rand.Read: %v", err)
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		t.Fatalf("encode png: %v", err)
	}
	if err := os.WriteFile(path, buf.Bytes(), 0o644); err != nil {
		t.Fatalf("write png: %v", err)
	}

	thumb, mime, err := buildImageThumbnail(path, ".png")
	if err != nil {
		t.Fatalf("buildImageThumbnail: %v", err)
	}
	if mime != "image/png" {
		t.Fatalf("mime = %q, want image/png", mime)
	}
	if len(thumb) == 0 {
		t.Fatal("expected thumbnail bytes")
	}
}

func TestBuildImageThumbnailWidePNG(t *testing.T) {
	requireFFmpeg(t)

	dir := t.TempDir()
	path := filepath.Join(dir, "wide.png")
	img := image.NewRGBA(image.Rect(0, 0, 8192, 2048))
	for y := 0; y < 2048; y++ {
		for x := 0; x < 8192; x++ {
			img.SetRGBA(x, y, color.RGBA{R: uint8(x % 256), G: uint8(y % 256), B: 64, A: 255})
		}
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		t.Fatalf("encode png: %v", err)
	}
	if err := os.WriteFile(path, buf.Bytes(), 0o644); err != nil {
		t.Fatalf("write png: %v", err)
	}

	thumb, mime, err := buildImageThumbnail(path, ".png")
	if err != nil {
		t.Fatalf("buildImageThumbnail: %v", err)
	}
	if mime != "image/png" {
		t.Fatalf("mime = %q, want image/png", mime)
	}
	cfg, _, err := image.DecodeConfig(bytes.NewReader(thumb))
	if err != nil {
		t.Fatalf("decode thumbnail: %v", err)
	}
	if cfg.Width > maxThumbnailEdge || cfg.Height > maxThumbnailEdge {
		t.Fatalf("thumbnail dimensions = %dx%d, want max edge %d", cfg.Width, cfg.Height, maxThumbnailEdge)
	}
}
