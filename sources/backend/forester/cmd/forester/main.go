// CLI entry point for Forester (Blender addon backend).
package main

import (
	"fmt"
	"os"
	"strings"

	"github.com/difference-machine/forester/internal/commands"
	"github.com/difference-machine/forester/internal/completion"
	"github.com/difference-machine/forester/internal/jsonapi"
)

// Set by ldflags at build time
var (
	Version   = "dev"
	BuildTime = "unknown"
	GitCommit = "unknown"
)

func main() {
	args := os.Args[1:]
	if len(args) == 0 {
		printUsage()
		os.Exit(1)
	}

	// Global flags
	if args[0] == "--version" || args[0] == "-v" {
		fmt.Printf("forester %s (build %s, %s)\n", Version, BuildTime, GitCommit)
		os.Exit(0)
	}
	if args[0] == "--help" || args[0] == "-h" {
		printUsage()
		os.Exit(0)
	}

	sub := strings.ToLower(args[0])
	cmdArgs := args[1:]

	run, ok := subcommands[sub]
	if !ok {
		fmt.Fprintf(os.Stderr, "forester: unknown command %q\n", args[0])
		fmt.Fprintf(os.Stderr, "Run 'forester --help' for usage.\n")
		os.Exit(1)
	}

	if err := run(cmdArgs); err != nil {
		fmt.Fprintf(os.Stderr, "forester %s: %v\n", sub, err)
		os.Exit(1)
	}
}

var subcommands = map[string]func([]string) error{
	"init":         commands.Init,
	"add":          commands.Add,
	"status":       commands.Status,
	"commit":       commands.Commit,
	"branch":       commands.Branch,
	"tag":          commands.Tag,
	"switch":       commands.Switch,
	"stash":        commands.Stash,
	"show":         commands.Show,
	"rm":           commands.Rm,
	"review":       commands.Review,
	"revert":       commands.Revert,
	"restore":        commands.Restore,
	"restore-version": commands.RestoreVersion,
	"reset":          commands.Reset,
	"reflog":       commands.Reflog,
	"rebuild":      commands.Rebuild,
	"mv":           commands.Mv,
	"move-to":      commands.MoveTo,
	"merge":        commands.Merge,
	"log":          commands.Log,
	"lol":          commands.Lol,
	"lock":         commands.Lock,
	"hook":         commands.Hook,
	"gc":           commands.GC,
	"drop":         commands.Drop,
	"diff":         commands.Diff,
	"config":       commands.Config,
	"compare":      commands.Compare,
	"clean":        commands.Clean,
	"cherry-pick":  commands.CherryPick,
	"api":          jsonapi.RunCLI,
	"completion":   completion.Run,
}

func printUsage() {
	fmt.Print(`forester - version control for 3D assets (Blender addon backend)

Usage:
  forester <command> [options] [args]

Commands:
  init         Initialize a new repository
  add          Stage files
  status       Show working tree status
  commit       Record changes
  branch       List or create branches
  tag          List or create tags
  switch       Switch branch
  merge        Merge branches
  log          Show commit log
  diff         Show changes
  restore        Restore files
  restore-version Restore working dir to commit (full overwrite)
  reset          Reset current HEAD
  stash        Stash changes
  clean        Remove untracked files
  gc           Garbage collection
  rebuild      Scan object store and report statistics
  reflog       Reflog
  show         Show commit or object
  rm           Remove from index
  mv           Move/rename
  move-to      Move to branch
  cherry-pick  Apply commit
  revert       Revert commit
  compare      Compare commits
  config       Get/set config
  lock         Lock/unlock files
  hook         Run hooks
  drop         Drop stash/branch
  review       Review changes
  lol          Log graph

Options:
  --version, -v   Print version
  --help, -h      Show this help
`)
}
