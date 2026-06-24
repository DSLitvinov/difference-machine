package commands_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/difference-machine/forester/internal/commands"
)

func TestApplyRepositoryInitOptions(t *testing.T) {
	dir := t.TempDir()
	if err := commands.Init([]string{dir}); err != nil {
		t.Fatal(err)
	}

	customIgnore := "# custom\n*.bak\n"
	if err := commands.ApplyRepositoryInitOptions(dir, "Ada Lovelace", customIgnore); err != nil {
		t.Fatal(err)
	}

	configBytes, err := os.ReadFile(filepath.Join(dir, ".DFM", "config"))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(configBytes), "name = Ada Lovelace") {
		t.Fatalf("config missing author: %s", configBytes)
	}

	ignoreBytes, err := os.ReadFile(filepath.Join(dir, ".dfmignore"))
	if err != nil {
		t.Fatal(err)
	}
	if string(ignoreBytes) != customIgnore {
		t.Fatalf("dfmignore = %q, want custom content", string(ignoreBytes))
	}
}
