package jsonapi

import (
	"path/filepath"
	"testing"
)

func TestOpenDefaultCommandDarwin(t *testing.T) {
	cmd := openDefaultCommand("/tmp", "darwin")
	if cmd.Path != "/usr/bin/open" {
		t.Fatalf("darwin open path = %q, want /usr/bin/open", cmd.Path)
	}
	if len(cmd.Args) < 2 || cmd.Args[1] != "/tmp" {
		t.Fatalf("darwin args = %v", cmd.Args)
	}
}

func TestOpenDefaultCommandWindowsDirectory(t *testing.T) {
	dir := t.TempDir()
	cmd := openDefaultCommand(dir, "windows")
	if len(cmd.Args) < 2 {
		t.Fatalf("windows directory args = %v", cmd.Args)
	}
	if cmd.Args[0] != "explorer" && filepath.Base(cmd.Path) != "explorer" {
		t.Fatalf("windows directory command = path %q args %v, want explorer", cmd.Path, cmd.Args)
	}
	if cmd.Args[len(cmd.Args)-1] != dir {
		t.Fatalf("windows directory args = %v, want path %s", cmd.Args, dir)
	}
}
