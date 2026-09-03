package core

import (
	"os"
	"path/filepath"
	"strings"

	"github.com/difference-machine/forester/internal/utils"
)

// AuthorForRepo resolves the commit author Git-style ("Name <email>").
// Repo .DFM/config [user] overrides ~/.dfm/setup.cfg; FORESTER_AUTHOR overrides all.
func AuthorForRepo(repoPath string) string {
	if author := strings.TrimSpace(os.Getenv("FORESTER_AUTHOR")); author != "" {
		return author
	}

	if repoPath != "" {
		name, email := utils.LoadUserIdentity(filepath.Join(repoPath, ".DFM", "config"))
		if name != "" || email != "" {
			return utils.FormatAuthor(name, email)
		}
	}

	name, email := utils.LoadUserIdentity(utils.GlobalSetupConfigPath())
	if formatted := utils.FormatAuthor(name, email); formatted != "Unknown" {
		return formatted
	}

	if user := strings.TrimSpace(os.Getenv("USER")); user != "" {
		return user
	}
	return "Unknown"
}

// DefaultAuthor returns the author for the current repository context.
// Prefer AuthorForRepo when the repository path is known.
func DefaultAuthor() string {
	repoPath, err := utils.FindRepositoryRoot(".")
	if err != nil {
		return AuthorForRepo("")
	}
	return AuthorForRepo(repoPath)
}
