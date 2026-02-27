package commands

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/models"
	"github.com/difference-machine/forester/internal/utils"
)

// Review manages review system
func Review(args []string) error {
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

	if len(args) == 0 {
		fmt.Println("Usage: forester review <command> [options]")
		fmt.Println("Commands:")
		fmt.Println("  comment <asset_type> <asset_id> <message>  - Add comment")
		fmt.Println("  list <asset_type> <asset_id>               - List comments")
		fmt.Println("  approve <asset_type> <asset_id>             - Approve asset")
		fmt.Println("  reject <asset_type> <asset_id> [reason]     - Reject asset")
		fmt.Println("  resolve <comment_id>                       - Resolve comment")
		return nil
	}

	command := args[0]
	user := "Unknown"
	if envUser := os.Getenv("USER"); envUser != "" {
		user = envUser
	}

	if command == "comment" {
		if len(args) < 4 {
			return fmt.Errorf("usage: review comment <asset_type> <asset_id> <message>")
		}
		if len(args) != 4 && len(args) != 6 {
			return fmt.Errorf("usage: review comment <asset_type> <asset_id> <message> [x y]")
		}

		x, y := 0.0, 0.0
		if len(args) >= 6 {
			var err1, err2 error
			x, err1 = strconv.ParseFloat(args[4], 64)
			y, err2 = strconv.ParseFloat(args[5], 64)
			if err1 != nil || err2 != nil {
				return fmt.Errorf("invalid coordinates")
			}
		}

		comment := models.NewComment(args[1], args[2], user, args[3], x, y)
		commentID, err := db.CreateComment(comment)
		if err != nil {
			return fmt.Errorf("failed to create comment: %w", err)
		}

		fmt.Printf("Created comment #%d\n", commentID)
		return nil
	}

	if command == "list" {
		if len(args) < 3 {
			return fmt.Errorf("usage: review list <asset_type> <asset_id>")
		}
		if len(args) != 3 {
			return fmt.Errorf("usage: review list <asset_type> <asset_id>")
		}

		comments, err := db.GetComments(args[1], args[2])
		if err != nil {
			return fmt.Errorf("failed to get comments: %w", err)
		}

		if len(comments) == 0 {
			fmt.Println("No comments found")
			return nil
		}

		fmt.Println("Comments:")
		for _, comment := range comments {
			t := time.Unix(comment.CreatedAt, 0)
			fmt.Printf("  #%d by %s (%s)\n", comment.ID, comment.Author, t.Format("2006-01-02 15:04:05"))
			fmt.Printf("    %s\n", comment.Content)
			if comment.X != 0.0 || comment.Y != 0.0 {
				fmt.Printf("    Position: (%.2f, %.2f)\n", comment.X, comment.Y)
			}
			if comment.Resolved {
				fmt.Println("    [RESOLVED]")
			}
			fmt.Println()
		}
		return nil
	}

	if command == "approve" {
		if len(args) < 3 {
			return fmt.Errorf("usage: review approve <asset_type> <asset_id>")
		}
		if len(args) != 3 {
			return fmt.Errorf("usage: review approve <asset_type> <asset_id>")
		}

		approval := models.NewApproval(args[1], args[2], user, models.ApprovalStatusApproved, "")
		if err := db.CreateApproval(approval); err != nil {
			return fmt.Errorf("failed to create approval: %w", err)
		}

		fmt.Printf("Approved %s %s\n", args[1], args[2])
		return nil
	}

	if command == "reject" {
		if len(args) < 3 {
			return fmt.Errorf("usage: review reject <asset_type> <asset_id> [reason]")
		}
		if len(args) > 4 {
			return fmt.Errorf("usage: review reject <asset_type> <asset_id> [reason]")
		}

		reason := ""
		if len(args) >= 4 {
			reason = args[3]
		}

		approval := models.NewApproval(args[1], args[2], user, models.ApprovalStatusRejected, reason)
		if err := db.CreateApproval(approval); err != nil {
			return fmt.Errorf("failed to create approval: %w", err)
		}

		fmt.Printf("Rejected %s %s\n", args[1], args[2])
		return nil
	}

	if command == "resolve" {
		if len(args) < 2 {
			return fmt.Errorf("usage: review resolve <comment_id>")
		}
		if len(args) != 2 {
			return fmt.Errorf("usage: review resolve <comment_id>")
		}

		commentID, err := strconv.Atoi(args[1])
		if err != nil {
			return fmt.Errorf("invalid comment ID: %w", err)
		}

		if err := db.ResolveComment(commentID); err != nil {
			return fmt.Errorf("failed to resolve comment: %w", err)
		}

		fmt.Printf("Resolved comment #%d\n", commentID)
		return nil
	}

	return fmt.Errorf("unknown review command: %s", command)
}
