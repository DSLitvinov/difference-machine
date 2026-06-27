package jsonapi

import "testing"

func TestOpenDefaultCommandWindowsDoesNotUseShell(t *testing.T) {
	path := `C:\repo\safe & calc &.txt`
	cmd := openDefaultCommand(path, "windows")

	if cmd.Path != "rundll32.exe" {
		t.Fatalf("Path = %q, want rundll32.exe", cmd.Path)
	}
	if len(cmd.Args) != 3 {
		t.Fatalf("Args len = %d, want 3: %#v", len(cmd.Args), cmd.Args)
	}
	if cmd.Args[0] != "rundll32.exe" || cmd.Args[1] != "url.dll,FileProtocolHandler" || cmd.Args[2] != path {
		t.Fatalf("Args = %#v", cmd.Args)
	}
}
