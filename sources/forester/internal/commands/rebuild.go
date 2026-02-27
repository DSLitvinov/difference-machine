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

// Rebuild rebuilds database
func Rebuild(args []string) error {
	if len(args) > 0 {
		return fmt.Errorf("usage: rebuild")
	}
	repoPath, err := utils.FindRepositoryRoot(".")
	if err != nil {
		return fmt.Errorf("not a Forester repository")
	}

	dbPath := filepath.Join(repoPath, ".DFM", "database.db")
	fmt.Println("Rebuilding database from storage...")

	// Create new database
	db, err := core.NewDatabase(dbPath)
	if err != nil {
		return fmt.Errorf("failed to create database: %w", err)
	}
	defer db.Close()

	storage, err := core.NewStorage(repoPath)
	if err != nil {
		return fmt.Errorf("failed to create storage: %w", err)
	}

	// Scan commits in storage
	commitsPath := storage.GetCommitsPath()
	commitsFound := 0
	commitsRebuilt := 0

	if utils.Exists(commitsPath) {
		files, err := utils.ListFiles(commitsPath, true)
		if err == nil {
			for _, filePath := range files {
				if utils.IsFile(filePath) {
					commitsFound++
					commitContent, err := utils.ReadFileString(filePath)
					if err == nil {
						var commit models.Commit
						if err := json.Unmarshal([]byte(commitContent), &commit); err == nil {
							// Check if commit exists in database
							_, err := db.GetCommit(commit.Hash)
							if err != nil {
								// Doesn't exist, add it
								if _, err := db.CreateCommit(&commit); err == nil {
									commitsRebuilt++
								}
							}
						}
					}
				}
			}
		}
	}

	// Scan trees
	treesPath := storage.GetTreesPath()
	treesFound := 0

	if utils.Exists(treesPath) {
		files, err := utils.ListFiles(treesPath, true)
		if err == nil {
			for _, filePath := range files {
				if utils.IsFile(filePath) {
					treesFound++
				}
			}
		}
	}

	// Scan blobs
	blobsPath := storage.GetBlobsPath()
	blobsFound := 0

	if utils.Exists(blobsPath) {
		files, err := utils.ListFiles(blobsPath, true)
		if err == nil {
			for _, filePath := range files {
				if utils.IsFile(filePath) {
					blobsFound++
					// Extract hash from path
					relPath, err := utils.GetRelativePath(blobsPath, filePath)
					if err == nil {
						// Path format: ab/cdef... -> hash is abcdef...
						parts := strings.Split(relPath, string(filepath.Separator))
						if len(parts) >= 2 {
							hash := parts[0] + parts[1]
							if len(hash) == 64 {
								_ = db.StoreBlob(hash, filePath) // Ignore errors if exists
							}
						}
					}
				}
			}
		}
	}

	fmt.Println("Rebuild complete!")
	fmt.Printf("  Commits found: %d (rebuilt: %d)\n", commitsFound, commitsRebuilt)
	fmt.Printf("  Trees found: %d\n", treesFound)
	fmt.Printf("  Blobs found: %d\n", blobsFound)

	return nil
}
