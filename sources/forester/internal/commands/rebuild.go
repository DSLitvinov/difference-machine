package commands

import (
	"fmt"

	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/utils"
)

// Rebuild scans the object store and reports repository statistics.
func Rebuild(args []string) error {
	if len(args) > 0 {
		return fmt.Errorf("usage: rebuild")
	}
	repoPath, err := utils.FindRepositoryRoot(".")
	if err != nil {
		return fmt.Errorf("not a Forester repository")
	}

	fmt.Println("Scanning object store...")

	repo, err := core.OpenRepository(repoPath)
	if err != nil {
		return fmt.Errorf("failed to open repository: %w", err)
	}
	defer repo.Close()

	storage := repo.Storage

	commitsFound := 0
	treesFound := 0
	blobsFound := 0
	tagsFound := 0

	err = storage.ListObjects(func(_ string, objectType string) error {
		switch objectType {
		case core.ObjectTypeCommit:
			commitsFound++
		case core.ObjectTypeTree:
			treesFound++
		case core.ObjectTypeBlob:
			blobsFound++
		case core.ObjectTypeTag:
			tagsFound++
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("failed to scan objects: %w", err)
	}

	branches, _ := repo.ListBranches()
	tagList, _ := repo.ListTags()

	// Ensure product database schema exists
	if _, err := repo.DB(); err != nil {
		return fmt.Errorf("failed to open product database: %w", err)
	}

	fmt.Println("Rebuild complete!")
	fmt.Printf("  Commits: %d\n", commitsFound)
	fmt.Printf("  Trees: %d\n", treesFound)
	fmt.Printf("  Blobs: %d\n", blobsFound)
	fmt.Printf("  Tag objects: %d\n", tagsFound)
	fmt.Printf("  Branches: %d\n", len(branches))
	fmt.Printf("  Tags: %d\n", len(tagList))

	return nil
}
