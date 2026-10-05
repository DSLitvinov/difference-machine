package main

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

// foresterLayout is the install-relative paths written into ~/.dfm/setup.cfg.
type foresterLayout struct {
	CLI    string
	API    string
	Addon  string
	FFmpeg string
}

// ensureForesterDefaults fills empty or missing Forester CLI, API library,
// and Blender addon paths from the install folder next to this executable.
func ensureForesterDefaults() error {
	exe, err := os.Executable()
	if err != nil {
		return err
	}
	if resolved, err := filepath.EvalSymlinks(exe); err == nil {
		exe = resolved
	}
	layout := discoverForesterLayout(exe, runtime.GOOS)
	cfg, err := loadSetupCfg()
	if err != nil {
		return err
	}
	if !fillForesterDefaults(&cfg, layout) {
		return nil
	}
	return writeSetupCfg(cfg)
}

// NeedsForesterBootstrap reports whether CLI, API library, or addon path is unset or missing on disk.
func NeedsForesterBootstrap(cfg setupCfg) bool {
	return pathMissing(cfg.ForesterPath) || !validAPILibrary(cfg.APIPath) || dirMissing(cfg.AddonPath)
}

func fillForesterDefaults(cfg *setupCfg, layout foresterLayout) bool {
	changed := false
	if pathMissing(cfg.ForesterPath) && layout.CLI != "" {
		cfg.ForesterPath = layout.CLI
		setSection(cfg.raw, "forester", "installed", "true")
		changed = true
	}
	if !validAPILibrary(cfg.APIPath) && layout.API != "" {
		cfg.APIPath = layout.API
		setSection(cfg.raw, "api", "installed", "true")
		changed = true
	}
	if dirMissing(cfg.AddonPath) && layout.Addon != "" {
		cfg.AddonPath = layout.Addon
		changed = true
	}
	if layout.FFmpeg != "" && ffmpegMissing(cfg) {
		setSection(cfg.raw, "forester", "ffmpeg_path", layout.FFmpeg)
		changed = true
	}
	return changed
}

func ffmpegMissing(cfg *setupCfg) bool {
	if cfg.raw["forester"] == nil {
		return true
	}
	return pathMissing(cfg.raw["forester"]["ffmpeg_path"])
}

func discoverForesterLayout(executable, goos string) foresterLayout {
	return discoverInRoots(append(installRoots(executable), defaultInstallRoots(goos)...), goos)
}

// defaultInstallRoots are the packaged install folders used when the GUI
// executable is not sitting next to Forester (for example a dev build).
func defaultInstallRoots(goos string) []string {
	switch goos {
	case "darwin":
		return []string{"/Applications/Difference Machine"}
	case "windows":
		return []string{filepath.Join(windowsProgramFiles(), "Difference Machine")}
	default:
		return []string{"/opt/Difference-Machine"}
	}
}

func discoverInRoots(roots []string, goos string) foresterLayout {
	seen := map[string]struct{}{}
	for _, root := range roots {
		if root == "" {
			continue
		}
		root = filepath.Clean(root)
		if _, ok := seen[root]; ok {
			continue
		}
		seen[root] = struct{}{}
		if goos == "darwin" {
			if lay, ok := macBundleLayout(root); ok {
				return lay
			}
		}
		if lay, ok := flatLayout(root, goos); ok {
			return lay
		}
	}
	return foresterLayout{}
}

func installRoots(executable string) []string {
	dir := filepath.Dir(filepath.Clean(executable))
	var roots []string
	seen := map[string]struct{}{}
	for i := 0; i < 8 && dir != "" && dir != string(filepath.Separator); i++ {
		if _, ok := seen[dir]; !ok {
			seen[dir] = struct{}{}
			roots = append(roots, dir)
		}
		next := filepath.Dir(dir)
		if next == dir {
			break
		}
		dir = next
	}
	return roots
}

func macBundleLayout(root string) (foresterLayout, bool) {
	app := filepath.Join(root, "Forester.app", "Contents")
	cli := filepath.Join(app, "Resources", "bin", "forester")
	if !fileExists(cli) {
		return foresterLayout{}, false
	}
	lay := foresterLayout{CLI: cli}
	if api := filepath.Join(app, "Frameworks", "libforester.dylib"); fileExists(api) {
		lay.API = api
	}
	if ff := filepath.Join(app, "Resources", "bin", "ffmpeg"); fileExists(ff) {
		lay.FFmpeg = ff
	}
	if addon := addonDir(root); addon != "" {
		lay.Addon = addon
	}
	return lay, true
}

func flatLayout(root, goos string) (foresterLayout, bool) {
	cliName := "forester"
	libName := "libforester.so"
	ffName := "ffmpeg"
	switch goos {
	case "windows":
		cliName = "forester.exe"
		libName = "forester.dll"
		ffName = "ffmpeg.exe"
	case "darwin":
		libName = "libforester.dylib"
	}
	cli := filepath.Join(root, "bin", cliName)
	if !fileExists(cli) {
		return foresterLayout{}, false
	}
	lay := foresterLayout{CLI: cli}
	if api := filepath.Join(root, "lib", libName); fileExists(api) {
		lay.API = api
	}
	if ff := filepath.Join(root, "bin", ffName); fileExists(ff) {
		lay.FFmpeg = ff
	}
	if addon := addonDir(root); addon != "" {
		lay.Addon = addon
	}
	return lay, true
}

func addonDir(root string) string {
	dir := filepath.Join(root, "addons", "blender", "difference_machine")
	if dirExists(dir) {
		return dir
	}
	return ""
}

func fileExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}

func pathMissing(path string) bool {
	return !fileExists(strings.TrimSpace(path))
}

// validAPILibrary reports whether path is an existing Forester native library.
// setup.cfg and the CLI binary are not valid [api] paths.
func validAPILibrary(path string) bool {
	path = strings.TrimSpace(path)
	if !fileExists(path) {
		return false
	}
	switch strings.ToLower(filepath.Ext(path)) {
	case ".dylib", ".so", ".dll":
		return true
	default:
		return false
	}
}

// resolveAPILibrary finds the native library next to a Forester CLI path.
func resolveAPILibrary(cliPath string) string {
	cliPath = strings.TrimSpace(cliPath)
	if cliPath == "" {
		return ""
	}
	clean := filepath.Clean(cliPath)
	// Forester.app/Contents/Resources/bin/forester → Contents/Frameworks/libforester.dylib
	if strings.EqualFold(filepath.Base(filepath.Dir(clean)), "bin") {
		resources := filepath.Dir(filepath.Dir(clean))
		if strings.EqualFold(filepath.Base(resources), "Resources") {
			api := filepath.Join(filepath.Dir(resources), "Frameworks", "libforester.dylib")
			if fileExists(api) {
				return api
			}
		}
		root := filepath.Dir(filepath.Dir(clean))
		for _, name := range []string{"libforester.dylib", "libforester.so", "forester.dll"} {
			api := filepath.Join(root, "lib", name)
			if fileExists(api) {
				return api
			}
		}
	}
	return ""
}

func dirMissing(path string) bool {
	path = strings.TrimSpace(path)
	if path == "" {
		return true
	}
	return !dirExists(path)
}
