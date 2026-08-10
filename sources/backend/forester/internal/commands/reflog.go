package commands

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/utils"
)

// Reflog shows reference log history
func Reflog(args []string) error {
	repoPath, err := utils.FindRepositoryRoot(".")
	if err != nil {
		return fmt.Errorf("not a Forester repository")
	}

	repo, err := core.OpenRepository(repoPath)
	if err != nil {
		return fmt.Errorf("failed to open repository: %w", err)
	}
	defer repo.Close()

	// Determine ref_name (if specified)
	refName := ""
	limit := 100

	for i := 0; i < len(args); i++ {
		if args[i] == "--limit" || args[i] == "-n" {
			if i+1 < len(args) {
				parsedLimit, err := strconv.Atoi(args[i+1])
				if err != nil {
					return fmt.Errorf("invalid limit: %w", err)
				}
				limit = parsedLimit
				i++
			} else {
				return fmt.Errorf("flag %s requires a value", args[i])
			}
		} else if strings.HasPrefix(args[i], "-") {
			return fmt.Errorf("unknown flag: %s", args[i])
		} else if refName == "" {
			refName = args[i]
		} else {
			return fmt.Errorf("unexpected argument: %s", args[i])
		}
	}

	entries, err := repo.Reflog.GetEntries(refName, limit)
	if err != nil {
		return fmt.Errorf("failed to get reflog: %w", err)
	}

	if len(entries) == 0 {
		fmt.Println("No reflog entries found")
		return nil
	}

	for _, entry := range entries {
		t := time.Unix(entry.Timestamp, 0)
		dateStr := t.Format("2006-01-02 15:04:05")

		hashShort := entry.CommitHash
		if len(hashShort) > 8 {
			hashShort = hashShort[:8]
		}

		fmt.Printf("%s %-20s %-10s ", hashShort, entry.RefName, entry.Operation)

		if entry.OldValue != "" {
			oldShort := entry.OldValue
			if len(oldShort) > 8 {
				oldShort = oldShort[:8]
			}
			fmt.Printf("%s -> ", oldShort)
		}

		if entry.NewValue != "" {
			newShort := entry.NewValue
			if len(newShort) > 8 {
				newShort = newShort[:8]
			}
			fmt.Printf("%s ", newShort)
		} else if entry.Operation == "delete" {
			fmt.Print("(deleted) ")
		}

		fmt.Println(dateStr)
	}

	return nil
}
