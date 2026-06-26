package utils

import (
	"fmt"
	"strings"
)

// FormatAuthor returns a Git-style author string: "Name <email@example.com>".
func FormatAuthor(name, email string) string {
	name = strings.TrimSpace(name)
	email = strings.TrimSpace(email)

	if name != "" && looksLikeGitAuthor(name) && email == "" {
		return name
	}
	if name == "" && email == "" {
		return "Unknown"
	}
	if email != "" {
		if name != "" {
			return fmt.Sprintf("%s <%s>", name, email)
		}
		return fmt.Sprintf("<%s>", email)
	}
	return name
}

// ParseAuthor splits a Git-style author string into name and email.
func ParseAuthor(formatted string) (name, email string) {
	formatted = strings.TrimSpace(formatted)
	if formatted == "" {
		return "", ""
	}

	lt := strings.LastIndex(formatted, "<")
	gt := strings.LastIndex(formatted, ">")
	if lt >= 0 && gt > lt {
		name = strings.TrimSpace(formatted[:lt])
		email = strings.TrimSpace(formatted[lt+1 : gt])
		return name, email
	}
	return formatted, ""
}

func looksLikeGitAuthor(value string) bool {
	value = strings.TrimSpace(value)
	lt := strings.LastIndex(value, "<")
	gt := strings.LastIndex(value, ">")
	return lt >= 0 && gt > lt
}
