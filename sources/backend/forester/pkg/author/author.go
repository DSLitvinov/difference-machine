package author

import (
	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/utils"
)

// FormatAuthor returns a Git-style author string: "Name <email@example.com>".
func FormatAuthor(name, email string) string {
	return utils.FormatAuthor(name, email)
}

// ParseAuthor splits a Git-style author string into name and email.
func ParseAuthor(formatted string) (name, email string) {
	return utils.ParseAuthor(formatted)
}

// AuthorForRepo resolves the commit author for a repository path.
func AuthorForRepo(repoPath string) string {
	return core.AuthorForRepo(repoPath)
}
