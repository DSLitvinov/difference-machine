package commands

import (
	"encoding/json"
	"fmt"
	"path/filepath"
	"strings"

	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/models"
	"github.com/difference-machine/forester/internal/utils"
)

// Add adds files to the staging area (index).
// Files are hashed and stored as blobs before being added to the index.
//
// Usage:
//   forester add <file>                # Add specific file
//   forester add .                     # Add all files
//   forester add -u                    # Add only tracked files (update)
func Add(args []string) error {
	// Parse flags
	updateOnly := false
	var fileArgs []string
	
	for _, arg := range args {
		if arg == "-u" || arg == "--update" {
			updateOnly = true
		} else if strings.HasPrefix(arg, "-") {
			return fmt.Errorf("unknown flag: %s", arg)
		} else {
			fileArgs = append(fileArgs, arg)
		}
	}
	
	if updateOnly && len(fileArgs) == 0 {
		// Add -u without files: add all tracked files
		fileArgs = []string{"."}
	}
	
	if len(fileArgs) == 0 {
		return fmt.Errorf("no files specified. Use '.' to add all files")
	}

	repoPath, err := utils.FindRepositoryRoot(".")
	if err != nil {
		return fmt.Errorf("not a Forester repository")
	}

	repo, err := core.OpenRepository(repoPath)
	if err != nil {
		return fmt.Errorf("failed to open repository: %w", err)
	}
	defer repo.Close()

	storage := repo.Storage

	index, err := core.NewIndex(repoPath)
	if err != nil {
		return fmt.Errorf("failed to create index: %w", err)
	}

	// Load .dfmignore
	patterns := utils.NewPatterns()
	ignorePath := filepath.Join(repoPath, ".dfmignore")
	if utils.Exists(ignorePath) {
		if err := patterns.LoadFromFile(ignorePath); err != nil {
			// Ignore error loading ignore file
		}
	}

	// Get tracked files (path -> hash) from HEAD to filter -u and skip unchanged files
	trackedFiles := make(map[string]string)
	refs := repo.Refs
	currentBranch, err := refs.GetCurrentBranch()
	if err != nil || currentBranch == "" {
		currentBranch = "main"
	}
	headCommit, err := repo.GetBranchHead(currentBranch)
	if err == nil && headCommit != "" {
		commit, err := repo.GetCommit(headCommit)
		if err == nil {
			treeContent, err := storage.GetTreeContent(commit.TreeHash)
			if err == nil {
				var tree models.Tree
				if json.Unmarshal([]byte(treeContent), &tree) == nil {
					treeMap := make(map[string]*models.TreeEntry)
					if err := core.BuildTreeMapRecursive(storage, &tree, "", treeMap); err != nil {
						return fmt.Errorf("build tree map: %w", err)
					}
					for path, entry := range treeMap {
						if entry.Type == "blob" {
							trackedFiles[path] = entry.Hash
						}
					}
				}
			}
		}
	}

	var filesToAdd []string

	// Parse arguments
	for _, arg := range fileArgs {
		if arg == "." || arg == "*" {
			// Add all files
			allFiles, err := utils.ListFiles(repoPath, true)
			if err != nil {
				return fmt.Errorf("failed to list files: %w", err)
			}

			for _, filePath := range allFiles {
				// Skip .DFM directory
				if strings.Contains(filePath, ".DFM") {
					continue
				}

				relPath, err := utils.GetRelativePath(repoPath, filePath)
				if err != nil {
					continue
				}
				
				// Normalize path separators to match BuildTreeMapRecursive
				relPath = filepath.ToSlash(relPath)

				// Skip ignored files
				if patterns.Matches(relPath) {
					continue
				}

				// If -u, only add tracked files
				if updateOnly {
					if _, tracked := trackedFiles[relPath]; !tracked {
						continue
					}
				}

				filesToAdd = append(filesToAdd, filePath)
			}
		} else {
			// Validate path
			if !utils.IsValidPath(arg) {
				return fmt.Errorf("invalid path: %s", arg)
			}

			// Resolve path
			var absPath string
			if filepath.IsAbs(arg) {
				absPath = arg
			} else {
				absPath = filepath.Join(repoPath, arg)
			}

			// Check if it's a directory
			if utils.Exists(absPath) && utils.IsDirectory(absPath) {
				// Recursively add files from directory
				dirFiles, err := utils.ListFiles(absPath, true)
				if err != nil {
					return fmt.Errorf("failed to list files in directory: %w", err)
				}

				for _, filePath := range dirFiles {
					// Skip .DFM directory
					if strings.Contains(filePath, ".DFM") {
						continue
					}

					relPath, err := utils.GetRelativePath(repoPath, filePath)
					if err != nil {
						continue
					}
					
					// Normalize path separators to match BuildTreeMapRecursive
					relPath = filepath.ToSlash(relPath)

					// Skip ignored files
					if patterns.Matches(relPath) {
						continue
					}

					// If -u, only add tracked files
					if updateOnly {
						if _, tracked := trackedFiles[relPath]; !tracked {
							continue
						}
					}

					filesToAdd = append(filesToAdd, filePath)
				}
			} else if utils.Exists(absPath) {
				// Single file
				relPath, err := utils.GetRelativePath(repoPath, absPath)
				if err != nil {
					return fmt.Errorf("failed to get relative path: %w", err)
				}
				
				// Normalize path separators to match BuildTreeMapRecursive
				relPath = filepath.ToSlash(relPath)

				// Skip ignored files
				if patterns.Matches(relPath) {
					fmt.Printf("Skipping ignored file: %s\n", relPath)
					continue
				}

				// If -u, only add tracked files
				if updateOnly {
					if _, tracked := trackedFiles[relPath]; !tracked {
						continue
					}
				}

				filesToAdd = append(filesToAdd, absPath)
			}
		}
	}

	// Add files to index
	addedCount := 0
	updatedCount := 0
	deletedCount := 0

	for _, filePath := range filesToAdd {
		// Calculate hash
		hash, err := core.HashFile(filePath)
		if err != nil {
			fmt.Printf("Warning: failed to hash file %s: %v\n", filePath, err)
			continue
		}

		relPath, err := utils.GetRelativePath(repoPath, filePath)
		if err != nil {
			fmt.Printf("Warning: failed to get relative path for %s: %v\n", filePath, err)
			continue
		}
		relPath = filepath.ToSlash(relPath)

		// If file matches HEAD, ensure it's not staged as a change
		if headHash, tracked := trackedFiles[relPath]; tracked && headHash == hash {
			if _, exists := index.GetHash(filePath); exists {
				_ = index.Remove(filePath)
			} else if _, exists := index.GetHash(relPath); exists {
				_ = index.Remove(relPath)
			}
			continue
		}

		// Store blob if not exists
		if _, err := storage.StoreBlobFromFile(filePath); err != nil {
			fmt.Printf("Warning: failed to store blob for %s: %v\n", filePath, err)
			continue
		}

		// Check if file is already in index with same hash
		existingHash, exists := index.GetHash(filePath)
		
		if exists && existingHash == hash {
			// Already staged with same hash, skip
			continue
		}

		// Add to index
		if err := index.Add(filePath, hash); err != nil {
			fmt.Printf("Warning: failed to add %s to index: %v\n", filePath, err)
			continue
		}

		if exists {
			updatedCount++
		} else {
			addedCount++
		}
	}

	// Stage deletions for tracked files that are missing on disk
	if len(fileArgs) > 0 {
		var deletionScopes []string
		for _, arg := range fileArgs {
			if arg == "." || arg == "*" {
				deletionScopes = append(deletionScopes, "")
				continue
			}

			var absPath string
			if filepath.IsAbs(arg) {
				absPath = arg
			} else {
				absPath = filepath.Join(repoPath, arg)
			}

			if utils.Exists(absPath) {
				if utils.IsDirectory(absPath) {
					relDir, err := utils.GetRelativePath(repoPath, absPath)
					if err == nil {
						deletionScopes = append(deletionScopes, filepath.ToSlash(relDir))
					}
				}
				continue
			}

			relPath, err := utils.GetRelativePath(repoPath, absPath)
			if err != nil {
				relPath = arg
			}
			relPath = filepath.ToSlash(relPath)

			if _, tracked := trackedFiles[relPath]; tracked {
				if existingHash, exists := index.GetHash(filepath.Join(repoPath, relPath)); !exists || !core.IsDeletedHash(existingHash) {
					if err := index.MarkDeleted(filepath.Join(repoPath, relPath)); err != nil {
						fmt.Printf("Warning: failed to stage deletion for %s: %v\n", relPath, err)
					} else {
						deletedCount++
					}
				}
			} else {
				return fmt.Errorf("file or directory does not exist: %s", arg)
			}
		}

		if len(deletionScopes) > 0 {
			for relPath := range trackedFiles {
				normalized := filepath.ToSlash(relPath)
				inScope := false
				for _, scope := range deletionScopes {
					if scope == "" || normalized == scope || strings.HasPrefix(normalized, scope+"/") {
						inScope = true
						break
					}
				}
				if !inScope {
					continue
				}
				fullPath := filepath.Join(repoPath, normalized)
				if utils.Exists(fullPath) {
					continue
				}
				if existingHash, exists := index.GetHash(filepath.Join(repoPath, normalized)); !exists || !core.IsDeletedHash(existingHash) {
					if err := index.MarkDeleted(filepath.Join(repoPath, normalized)); err != nil {
						fmt.Printf("Warning: failed to stage deletion for %s: %v\n", normalized, err)
					} else {
						deletedCount++
					}
				}
			}
		}
	}

	// Print summary
	if addedCount > 0 || updatedCount > 0 || deletedCount > 0 {
		if addedCount > 0 {
			fmt.Printf("Added %d file(s) to staging area\n", addedCount)
		}
		if updatedCount > 0 {
			fmt.Printf("Updated %d file(s) in staging area\n", updatedCount)
		}
		if deletedCount > 0 {
			fmt.Printf("Deleted %d file(s) in staging area\n", deletedCount)
		}
	} else {
		fmt.Println("No changes to add")
	}

	return nil
}

