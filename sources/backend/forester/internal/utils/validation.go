package utils

import (
	"fmt"
	"path/filepath"
	"regexp"
	"strings"
)

// IsValidBranchName checks if a branch name is valid
func IsValidBranchName(name string) bool {
	if name == "" {
		return false
	}

	// Branch names cannot contain certain characters
	invalidChars := []string{"..", "~", "^", ":", "?", "*", "[", "\\", " ", "\t", "\n", "\r"}
	for _, char := range invalidChars {
		if strings.Contains(name, char) {
			return false
		}
	}

	// Cannot start with . or /
	if strings.HasPrefix(name, ".") || strings.HasPrefix(name, "/") {
		return false
	}

	// Cannot end with . or /
	if strings.HasSuffix(name, ".") || strings.HasSuffix(name, "/") {
		return false
	}

	// Cannot be a reserved name
	reserved := []string{"HEAD", "head"}
	nameLower := strings.ToLower(name)
	for _, res := range reserved {
		if nameLower == strings.ToLower(res) {
			return false
		}
	}

	return true
}

// IsValidTagName checks if a tag name is valid
func IsValidTagName(name string) bool {
	if name == "" {
		return false
	}

	// Tag names cannot contain certain characters
	invalidChars := []string{"..", "~", "^", ":", "?", "*", "[", "\\", " ", "\t", "\n", "\r"}
	for _, char := range invalidChars {
		if strings.Contains(name, char) {
			return false
		}
	}

	// Cannot start with . or /
	if strings.HasPrefix(name, ".") || strings.HasPrefix(name, "/") {
		return false
	}

	// Cannot end with . or /
	if strings.HasSuffix(name, ".") || strings.HasSuffix(name, "/") {
		return false
	}

	return true
}

// IsValidCommitHash checks if a string looks like a valid commit hash
// Requires full SHA-256 hash (64 hex characters)
func IsValidCommitHash(hash string) bool {
	if len(hash) != 64 {
		return false
	}

	// SHA-256 hex string (exactly 64 chars)
	matched, _ := regexp.MatchString("^[0-9a-fA-F]{64}$", hash)
	return matched
}

// IsValidPath checks if a path is valid
func IsValidPath(path string) bool {
	if path == "" {
		return false
	}

	// Cannot contain null bytes
	if strings.Contains(path, "\x00") {
		return false
	}

	return true
}

// ValidateRefPath validates that a ref path is safe and within repository
func ValidateRefPath(baseDir, refPath string) (string, error) {
	// Check for ..
	if strings.Contains(refPath, "..") {
		return "", fmt.Errorf("invalid ref path: contains ..")
	}

	// Check for absolute paths
	if filepath.IsAbs(refPath) {
		return "", fmt.Errorf("invalid ref path: absolute path not allowed")
	}

	// Build full path and verify it's inside baseDir
	fullPath := filepath.Join(baseDir, refPath)
	relPath, err := filepath.Rel(baseDir, fullPath)
	if err != nil || strings.HasPrefix(relPath, "..") {
		return "", fmt.Errorf("invalid ref path: outside repository")
	}

	return fullPath, nil
}

