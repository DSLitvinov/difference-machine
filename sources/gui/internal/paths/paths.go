package paths

import (
	"path/filepath"
	"runtime"
	"strings"
)

// CanonicalAbsPath returns a cleaned absolute path using the native OS separator.
func CanonicalAbsPath(path string) (string, error) {
	abs, err := filepath.Abs(strings.TrimSpace(path))
	if err != nil {
		return "", err
	}
	return filepath.Clean(abs), nil
}

// SamePath reports whether two paths refer to the same location.
func SamePath(a, b string) bool {
	ca, err1 := CanonicalAbsPath(a)
	cb, err2 := CanonicalAbsPath(b)
	if err1 != nil || err2 != nil {
		return false
	}
	if runtime.GOOS == "windows" {
		return strings.EqualFold(ca, cb)
	}
	return ca == cb
}

// CanonicalRelPath normalizes a repository-relative path to forward slashes.
func CanonicalRelPath(path string) string {
	p := filepath.ToSlash(strings.TrimSpace(path))
	p = strings.TrimPrefix(p, "./")
	return strings.Trim(p, "/")
}

// Basename returns the last segment of a native or slash-separated path.
func Basename(path string) string {
	path = strings.TrimSpace(path)
	if path == "" {
		return ""
	}
	return filepath.Base(filepath.FromSlash(path))
}
