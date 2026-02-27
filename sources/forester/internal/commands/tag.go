package commands

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/models"
	"github.com/difference-machine/forester/internal/utils"
)

// Tag manages tags
func Tag(args []string) error {
	repoPath, err := utils.FindRepositoryRoot(".")
	if err != nil {
		return fmt.Errorf("not a Forester repository")
	}

	dbPath := filepath.Join(repoPath, ".DFM", "database.db")
	db, err := core.NewDatabase(dbPath)
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}
	defer db.Close()

	refs := core.NewRefs(repoPath)

	if len(args) == 0 {
		// List tags
		tags, err := db.ListTags()
		if err != nil {
			return fmt.Errorf("failed to list tags: %w", err)
		}

		for _, tag := range tags {
			fmt.Println(tag.Name)
		}
		return nil
	}

	// First, check if it's a delete command
	if args[0] == "-d" || args[0] == "--delete" {
		if len(args) < 2 {
			return fmt.Errorf("tag name required")
		}
		if len(args) > 2 {
			return fmt.Errorf("unexpected arguments after tag name")
		}
		tagName := args[1]
		if !utils.IsValidTagName(tagName) {
			return fmt.Errorf("invalid tag name: %s", tagName)
		}
		if err := db.DeleteTag(tagName); err != nil {
			return fmt.Errorf("failed to delete tag: %w", err)
		}
		if err := refs.DeleteTag(tagName); err != nil {
			return fmt.Errorf("failed to delete tag ref: %w", err)
		}
		fmt.Printf("Deleted tag %s\n", tagName)
		return nil
	}

	// Parse flags for create
	annotated := false
	message := ""
	var tagName string
	var tagArgs []string
	messageSet := false

	// Parse flags for create
	for i := 0; i < len(args); i++ {
		arg := args[i]
		if arg == "-a" || arg == "--annotate" {
			annotated = true
		} else if arg == "-m" && i+1 < len(args) {
			if messageSet {
				return fmt.Errorf("multiple -m messages provided")
			}
			message = args[i+1]
			messageSet = true
			i++
		} else if strings.HasPrefix(arg, "-m=") {
			if messageSet {
				return fmt.Errorf("multiple -m messages provided")
			}
			message = strings.TrimPrefix(arg, "-m=")
			messageSet = true
		} else if !strings.HasPrefix(arg, "-") {
			tagArgs = append(tagArgs, arg)
		} else {
			return fmt.Errorf("unknown flag: %s", arg)
		}
	}

	// Create tag
	if len(tagArgs) == 0 {
		return fmt.Errorf("tag name required")
	}
	if len(tagArgs) > 1 {
		return fmt.Errorf("unexpected arguments after tag name")
	}
	tagName = tagArgs[0]
	if !utils.IsValidTagName(tagName) {
		return fmt.Errorf("invalid tag name")
	}

	// Get current HEAD
	currentBranch, err := refs.GetCurrentBranch()
	if err != nil || currentBranch == "" {
		currentBranch = "main"
	}

	commitHash, err := db.GetBranchHead(currentBranch)
	if err != nil {
		return fmt.Errorf("failed to get branch head: %w", err)
	}
	if commitHash == "" {
		commitHash, err = refs.GetHead(currentBranch)
		if err != nil {
			return fmt.Errorf("failed to get HEAD: %w", err)
		}
	}

	if commitHash == "" {
		return fmt.Errorf("no commits yet")
	}

	// Get author
	author := "Unknown"
	if envAuthor := os.Getenv("FORESTER_AUTHOR"); envAuthor != "" {
		author = envAuthor
	}

	// Annotated tags require a message
	if annotated && message == "" {
		return fmt.Errorf("annotated tag requires a message (-m)")
	}
	if message != "" && !annotated {
		return fmt.Errorf("message requires annotated tag (-a)")
	}

	// Create tag
	tag := models.NewTag(tagName, commitHash, author, message)
	if err := db.CreateTag(tag); err != nil {
		return fmt.Errorf("failed to create tag: %w", err)
	}
	if err := refs.CreateTag(tagName, commitHash); err != nil {
		return fmt.Errorf("failed to create tag ref: %w", err)
	}

	fmt.Printf("Created tag %s\n", tagName)
	return nil
}
