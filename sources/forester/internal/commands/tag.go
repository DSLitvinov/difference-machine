package commands

import (
	"fmt"
	"os"
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

	repo, err := core.OpenRepository(repoPath)
	if err != nil {
		return fmt.Errorf("failed to open repository: %w", err)
	}
	defer repo.Close()

	if len(args) == 0 {
		tags, err := repo.ListTags()
		if err != nil {
			return fmt.Errorf("failed to list tags: %w", err)
		}

		for _, tag := range tags {
			fmt.Println(tag.Name)
		}
		return nil
	}

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
		if err := repo.DeleteTag(tagName); err != nil {
			return fmt.Errorf("failed to delete tag: %w", err)
		}
		fmt.Printf("Deleted tag %s\n", tagName)
		return nil
	}

	annotated := false
	message := ""
	var tagName string
	var tagArgs []string
	messageSet := false

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

	currentBranch, err := repo.Refs.GetCurrentBranch()
	if err != nil || currentBranch == "" {
		currentBranch = "main"
	}

	commitHash, err := repo.GetBranchHead(currentBranch)
	if err != nil {
		return fmt.Errorf("failed to get branch head: %w", err)
	}
	if commitHash == "" {
		return fmt.Errorf("no commits yet")
	}

	author := "Unknown"
	if envAuthor := os.Getenv("FORESTER_AUTHOR"); envAuthor != "" {
		author = envAuthor
	}

	if annotated && message == "" {
		return fmt.Errorf("annotated tag requires a message (-m)")
	}
	if message != "" && !annotated {
		return fmt.Errorf("message requires annotated tag (-a)")
	}

	tag := models.NewTag(tagName, commitHash, author, message)
	if err := repo.CreateTag(tag, annotated); err != nil {
		return fmt.Errorf("failed to create tag: %w", err)
	}

	fmt.Printf("Created tag %s\n", tagName)
	return nil
}
