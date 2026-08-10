package paths

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

// ResolveExecutablePath returns an absolute path to a runnable binary.
// On macOS, .app bundles are resolved to Contents/MacOS/<executable>.
func ResolveExecutablePath(path string) (string, error) {
	canonical, err := CanonicalAbsPath(path)
	if err != nil {
		return "", err
	}
	if canonical == "" {
		return "", fmt.Errorf("path is empty")
	}

	info, err := os.Stat(canonical)
	if err != nil {
		return "", err
	}
	if !info.IsDir() {
		return canonical, nil
	}

	if runtime.GOOS == "darwin" && strings.HasSuffix(strings.ToLower(canonical), ".app") {
		return resolveDarwinAppBundle(canonical)
	}

	return "", fmt.Errorf("path must be a file: %s", canonical)
}

func resolveDarwinAppBundle(appPath string) (string, error) {
	macOSDir := filepath.Join(appPath, "Contents", "MacOS")
	info, err := os.Stat(macOSDir)
	if err != nil || !info.IsDir() {
		return "", fmt.Errorf("invalid application bundle: %s", appPath)
	}

	appName := filepath.Base(appPath)
	primaryName := strings.TrimSuffix(appName, filepath.Ext(appName))
	primary := filepath.Join(macOSDir, primaryName)
	if st, err := os.Stat(primary); err == nil && !st.IsDir() {
		return primary, nil
	}

	entries, err := os.ReadDir(macOSDir)
	if err != nil {
		return "", err
	}
	for _, entry := range entries {
		if entry.IsDir() || strings.HasPrefix(entry.Name(), ".") {
			continue
		}
		candidate := filepath.Join(macOSDir, entry.Name())
		if st, err := os.Stat(candidate); err == nil && !st.IsDir() {
			return candidate, nil
		}
	}

	return "", fmt.Errorf("no executable found in %s", appPath)
}
