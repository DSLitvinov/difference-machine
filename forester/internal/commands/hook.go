package commands

import (
	"fmt"
	"os"

	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/utils"
)

// Hook manages hooks
func Hook(args []string) error {
	repoPath, err := utils.FindRepositoryRoot(".")
	if err != nil {
		return fmt.Errorf("not a Forester repository")
	}

	hooks := core.NewHooks(repoPath)

	if len(args) == 0 || args[0] == "list" {
		if len(args) > 1 {
			return fmt.Errorf("usage: hook [list]")
		}
		// List hooks
		hookTypes := []struct {
			name string
			typ  core.HookType
		}{
			{"pre-commit", core.HookTypePreCommit},
			{"post-commit", core.HookTypePostCommit},
			{"pre-checkout", core.HookTypePreCheckout},
			{"post-checkout", core.HookTypePostCheckout},
		}

		fmt.Println("Hooks:")
		for _, ht := range hookTypes {
			hookPath := hooks.GetHookPath(ht.typ)
			if utils.Exists(hookPath) {
				fmt.Printf("  %s - %s [exists]\n", ht.name, hookPath)
			} else {
				fmt.Printf("  %s - %s [not found]\n", ht.name, hookPath)
			}
		}
		return nil
	}

	command := args[0]

	if command == "install" {
		if len(args) < 3 {
			return fmt.Errorf("usage: hook install <hook_name> <script_path>")
		}
		if len(args) > 3 {
			return fmt.Errorf("usage: hook install <hook_name> <script_path>")
		}

		hookName := args[1]
		scriptPath := args[2]

		var hookType core.HookType
		switch hookName {
		case "pre-commit":
			hookType = core.HookTypePreCommit
		case "post-commit":
			hookType = core.HookTypePostCommit
		case "pre-checkout":
			hookType = core.HookTypePreCheckout
		case "post-checkout":
			hookType = core.HookTypePostCheckout
		default:
			return fmt.Errorf("unknown hook name: %s", hookName)
		}

		hookPath := hooks.GetHookPath(hookType)

		if !utils.Exists(scriptPath) {
			return fmt.Errorf("script file not found: %s", scriptPath)
		}

		// Copy script to hooks directory
		scriptContent, err := utils.ReadFile(scriptPath)
		if err != nil {
			return fmt.Errorf("failed to read script: %w", err)
		}

		if err := utils.WriteFile(hookPath, scriptContent); err != nil {
			return fmt.Errorf("failed to write hook: %w", err)
		}

		// Make executable (on Unix systems)
		if err := os.Chmod(hookPath, 0755); err != nil {
			// Ignore chmod errors on Windows
		}

		fmt.Printf("Installed hook %s to %s\n", hookName, hookPath)
		return nil
	}

	if command == "remove" || command == "uninstall" {
		if len(args) < 2 {
			return fmt.Errorf("usage: hook remove <hook_name>")
		}
		if len(args) > 2 {
			return fmt.Errorf("usage: hook remove <hook_name>")
		}

		hookName := args[1]

		var hookType core.HookType
		switch hookName {
		case "pre-commit":
			hookType = core.HookTypePreCommit
		case "post-commit":
			hookType = core.HookTypePostCommit
		case "pre-checkout":
			hookType = core.HookTypePreCheckout
		case "post-checkout":
			hookType = core.HookTypePostCheckout
		default:
			return fmt.Errorf("unknown hook name: %s", hookName)
		}

		hookPath := hooks.GetHookPath(hookType)

		if utils.Exists(hookPath) {
			if err := utils.RemoveRecursive(hookPath); err != nil {
				return fmt.Errorf("failed to remove hook: %w", err)
			}
			fmt.Printf("Removed hook %s\n", hookName)
		} else {
			fmt.Printf("Hook %s not found\n", hookName)
		}
		return nil
	}

	return fmt.Errorf("unknown hook command: %s\nUsage: forester hook [list|install|remove]", command)
}
