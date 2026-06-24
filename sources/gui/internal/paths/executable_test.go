package paths

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

func TestResolveExecutablePath_File(t *testing.T) {
	dir := t.TempDir()
	bin := filepath.Join(dir, "forester")
	if err := os.WriteFile(bin, []byte{0}, 0o755); err != nil {
		t.Fatal(err)
	}

	got, err := ResolveExecutablePath(bin)
	if err != nil {
		t.Fatalf("ResolveExecutablePath: %v", err)
	}
	if got != bin {
		t.Fatalf("got %q, want %q", got, bin)
	}
}

func TestResolveExecutablePath_DarwinAppBundle(t *testing.T) {
	if runtime.GOOS != "darwin" {
		t.Skip("macOS app bundle resolution")
	}

	dir := t.TempDir()
	appPath := filepath.Join(dir, "Blender.app")
	macOSDir := filepath.Join(appPath, "Contents", "MacOS")
	if err := os.MkdirAll(macOSDir, 0o755); err != nil {
		t.Fatal(err)
	}
	binary := filepath.Join(macOSDir, "Blender")
	if err := os.WriteFile(binary, []byte{0}, 0o755); err != nil {
		t.Fatal(err)
	}

	got, err := ResolveExecutablePath(appPath)
	if err != nil {
		t.Fatalf("ResolveExecutablePath: %v", err)
	}
	if got != binary {
		t.Fatalf("got %q, want %q", got, binary)
	}
}

func TestResolveExecutablePath_DirectoryRejected(t *testing.T) {
	dir := t.TempDir()
	_, err := ResolveExecutablePath(dir)
	if err == nil {
		t.Fatal("expected error for plain directory")
	}
}
