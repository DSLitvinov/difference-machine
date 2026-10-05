package main

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	goruntime "runtime"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func hostPlatform() string {
	return goruntime.GOOS
}

func applicationDialogOptions(goos string) runtime.OpenDialogOptions {
	opts := runtime.OpenDialogOptions{
		Title: "Select application",
	}
	switch goos {
	case "windows":
		opts.DefaultDirectory = windowsProgramFiles()
		opts.Filters = []runtime.FileFilter{{
			DisplayName: "Programs (*.exe)",
			Pattern:     "*.exe",
		}}
	default:
		opts.DefaultDirectory = linuxBinDir()
	}
	return opts
}

// pickDarwinApplication uses the macOS application chooser. A file dialog
// filter cannot select .app bundles because a bundle is a directory.
func pickDarwinApplication() (string, error) {
	script := `try
  set chosen to choose file of type {"app"} default location (POSIX file "/Applications") with prompt "Select application"
  return POSIX path of chosen
on error number -128
  return ""
end try`
	out, err := exec.Command("osascript", "-e", script).Output()
	if err != nil {
		return "", err
	}
	return strings.TrimRight(strings.TrimSpace(string(out)), "/"), nil
}

// normalizeApplicationPath lifts a path inside a macOS bundle to the .app directory.
func normalizeApplicationPath(path, goos string) string {
	if goos != "darwin" {
		return path
	}
	clean := filepath.Clean(path)
	lower := strings.ToLower(filepath.ToSlash(clean))
	if i := strings.Index(lower, ".app/"); i >= 0 {
		return clean[:i+len(".app")]
	}
	return clean
}

func linuxBinDir() string {
	if dirExists("/usr/bin") {
		return "/usr/bin"
	}
	if dirExists("/usr/local/bin") {
		return "/usr/local/bin"
	}
	return "/usr/bin"
}

func dirExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && info.IsDir()
}

func apiLibraryDialogOptions(goos, cliPath string) runtime.OpenDialogOptions {
	opts := runtime.OpenDialogOptions{Title: "Select Forester API library"}
	switch goos {
	case "windows":
		opts.Filters = []runtime.FileFilter{{
			DisplayName: "Forester API (*.dll)",
			Pattern:     "*.dll",
		}}
	case "darwin":
		opts.Filters = []runtime.FileFilter{{
			DisplayName: "Forester API (*.dylib)",
			Pattern:     "*.dylib",
		}}
	default:
		opts.Filters = []runtime.FileFilter{{
			DisplayName: "Forester API (*.so)",
			Pattern:     "*.so",
		}}
	}
	if dir := apiLibraryDir(cliPath); dir != "" {
		opts.DefaultDirectory = dir
	}
	return opts
}

func apiLibraryDir(cliPath string) string {
	lib := resolveAPILibrary(cliPath)
	if lib == "" {
		return ""
	}
	return filepath.Dir(lib)
}

func windowsProgramFiles() string {
	if p := os.Getenv("ProgramFiles"); p != "" {
		return p
	}
	return `C:\Program Files`
}

func stripNamedGTKModules(value string, drop ...string) string {
	if value == "" {
		return ""
	}
	skip := make(map[string]struct{}, len(drop))
	for _, name := range drop {
		skip[name] = struct{}{}
	}
	kept := make([]string, 0)
	for _, part := range strings.Split(value, ":") {
		if part == "" {
			continue
		}
		if _, found := skip[part]; found {
			continue
		}
		kept = append(kept, part)
	}
	return strings.Join(kept, ":")
}
