package utils

import (
	"path/filepath"
	"strings"
)

// DfmignoreRelPath is the repository ignore config at repo root (hidden from GUI file lists).
const DfmignoreRelPath = ".dfmignore"

// NormalizeRepoRelPath normalizes a repository-relative path for comparisons.
func NormalizeRepoRelPath(relPath string) string {
	p := filepath.ToSlash(strings.TrimSpace(relPath))
	p = strings.TrimPrefix(p, "./")
	return strings.Trim(p, "/")
}

// IsDfmignoreRelPath reports whether relPath refers to the root .dfmignore file.
func IsDfmignoreRelPath(relPath string) bool {
	return NormalizeRepoRelPath(relPath) == DfmignoreRelPath
}

// FilterDfmignorePaths removes .dfmignore from path lists exposed to the GUI.
func FilterDfmignorePaths(paths []string) []string {
	if len(paths) == 0 {
		return paths
	}
	out := make([]string, 0, len(paths))
	for _, path := range paths {
		if !IsDfmignoreRelPath(path) {
			out = append(out, path)
		}
	}
	return out
}
