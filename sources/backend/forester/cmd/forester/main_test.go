package main

import (
	"testing"

	"github.com/difference-machine/forester/internal/completion"
)

func TestCommandNamesMatchSubcommands(t *testing.T) {
	names := completion.CommandNames()
	seen := make(map[string]struct{}, len(names))
	for _, name := range names {
		if _, ok := subcommands[name]; !ok {
			t.Fatalf("completion.CommandNames includes unknown command %q", name)
		}
		if _, dup := seen[name]; dup {
			t.Fatalf("duplicate command name %q", name)
		}
		seen[name] = struct{}{}
	}

	for name := range subcommands {
		if _, ok := seen[name]; !ok {
			t.Fatalf("subcommands missing from completion.CommandNames: %q", name)
		}
	}
}
