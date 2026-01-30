package utils

import (
	"bufio"
	"os"
	"path/filepath"
	"strings"
)

// Patterns manages ignore patterns (like .gitignore)
type Patterns struct {
	patterns []string
}

// NewPatterns creates a new Patterns instance
func NewPatterns() *Patterns {
	return &Patterns{
		patterns: []string{},
	}
}

// LoadFromFile loads patterns from a file
func (p *Patterns) LoadFromFile(filePath string) error {
	file, err := os.Open(filePath)
	if err != nil {
		return err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		// Skip empty lines and comments
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		p.patterns = append(p.patterns, line)
	}

	return scanner.Err()
}

// Matches checks if a path matches any pattern
func (p *Patterns) Matches(path string) bool {
	// Normalize path separators
	path = filepath.ToSlash(path)

	for _, pattern := range p.patterns {
		if p.matchPattern(pattern, path) {
			return true
		}
	}

	return false
}

// matchPattern checks if a path matches a single pattern
func (p *Patterns) matchPattern(pattern, path string) bool {
	// Simple pattern matching (can be enhanced with glob support)
	pattern = filepath.ToSlash(pattern)

	// Exact match
	if pattern == path {
		return true
	}

	// Directory match (ends with /)
	if strings.HasSuffix(pattern, "/") {
		pattern = strings.TrimSuffix(pattern, "/")
		if strings.HasPrefix(path, pattern+"/") || path == pattern {
			return true
		}
	}

	// Prefix match
	if strings.HasPrefix(pattern, "/") {
		// Absolute pattern
		if strings.HasPrefix(path, pattern) {
			return true
		}
	} else {
		// Relative pattern - check if any part of path matches
		parts := strings.Split(path, "/")
		for _, part := range parts {
			if part == pattern {
				return true
			}
		}
	}

	// Wildcard matching (simple * support)
	if strings.Contains(pattern, "*") {
		// Use filepath.Match for glob patterns
		matched, err := filepath.Match(pattern, path)
		if err == nil && matched {
			return true
		}
		// Also check if pattern matches any part of the path
		parts := strings.Split(path, "/")
		for _, part := range parts {
			matched, err := filepath.Match(pattern, part)
			if err == nil && matched {
				return true
			}
		}
	}

	return false
}

