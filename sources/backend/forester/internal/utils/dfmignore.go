package utils

import (
	"os"
	"path/filepath"
	"strings"
)

// ReadDfmignore returns the root .dfmignore text. Missing file is empty, not an error.
func ReadDfmignore(repoPath string) (string, error) {
	raw, err := os.ReadFile(filepath.Join(repoPath, DfmignoreRelPath))
	if err != nil {
		if os.IsNotExist(err) {
			return "", nil
		}
		return "", err
	}
	return string(raw), nil
}

// WriteDfmignore replaces the root .dfmignore. Line endings are stored as \n.
func WriteDfmignore(repoPath string, content string) error {
	content = strings.ReplaceAll(content, "\r\n", "\n")
	content = strings.ReplaceAll(content, "\r", "\n")
	return WriteFileString(filepath.Join(repoPath, DfmignoreRelPath), content)
}

// IgnorePatternForRel returns the .dfmignore line for a repo-relative path.
func IgnorePatternForRel(rel string, isDir bool) string {
	rel = NormalizeRepoRelPath(rel)
	if rel == "" {
		return ""
	}
	if isDir {
		return rel + "/"
	}
	return rel
}

// AppendDfmignorePatterns adds patterns to the root .dfmignore if they are not already present.
func AppendDfmignorePatterns(repoPath string, add []string) error {
	ignorePath := filepath.Join(repoPath, DfmignoreRelPath)
	raw, err := os.ReadFile(ignorePath)
	if err != nil && !os.IsNotExist(err) {
		return err
	}
	content := string(raw)

	existing := make(map[string]bool)
	for _, line := range strings.Split(content, "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		existing[line] = true
	}

	patterns := NewPatterns()
	if Exists(ignorePath) {
		_ = patterns.LoadFromFile(ignorePath)
	}

	var lines []string
	for _, pattern := range add {
		pattern = strings.TrimSpace(filepath.ToSlash(pattern))
		if pattern == "" || existing[pattern] {
			continue
		}
		checkPath := strings.TrimSuffix(pattern, "/")
		if patterns.Matches(checkPath) || patterns.Matches(pattern) {
			continue
		}
		lines = append(lines, pattern)
		existing[pattern] = true
	}
	if len(lines) == 0 {
		return nil
	}
	if content != "" && !strings.HasSuffix(content, "\n") {
		content += "\n"
	}
	content += strings.Join(lines, "\n") + "\n"
	return WriteFileString(ignorePath, content)
}

func ignoreLineKeys(pattern string) []string {
	pattern = strings.TrimSpace(filepath.ToSlash(pattern))
	if pattern == "" {
		return nil
	}
	base := strings.TrimSuffix(pattern, "/")
	if base == "" {
		return nil
	}
	return []string{base, base + "/"}
}

// RemoveDfmignorePatterns drops exact path lines from the root .dfmignore.
func RemoveDfmignorePatterns(repoPath string, remove []string) error {
	ignorePath := filepath.Join(repoPath, DfmignoreRelPath)
	raw, err := os.ReadFile(ignorePath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}

	drop := make(map[string]bool)
	for _, pattern := range remove {
		for _, key := range ignoreLineKeys(pattern) {
			drop[key] = true
		}
	}
	if len(drop) == 0 {
		return nil
	}

	var kept []string
	changed := false
	for _, line := range strings.Split(string(raw), "\n") {
		trimmed := strings.TrimSpace(line)
		if trimmed != "" && !strings.HasPrefix(trimmed, "#") && drop[trimmed] {
			changed = true
			continue
		}
		kept = append(kept, line)
	}
	if !changed {
		return nil
	}
	for len(kept) > 0 && kept[len(kept)-1] == "" {
		kept = kept[:len(kept)-1]
	}
	content := strings.Join(kept, "\n")
	if content != "" && !strings.HasSuffix(content, "\n") {
		content += "\n"
	}
	return WriteFileString(ignorePath, content)
}
