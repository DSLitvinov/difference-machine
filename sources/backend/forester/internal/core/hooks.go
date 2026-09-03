package core

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/difference-machine/forester/internal/utils"
)

// HookType represents the type of hook
type HookType int

const (
	HookTypePreCommit HookType = iota
	HookTypePostCommit
	HookTypePreCheckout
	HookTypePostCheckout
)

// Hooks manages Git-like hooks
type Hooks struct {
	repoPath string
}

// NewHooks creates a new Hooks instance
func NewHooks(repoPath string) *Hooks {
	return &Hooks{repoPath: repoPath}
}

// ExecuteHook executes a hook script
func (h *Hooks) ExecuteHook(hookType HookType, envVars []string) (bool, error) {
	hookPath := h.GetHookPath(hookType)

	if !utils.Exists(hookPath) {
		return true, nil // Hook doesn't exist, skip
	}

	// Check if hook is executable
	info, err := os.Stat(hookPath)
	if err != nil {
		return false, err
	}
	if info.Mode()&0111 == 0 {
		// Make executable on Unix systems
		if err := os.Chmod(hookPath, 0755); err != nil {
			// Ignore chmod errors on Windows
		}
	}

	// Check if this is a shell script (has shebang)
	isShellScript := false
	var interpreter string
	
	file, err := os.Open(hookPath)
	if err == nil {
		scanner := bufio.NewScanner(file)
		if scanner.Scan() {
			firstLine := scanner.Text()
			if strings.HasPrefix(firstLine, "#!") {
				isShellScript = true
				// Extract interpreter from shebang
				interpreter = strings.TrimSpace(strings.TrimPrefix(firstLine, "#!"))
				// Remove arguments if any
				if spaceIdx := strings.Index(interpreter, " "); spaceIdx != -1 {
					interpreter = interpreter[:spaceIdx]
				}
			}
		}
		file.Close()
	}

	var cmd *exec.Cmd
	
	// On Windows, if it's a shell script, try to find sh
	if runtime.GOOS == "windows" && isShellScript {
		// Try to find sh (Git Bash, WSL, etc.)
		shPaths := []string{
			"C:\\Program Files\\Git\\bin\\sh.exe",
			"C:\\Program Files (x86)\\Git\\bin\\sh.exe",
			"sh.exe", // In PATH
			"bash.exe", // In PATH
		}
		
		foundSh := false
		for _, shPath := range shPaths {
			if _, err := exec.LookPath(shPath); err == nil {
				cmd = exec.Command(shPath, hookPath)
				foundSh = true
				break
			}
		}
		
		if !foundSh {
			// No sh found, skip hook with warning but don't fail
			// This allows commits to proceed even without shell interpreter
			fmt.Fprintf(os.Stderr, "Warning: pre-commit hook is a shell script but no shell interpreter found.\n")
			fmt.Fprintf(os.Stderr, "Install Git Bash or use --no-verify to skip hooks.\n")
			// Return success to allow commit to proceed
			return true, nil
		}
	} else {
		// Unix-like or non-shell script on Windows
		if isShellScript && interpreter != "" {
			// Use the interpreter from shebang
			cmd = exec.Command(interpreter, hookPath)
		} else {
			// Execute directly
			cmd = exec.Command(hookPath)
		}
	}

	// Set environment variables
	env := os.Environ()
	for _, envVar := range envVars {
		parts := strings.SplitN(envVar, "=", 2)
		if len(parts) == 2 {
			env = append(env, fmt.Sprintf("%s=%s", parts[0], parts[1]))
		}
	}
	cmd.Env = env

	// Set working directory to repository root
	cmd.Dir = h.repoPath

	// Execute hook
	err = cmd.Run()
	if err != nil {
		if exitError, ok := err.(*exec.ExitError); ok {
			// Hook returned non-zero exit code
			return false, fmt.Errorf("hook failed with exit code %d", exitError.ExitCode())
		}
		return false, fmt.Errorf("failed to execute hook: %w", err)
	}

	return true, nil
}

// GetHookPath returns the path to a hook script
func (h *Hooks) GetHookPath(hookType HookType) string {
	hookName := h.getHookName(hookType)
	return filepath.Join(h.repoPath, ".DFM", "hooks", hookName)
}

// getHookPath returns the path to a hook script (private alias)
func (h *Hooks) getHookPath(hookType HookType) string {
	return h.GetHookPath(hookType)
}

// getHookName returns the name of a hook script
func (h *Hooks) getHookName(hookType HookType) string {
	switch hookType {
	case HookTypePreCommit:
		return "pre-commit"
	case HookTypePostCommit:
		return "post-commit"
	case HookTypePreCheckout:
		return "pre-checkout"
	case HookTypePostCheckout:
		return "post-checkout"
	default:
		return ""
	}
}


