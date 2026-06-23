package jsonapi

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

func TestBlenderThumbHashFreedesktopExample(t *testing.T) {
	uri := "file:///home/jens/photos/me.png"
	got := blenderThumbHash(uri)
	want := "c6ee772d9e49320e97ec29a7eb5b1697"
	if got != want {
		t.Fatalf("hash = %q, want %q", got, want)
	}
}

func TestBlenderFileURIUnix(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("unix-only")
	}
	uri, err := blenderFileURI("/home/jens/photos/me.png")
	if err != nil {
		t.Fatal(err)
	}
	if uri != "file:///home/jens/photos/me.png" {
		t.Fatalf("uri = %q", uri)
	}
}

func TestBlenderFileURIWindows(t *testing.T) {
	if runtime.GOOS != "windows" {
		t.Skip("windows-only")
	}
	uri, err := blenderFileURI(`C:\Users\jens\photos\me.blend`)
	if err != nil {
		t.Fatal(err)
	}
	if uri != "file:///C:/Users/jens/photos/me.blend" {
		t.Fatalf("uri = %q", uri)
	}
}

func TestEscapeBlenderFileURI(t *testing.T) {
	escaped := escapeBlenderFileURI("file:///home/jens/my photos/me.png")
	if escaped != "file:///home/jens/my%20photos/me.png" {
		t.Fatalf("escaped = %q", escaped)
	}
}

func TestLookupBlenderCachedThumbnail(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	if runtime.GOOS == "windows" {
		t.Setenv("USERPROFILE", home)
	}

	blendPath := filepath.Join(home, "project", "scene.blend")
	if err := os.MkdirAll(filepath.Dir(blendPath), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(blendPath, []byte("BLENDER"), 0o644); err != nil {
		t.Fatal(err)
	}

	uri, err := blenderFileURI(blendPath)
	if err != nil {
		t.Fatal(err)
	}
	thumbName := blenderThumbHash(uri) + ".png"
	pngBytes := []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}
	thumbDir := filepath.Join(home, ".thumbnails", "normal")
	if err := os.MkdirAll(thumbDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(thumbDir, thumbName), pngBytes, 0o644); err != nil {
		t.Fatal(err)
	}

	got, err := lookupBlenderCachedThumbnail(blendPath)
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != string(pngBytes) {
		t.Fatalf("unexpected thumbnail bytes: %v", got)
	}
}
