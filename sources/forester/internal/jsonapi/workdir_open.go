package jsonapi

import (
	"fmt"
	"os/exec"
	"path/filepath"
	"runtime"
)

// openWithOSDefault launches the OS default application for the given absolute path.
func openWithOSDefault(absPath string) error {
	return openWithExecutable("", absPath)
}

// openWithExecutable launches the given executable with the file path as an argument.
// When editorPath is empty, the OS default application is used.
func openWithExecutable(editorPath, absPath string) error {
	resolved, err := filepath.EvalSymlinks(absPath)
	if err == nil {
		absPath = resolved
	}

	var cmd *exec.Cmd
	if editorPath == "" {
		switch runtime.GOOS {
		case "darwin":
			cmd = exec.Command("open", absPath)
		case "windows":
			cmd = exec.Command("cmd", "/c", "start", "", absPath)
		default:
			cmd = exec.Command("xdg-open", absPath)
		}
	} else {
		cmd = exec.Command(editorPath, absPath)
	}

	configureHiddenExec(cmd)

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("open file: %w", err)
	}
	return nil
}
