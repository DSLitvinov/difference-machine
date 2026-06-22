package core

import "os"

// DefaultAuthor returns the commit/lock author from environment variables.
// FORESTER_AUTHOR takes precedence; USER is the fallback.
func DefaultAuthor() string {
	if author := os.Getenv("FORESTER_AUTHOR"); author != "" {
		return author
	}
	if user := os.Getenv("USER"); user != "" {
		return user
	}
	return "Unknown"
}
