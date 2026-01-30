package commands

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/utils"
)

// Mv renames or moves files in the index and working directory
// Usage:
//   mv <old> <new>     - Rename/move file
func Mv(args []string) error {
	if len(args) < 2 {
		return fmt.Errorf("usage: mv <old> <new>")
	}
	if len(args) > 2 {
		return fmt.Errorf("usage: mv <old> <new>")
	}
	if strings.HasPrefix(args[0], "-") || strings.HasPrefix(args[1], "-") {
		return fmt.Errorf("flags are not supported for mv")
	}

	repoPath, err := utils.FindRepositoryRoot(".")
	if err != nil {
		return fmt.Errorf("not a Forester repository")
	}

	index, err := core.NewIndex(repoPath)
	if err != nil {
		return fmt.Errorf("failed to create index: %w", err)
	}

	oldPath := args[0]
	newPath := args[1]

	// Resolve absolute paths
	var oldAbsPath, newAbsPath string
	if filepath.IsAbs(oldPath) {
		oldAbsPath = oldPath
	} else {
		oldAbsPath = filepath.Join(repoPath, oldPath)
	}

	if filepath.IsAbs(newPath) {
		newAbsPath = newPath
	} else {
		newAbsPath = filepath.Join(repoPath, newPath)
	}

	// Get relative paths
	oldRelPath, err := utils.GetRelativePath(repoPath, oldAbsPath)
	if err != nil {
		// Try to find in index by the provided path
		oldRelPath = oldPath
	}

	newRelPath, err := utils.GetRelativePath(repoPath, newAbsPath)
	if err != nil {
		return fmt.Errorf("invalid new path: %w", err)
	}

	// Check if old file exists in index
	hash, exists := index.GetHash(oldAbsPath)
	if !exists {
		// Try with relative path
		hash, exists = index.GetHash(oldRelPath)
		if !exists {
			return fmt.Errorf("file '%s' is not in index", oldPath)
		}
		oldRelPath = oldPath
	}

	// Check if new path already exists in index
	if index.HasFile(newAbsPath) || index.HasFile(newRelPath) {
		return fmt.Errorf("destination '%s' already exists in index", newPath)
	}

	// Check if new path exists on disk
	if utils.Exists(newAbsPath) {
		return fmt.Errorf("destination '%s' already exists on disk", newPath)
	}

	// Ensure new directory exists
	newDir := filepath.Dir(newAbsPath)
	if err := utils.EnsureDirectory(newDir); err != nil {
		return fmt.Errorf("failed to create destination directory: %w", err)
	}

	// Move file on disk if it exists
	if utils.Exists(oldAbsPath) {
		// Check if it's a directory
		if utils.IsDirectory(oldAbsPath) {
			// For directories, we need to update all files in the index that are under this path
			entries := index.GetEntries()
			var filesToMove []struct {
				oldPath string
				newPath string
				hash    string
			}

			// Find all files under old path
			for path, fileHash := range entries {
				if path == oldRelPath || strings.HasPrefix(path, oldRelPath+"/") {
					// Calculate new path
					newFileRelPath := strings.Replace(path, oldRelPath, newRelPath, 1)
					filesToMove = append(filesToMove, struct {
						oldPath string
						newPath string
						hash    string
					}{oldPath: path, newPath: newFileRelPath, hash: fileHash})
				}
			}

			if len(filesToMove) == 0 {
				return fmt.Errorf("no tracked files found under '%s'", oldPath)
			}

			// Move files in index
			for _, fileMove := range filesToMove {
				// Remove old path from index
				if err := index.Remove(fileMove.oldPath); err != nil {
					return fmt.Errorf("failed to remove '%s' from index: %w", fileMove.oldPath, err)
				}

				// Add new path to index
				if err := index.Add(filepath.Join(repoPath, fileMove.newPath), fileMove.hash); err != nil {
					return fmt.Errorf("failed to add '%s' to index: %w", fileMove.newPath, err)
				}
			}

			// Move directory on disk
			if err := os.Rename(oldAbsPath, newAbsPath); err != nil {
				return fmt.Errorf("failed to move directory on disk: %w", err)
			}

			fmt.Printf("Moved directory '%s' to '%s' (%d files)\n", oldPath, newPath, len(filesToMove))
		} else {
			// Single file
			// Remove old path from index
			if err := index.Remove(oldAbsPath); err != nil {
				if err2 := index.Remove(oldRelPath); err2 != nil {
					return fmt.Errorf("failed to remove '%s' from index: %w", oldPath, err)
				}
			}

			// Add new path to index with same hash
			if err := index.Add(newAbsPath, hash); err != nil {
				return fmt.Errorf("failed to add '%s' to index: %w", newPath, err)
			}

			// Move file on disk
			if err := os.Rename(oldAbsPath, newAbsPath); err != nil {
				return fmt.Errorf("failed to move file on disk: %w", err)
			}

			fmt.Printf("Moved '%s' to '%s'\n", oldPath, newPath)
		}
	} else {
		// File doesn't exist on disk, but exists in index (was deleted)
		// Just update index
		if err := index.Remove(oldAbsPath); err != nil {
			if err2 := index.Remove(oldRelPath); err2 != nil {
				return fmt.Errorf("failed to remove '%s' from index: %w", oldPath, err)
			}
		}

		if err := index.Add(newAbsPath, hash); err != nil {
			return fmt.Errorf("failed to add '%s' to index: %w", newPath, err)
		}

		fmt.Printf("Renamed '%s' to '%s' in index (file not on disk)\n", oldPath, newPath)
	}

	return nil
}
