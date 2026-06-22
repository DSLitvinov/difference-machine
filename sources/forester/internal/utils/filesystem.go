package utils

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// Exists checks if a path exists
func Exists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

// IsFile checks if path is a regular file
func IsFile(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	return !info.IsDir()
}

// IsDirectory checks if path is a directory
func IsDirectory(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	return info.IsDir()
}

// CreateDirectories creates all directories in the path
func CreateDirectories(path string) error {
	return os.MkdirAll(path, 0755)
}

// CreateDirectory creates a single directory
func CreateDirectory(path string) error {
	return os.Mkdir(path, 0755)
}

// GetAbsolutePath returns the absolute path
func GetAbsolutePath(path string) (string, error) {
	return filepath.Abs(path)
}

// GetParentPath returns the parent directory path
func GetParentPath(path string) string {
	return filepath.Dir(path)
}

// GetFilename returns the filename from a path
func GetFilename(path string) string {
	return filepath.Base(path)
}

// JoinPaths joins multiple path components
func JoinPaths(parts ...string) string {
	return filepath.Join(parts...)
}

// ReadFile reads the entire contents of a file
func ReadFile(path string) ([]byte, error) {
	return os.ReadFile(path)
}

// ReadFileString reads a file and returns its contents as a string
func ReadFileString(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// WriteFileAtomic writes content atomically via a temporary file and rename.
func WriteFileAtomic(path string, content []byte) error {
	dir := filepath.Dir(path)
	if err := CreateDirectories(dir); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}
	tmp, err := os.CreateTemp(dir, ".tmp-*")
	if err != nil {
		return fmt.Errorf("failed to create temp file: %w", err)
	}
	tmpName := tmp.Name()
	cleanup := func() {
		_ = tmp.Close()
		_ = os.Remove(tmpName)
	}
	if _, err := tmp.Write(content); err != nil {
		cleanup()
		return fmt.Errorf("failed to write temp file: %w", err)
	}
	if err := tmp.Close(); err != nil {
		cleanup()
		return fmt.Errorf("failed to close temp file: %w", err)
	}
	if err := os.Rename(tmpName, path); err != nil {
		cleanup()
		return fmt.Errorf("failed to rename temp file: %w", err)
	}
	return nil
}

// WriteFile writes content to a file, creating directories if needed
func WriteFile(path string, content []byte) error {
	return WriteFileAtomic(path, content)
}

// WriteFileString writes a string to a file
func WriteFileString(path string, content string) error {
	return WriteFile(path, []byte(content))
}

// CopyFile copies a file from source to destination
func CopyFile(source, dest string) error {
	src, err := os.Open(source)
	if err != nil {
		return fmt.Errorf("failed to open source file: %w", err)
	}
	defer src.Close()

	dir := filepath.Dir(dest)
	if err := CreateDirectories(dir); err != nil {
		return fmt.Errorf("failed to create destination directory: %w", err)
	}

	dst, err := os.Create(dest)
	if err != nil {
		return fmt.Errorf("failed to create destination file: %w", err)
	}
	defer dst.Close()

	_, err = io.Copy(dst, src)
	if err != nil {
		return fmt.Errorf("failed to copy file: %w", err)
	}

	return nil
}

// ListFiles lists files in a directory, optionally recursively
func ListFiles(dir string, recursive bool) ([]string, error) {
	var files []string

	if !recursive {
		entries, err := os.ReadDir(dir)
		if err != nil {
			return nil, err
		}
		for _, entry := range entries {
			if !entry.IsDir() {
				files = append(files, filepath.Join(dir, entry.Name()))
			}
		}
		return files, nil
	}

	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() {
			files = append(files, path)
		}
		return nil
	})

	return files, err
}

// RemoveRecursive removes a path and all its contents
func RemoveRecursive(path string) error {
	return os.RemoveAll(path)
}

// NormalizePath normalizes a path (resolves . and ..)
func NormalizePath(path string) (string, error) {
	return filepath.Abs(path)
}

// GetRelativePath returns the relative path from base to target
func GetRelativePath(base, target string) (string, error) {
	return filepath.Rel(base, target)
}

// FindRepositoryRoot finds the root of a Forester repository by looking for .DFM directory
func FindRepositoryRoot(startPath string) (string, error) {
	absPath, err := filepath.Abs(startPath)
	if err != nil {
		return "", err
	}

	current := absPath
	for {
		dfmPath := filepath.Join(current, ".DFM")
		if Exists(dfmPath) && IsDirectory(dfmPath) {
			return current, nil
		}

		parent := filepath.Dir(current)
		if parent == current {
			// Reached root directory
			return "", fmt.Errorf("not a Forester repository")
		}
		current = parent
	}
}

// FindRepositoryRootOrEmpty finds repository root or returns empty string if not found
func FindRepositoryRootOrEmpty(startPath string) string {
	root, err := FindRepositoryRoot(startPath)
	if err != nil {
		return ""
	}
	return root
}

// EnsureDirectory ensures a directory exists, creating it if necessary
func EnsureDirectory(path string) error {
	if Exists(path) {
		if !IsDirectory(path) {
			return fmt.Errorf("path exists but is not a directory: %s", path)
		}
		return nil
	}
	return CreateDirectories(path)
}

// PathSeparator returns the path separator for the current OS
func PathSeparator() string {
	return string(filepath.Separator)
}

// CleanPath cleans a path (removes redundant separators and . elements)
func CleanPath(path string) string {
	return filepath.Clean(path)
}

// SplitPath splits a path into directory and filename
func SplitPath(path string) (string, string) {
	return filepath.Split(path)
}

// Ext returns the file extension
func Ext(path string) string {
	return filepath.Ext(path)
}

// HasPrefix checks if a path has a given prefix (handles both / and \ separators)
func HasPrefix(path, prefix string) bool {
	// Normalize both paths
	path = filepath.Clean(path)
	prefix = filepath.Clean(prefix)

	// Handle Windows drive letters
	if len(path) > 0 && len(prefix) > 0 {
		pathLower := strings.ToLower(path)
		prefixLower := strings.ToLower(prefix)
		return strings.HasPrefix(pathLower, prefixLower)
	}
	return strings.HasPrefix(path, prefix)
}
