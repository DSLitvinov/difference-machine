package commands

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/utils"
)

// Rm removes files from the staging area (index) and from the working directory by default
// Usage:
//   rm <file>     - Remove file from index and disk
//   rm -r <dir>   - Recursively remove directory from index and disk
func Rm(args []string) error {
	if len(args) == 0 {
		return fmt.Errorf("no files specified")
	}

	repoPath, err := utils.FindRepositoryRoot(".")
	if err != nil {
		return fmt.Errorf("not a Forester repository")
	}

	index, err := core.NewIndex(repoPath)
	if err != nil {
		return fmt.Errorf("failed to create index: %w", err)
	}

	// Parse flags
	recursive := false
	var filesToRemove []string

	for _, arg := range args {
		if arg == "-r" || arg == "--recursive" {
			recursive = true
		} else if strings.HasPrefix(arg, "-") {
			return fmt.Errorf("unknown flag: %s (use 'drop' to remove from index only)", arg)
		} else {
			filesToRemove = append(filesToRemove, arg)
		}
	}

	if len(filesToRemove) == 0 {
		return fmt.Errorf("no files specified")
	}

	var removedFromIndex []string
	var removedFromWD []string
	var errors []string

	// Process each file/directory
	for _, fileArg := range filesToRemove {
		// Resolve path
		var absPath string
		if filepath.IsAbs(fileArg) {
			absPath = fileArg
		} else {
			absPath = filepath.Join(repoPath, fileArg)
		}

		relPath, err := utils.GetRelativePath(repoPath, absPath)
		if err != nil {
			// Try to find in index by relative path
			relPath = fileArg
		}

		// Check if file is in index
		if !index.HasFile(absPath) && !index.HasFile(relPath) {
			// Try to find by matching paths in index
			found := false
			indexEntries := index.GetEntries()
			for path := range indexEntries {
				if path == relPath || strings.HasPrefix(path, relPath+"/") {
					found = true
					break
				}
			}
			if !found {
				errors = append(errors, fmt.Sprintf("file '%s' is not in index", fileArg))
				continue
			}
		}

		// Check if it's a directory
		if utils.Exists(absPath) && utils.IsDirectory(absPath) {
			if !recursive {
				errors = append(errors, fmt.Sprintf("'%s' is a directory. Use -r or --recursive to remove recursively", fileArg))
				continue
			}

			// Remove all files from directory recursively
			indexEntries := index.GetEntries()
			for path := range indexEntries {
				if path == relPath || strings.HasPrefix(path, relPath+"/") {
					// Stage deletion in index
					if err := index.MarkDeleted(path); err != nil {
						errors = append(errors, fmt.Sprintf("failed to stage deletion for '%s': %v", path, err))
						continue
					}
					removedFromIndex = append(removedFromIndex, path)

					// Remove from working directory
					fullPath := filepath.Join(repoPath, path)
					if utils.Exists(fullPath) && !utils.IsDirectory(fullPath) {
						if err := os.Remove(fullPath); err != nil {
							errors = append(errors, fmt.Sprintf("failed to remove '%s' from working directory: %v", path, err))
						} else {
							removedFromWD = append(removedFromWD, path)
						}
					}
				}
			}

			// Note: We don't force remove non-empty directories, only tracked files
			// The directory will remain if it has untracked files
		} else {
			// Single file
			// Stage deletion in index
			if err := index.MarkDeleted(absPath); err != nil {
				// Try with relative path
				if err2 := index.MarkDeleted(relPath); err2 != nil {
					errors = append(errors, fmt.Sprintf("failed to stage deletion for '%s': %v", fileArg, err))
					continue
				}
			}
			removedFromIndex = append(removedFromIndex, relPath)

			// Remove from working directory
			if utils.Exists(absPath) && !utils.IsDirectory(absPath) {
				if err := os.Remove(absPath); err != nil {
					errors = append(errors, fmt.Sprintf("failed to remove '%s' from working directory: %v", fileArg, err))
				} else {
					removedFromWD = append(removedFromWD, relPath)
				}
			}
		}
	}

	// Print results
	if len(removedFromIndex) > 0 {
		fmt.Printf("Removed %d file(s) from staging area", len(removedFromIndex))
		if len(removedFromWD) > 0 {
			fmt.Printf(" and working directory")
		}
		fmt.Println(":")
		for _, file := range removedFromIndex {
			fmt.Printf("  %s\n", file)
		}
	}

	if len(errors) > 0 {
		for _, err := range errors {
			fmt.Fprintf(os.Stderr, "Error: %s\n", err)
		}
		return fmt.Errorf("some errors occurred")
	}

	if len(removedFromIndex) == 0 {
		return fmt.Errorf("no files were removed")
	}

	return nil
}

