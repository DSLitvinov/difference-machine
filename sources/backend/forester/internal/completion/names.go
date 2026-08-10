package completion

import "sort"

// CommandNames returns top-level forester CLI command names in sorted order.
func CommandNames() []string {
	names := []string{
		"add",
		"api",
		"branch",
		"cherry-pick",
		"clean",
		"commit",
		"compare",
		"completion",
		"config",
		"diff",
		"drop",
		"gc",
		"hook",
		"init",
		"lock",
		"log",
		"lol",
		"merge",
		"move-to",
		"mv",
		"rebuild",
		"reflog",
		"reset",
		"restore",
		"restore-version",
		"revert",
		"review",
		"rm",
		"show",
		"stash",
		"status",
		"switch",
		"tag",
	}
	sort.Strings(names)
	return names
}
