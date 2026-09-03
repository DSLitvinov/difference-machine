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

func TestOpenEditorCommandDarwinAppBundle(t *testing.T) {
	cmd := openEditorCommand("/Applications/GIMP.app", "/tmp/photo.png", "darwin")
	if cmd.Path != "/usr/bin/open" {
		t.Fatalf("darwin app path = %q, want /usr/bin/open", cmd.Path)
	}
	want := []string{"/usr/bin/open", "-a", "/Applications/GIMP.app", "--", "/tmp/photo.png"}
	if len(cmd.Args) != len(want) {
		t.Fatalf("darwin app args = %v, want %v", cmd.Args, want)
	}
	for i, arg := range want {
		if cmd.Args[i] != arg {
			t.Fatalf("darwin app args = %v, want %v", cmd.Args, want)
		}
	}
}

func TestOpenEditorCommandDarwinAppBundleTrailingSlash(t *testing.T) {
	if !isMacAppBundle("/Applications/GIMP.app/") {
		t.Fatal("expected trailing-slash .app to be a bundle")
	}
}

func TestOpenEditorCommandDarwinBinary(t *testing.T) {
	bin := "/Applications/GIMP.app/Contents/MacOS/gimp"
	cmd := openEditorCommand(bin, "/tmp/photo.png", "darwin")
	if cmd.Path != bin {
		t.Fatalf("darwin binary path = %q, want %q", cmd.Path, bin)
	}
	if len(cmd.Args) != 2 || cmd.Args[1] != "/tmp/photo.png" {
		t.Fatalf("darwin binary args = %v", cmd.Args)
	}
}

func TestOpenEditorCommandLinuxExecutable(t *testing.T) {
	cmd := openEditorCommand("/usr/bin/gimp", "/tmp/photo.png", "linux")
	if cmd.Path != "/usr/bin/gimp" {
		t.Fatalf("linux path = %q, want /usr/bin/gimp", cmd.Path)
	}
	if len(cmd.Args) != 2 || cmd.Args[1] != "/tmp/photo.png" {
		t.Fatalf("linux args = %v", cmd.Args)
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
