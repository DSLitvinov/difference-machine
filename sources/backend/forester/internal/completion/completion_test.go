package completion

import (
	"strings"
	"testing"
)

func TestRunRequiresShellName(t *testing.T) {
	if err := Run(nil); err == nil {
		t.Fatal("expected error for missing shell")
	}
	if err := Run([]string{"powershell"}); err == nil {
		t.Fatal("expected error for unknown shell")
	}
}

func TestBashScriptListsAllCommands(t *testing.T) {
	script := bashScript()
	for _, name := range CommandNames() {
		if !strings.Contains(script, name) {
			t.Fatalf("bash script missing command %q", name)
		}
	}
}

func TestZshScriptListsAllCommands(t *testing.T) {
	script := zshScript()
	for _, name := range CommandNames() {
		if !strings.Contains(script, `"`+name+`"`) {
			t.Fatalf("zsh script missing command %q", name)
		}
	}
}

func TestFishScriptListsAllCommands(t *testing.T) {
	script := fishScript()
	for _, name := range CommandNames() {
		if !strings.Contains(script, name) {
			t.Fatalf("fish script missing command %q", name)
		}
	}
}
