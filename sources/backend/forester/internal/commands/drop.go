package commands

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/utils"
)

// Drop removes files or directories from the staging area (index) only, keeping them on disk
// This is useful for .gitignore-like scenarios where you want to stop tracking files
// Usage:
//   drop <file>     - Remove file from index only (keep on disk)
//   drop -r <dir>   - Stop tracking directory recursively but keep locally
func Drop(args []string) error {
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
			return fmt.Errorf("unknown flag: %s", arg)
		} else {
			filesToRemove = append(filesToRemove, arg)
		}
	}

	if len(filesToRemove) == 0 {
		return fmt.Errorf("no files specified")
	}

	var removedFromIndex []string
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
				errors = append(errors, fmt.Sprintf("'%s' is a directory. Use -r or --recursive to stop tracking recursively", fileArg))
				continue
			}

			// Remove all files from directory recursively from index only
			indexEntries := index.GetEntries()
			for path := range indexEntries {
				if path == relPath || strings.HasPrefix(path, relPath+"/") {
					// Stage deletion in index (keep on disk)
					if err := index.MarkDeleted(path); err != nil {
						errors = append(errors, fmt.Sprintf("failed to stage deletion for '%s': %v", path, err))
						continue
					}
					removedFromIndex = append(removedFromIndex, path)
				}
			}
		} else {
			// Single file - stage deletion in index (keep on disk)
			if err := index.MarkDeleted(absPath); err != nil {
				// Try with relative path
				if err2 := index.MarkDeleted(relPath); err2 != nil {
					errors = append(errors, fmt.Sprintf("failed to stage deletion for '%s': %v", fileArg, err))
					continue
				}
			}
			removedFromIndex = append(removedFromIndex, relPath)
		}
	}

	// Print results
	if len(removedFromIndex) > 0 {
		fmt.Printf("Stopped tracking %d file(s) (kept on disk):\n", len(removedFromIndex))
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
		return fmt.Errorf("no files were removed from index")
	}

	return nil
}
