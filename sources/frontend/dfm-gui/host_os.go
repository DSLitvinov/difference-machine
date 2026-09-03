package main

import (
	"os"
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
	case "darwin":
		opts.DefaultDirectory = "/Applications"
		opts.Filters = []runtime.FileFilter{{
			DisplayName: "Applications (*.app)",
			Pattern:     "*.app",
		}}
	case "windows":
		opts.DefaultDirectory = windowsProgramFiles()
		opts.Filters = []runtime.FileFilter{{
			DisplayName: "Programs (*.exe)",
			Pattern:     "*.exe",
		}}
	default:
		opts.DefaultDirectory = "/usr/bin"
	}
	return opts
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
