package jsonapi

import (
	"fmt"
	"os"
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
		cmd = openDefaultCommand(absPath, runtime.GOOS)
	} else {
		cmd = exec.Command(editorPath, absPath)
	}

	configureHiddenExec(cmd)

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("open file: %w", err)
	}
	go func() { _ = cmd.Wait() }()
	return nil
}

func openDefaultCommand(absPath, goos string) *exec.Cmd {
	dir := false
	if info, err := os.Stat(absPath); err == nil {
		dir = info.IsDir()
	}
	switch goos {
	case "darwin":
		return exec.Command("/usr/bin/open", absPath)
	case "windows":
		if dir {
			return exec.Command("explorer", absPath)
		}
		return exec.Command("rundll32.exe", "url.dll,FileProtocolHandler", absPath)
	default:
		return exec.Command("xdg-open", absPath)
	}
}
