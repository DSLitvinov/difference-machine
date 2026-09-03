package completion

import (
	"fmt"
	"os"
	"strings"
)

// Run prints a shell completion script for top-level forester commands.
//
// Usage:
//
//	forester completion bash
//	forester completion zsh
//	forester completion fish
func Run(args []string) error {
	if len(args) != 1 {
		return fmt.Errorf("usage: forester completion <bash|zsh|fish>")
	}

	var script string
	switch strings.ToLower(args[0]) {
	case "bash":
		script = bashScript()
	case "zsh":
		script = zshScript()
	case "fish":
		script = fishScript()
	default:
		return fmt.Errorf("usage: forester completion <bash|zsh|fish>")
	}

	_, err := os.Stdout.WriteString(script)
	return err
}
