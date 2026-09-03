package utils

import (
	"strings"
)

// DfmignoreRelPath is the repository ignore config at repo root (hidden from GUI file lists).
const DfmignoreRelPath = ".dfmignore"

// TmpReviewRelPath is the compare extract directory (repo-relative, slash-separated).
const TmpReviewRelPath = ".DFM/tmp_review"

// NormalizeRepoRelPath normalizes a repository-relative path for comparisons.
// API relative paths always use forward slashes; accept backslashes from any OS input.
func NormalizeRepoRelPath(relPath string) string {
	p := strings.ReplaceAll(strings.TrimSpace(relPath), "\\", "/")
	p = strings.TrimPrefix(p, "./")
	return strings.Trim(p, "/")
}

// IsDfmignoreRelPath reports whether relPath refers to the root .dfmignore file.
func IsDfmignoreRelPath(relPath string) bool {
	return NormalizeRepoRelPath(relPath) == DfmignoreRelPath
}

// IsTmpReviewRelPath reports whether relPath is tmp_review or a file inside it.
func IsTmpReviewRelPath(relPath string) bool {
	rel := NormalizeRepoRelPath(relPath)
	return rel == TmpReviewRelPath || strings.HasPrefix(rel, TmpReviewRelPath+"/")
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
