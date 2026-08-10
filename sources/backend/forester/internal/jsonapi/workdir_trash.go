package jsonapi

import (
	"fmt"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

// moveToOSTrash moves a file into the platform recycle bin / trash folder.
func moveToOSTrash(absPath string) error {
	resolved, err := filepath.EvalSymlinks(absPath)
	if err == nil {
		absPath = resolved
	}
	absPath, err = filepath.Abs(absPath)
	if err != nil {
		return err
	}

	switch runtime.GOOS {
	case "darwin":
		return moveToMacOSTrash(absPath)
	case "windows":
		return moveToWindowsRecycleBin(absPath)
	default:
		return moveToLinuxTrash(absPath)
	}
}

func moveToMacOSTrash(absPath string) error {
	script := fmt.Sprintf(`tell application "Finder" to delete POSIX file %q`, absPath)
	cmd := exec.Command("osascript", "-e", script)
	configureHiddenExec(cmd)
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("move to Trash: %w", err)
	}
	return nil
}

func moveToWindowsRecycleBin(absPath string) error {
	escaped := strings.ReplaceAll(absPath, "'", "''")
	ps := fmt.Sprintf(
		`Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile('%s', 'OnlyErrorIfAlreadyExists', 'SendToRecycleBin')`,
		escaped,
	)
	cmd := exec.Command("powershell.exe", "-NoProfile", "-NonInteractive", "-Command", ps)
	configureHiddenExec(cmd)
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("move to Recycle Bin: %w", err)
	}
	return nil
}

func moveToLinuxTrash(absPath string) error {
	if err := execTrashCommand("gio", "trash", absPath); err == nil {
		return nil
	}
	if err := execTrashCommand("trash-put", absPath); err == nil {
		return nil
	}
	return moveToFreedesktopTrash(absPath)
}

func execTrashCommand(name string, args ...string) error {
	if _, err := exec.LookPath(name); err != nil {
		return err
	}
	cmd := exec.Command(name, args...)
	configureHiddenExec(cmd)
	return cmd.Run()
}

func moveToFreedesktopTrash(absPath string) error {
	dataHome := os.Getenv("XDG_DATA_HOME")
	if dataHome == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			return err
		}
		dataHome = filepath.Join(home, ".local", "share")
	}

	filesDir := filepath.Join(dataHome, "Trash", "files")
	infoDir := filepath.Join(dataHome, "Trash", "info")
	if err := os.MkdirAll(filesDir, 0o700); err != nil {
		return err
	}
	if err := os.MkdirAll(infoDir, 0o700); err != nil {
		return err
	}

	baseName := filepath.Base(absPath)
	destName := uniqueTrashEntryName(filesDir, baseName)
	destPath := filepath.Join(filesDir, destName)

	if err := os.Rename(absPath, destPath); err != nil {
		if err := copyFile(absPath, destPath); err != nil {
			return fmt.Errorf("move to trash: %w", err)
		}
		if err := os.Remove(absPath); err != nil {
			_ = os.Remove(destPath)
			return fmt.Errorf("move to trash: %w", err)
		}
	}

	infoPath := filepath.Join(infoDir, destName+".trashinfo")
	info := fmt.Sprintf(
		"[Trash Info]\nPath=%s\nDeletionDate=%s\n",
		url.PathEscape(absPath),
		time.Now().Format("2006-01-02T15:04:05"),
	)
	if err := os.WriteFile(infoPath, []byte(info), 0o600); err != nil {
		return fmt.Errorf("write trash metadata: %w", err)
	}
	return nil
}

func uniqueTrashEntryName(dir, baseName string) string {
	candidate := baseName
	for i := 1; ; i++ {
		if _, err := os.Stat(filepath.Join(dir, candidate)); os.IsNotExist(err) {
			return candidate
		}
		ext := filepath.Ext(baseName)
		stem := strings.TrimSuffix(baseName, ext)
		candidate = fmt.Sprintf("%s.%d%s", stem, i, ext)
	}
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o644)
	if err != nil {
		return err
	}
	defer out.Close()

	if _, err := out.ReadFrom(in); err != nil {
		return err
	}
	return out.Close()
}
