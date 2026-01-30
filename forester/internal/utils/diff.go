package utils

import (
	"fmt"
	"strings"
)

// DiffLineType represents the type of diff line
type DiffLineType int

const (
	DiffLineUnchanged DiffLineType = iota
	DiffLineAdded
	DiffLineRemoved
)

// DiffLine represents a line in a diff
type DiffLine struct {
	Type          DiffLineType
	Content       string
	OldLineNumber int
	NewLineNumber int
}

// SplitLines splits content into lines
func SplitLines(content string) []string {
	var lines []string
	var currentLine strings.Builder

	for _, char := range content {
		if char == '\n' {
			lines = append(lines, currentLine.String())
			currentLine.Reset()
		} else if char == '\r' {
			// Handle \r\n or \r
			lines = append(lines, currentLine.String())
			currentLine.Reset()
		} else {
			currentLine.WriteRune(char)
		}
	}

	// Last line (if no trailing newline)
	if currentLine.Len() > 0 || (len(content) > 0 && content[len(content)-1] != '\n') {
		lines = append(lines, currentLine.String())
	}

	return lines
}

// IsTextFile checks if content appears to be a text file
func IsTextFile(content []byte) bool {
	if len(content) == 0 {
		return true
	}

	// Simple heuristic: check for non-printable characters
	// If more than 30% are non-printable (excluding spaces, tabs, \n, \r),
	// it's probably a binary file
	nonPrintable := 0
	sampleSize := len(content)
	if sampleSize > 1000 {
		sampleSize = 1000
	}

	for i := 0; i < sampleSize; i++ {
		c := content[i]

		// Non-printable characters (excluding spaces, tabs, newlines)
		if c < 32 && c != '\t' && c != '\n' && c != '\r' {
			nonPrintable++
		} else if c == 127 { // DEL
			nonPrintable++
		}
	}

	// If more than 30% are non-printable, it's binary
	return (nonPrintable*100)/sampleSize < 30
}

// ComputeLCS computes Longest Common Subsequence using dynamic programming
func ComputeLCS(lines1, lines2 []string) [][]int {
	m := len(lines1)
	n := len(lines2)

	dp := make([][]int, m+1)
	for i := range dp {
		dp[i] = make([]int, n+1)
	}

	for i := 1; i <= m; i++ {
		for j := 1; j <= n; j++ {
			if lines1[i-1] == lines2[j-1] {
				dp[i][j] = dp[i-1][j-1] + 1
			} else {
				if dp[i-1][j] > dp[i][j-1] {
					dp[i][j] = dp[i-1][j]
				} else {
					dp[i][j] = dp[i][j-1]
				}
			}
		}
	}

	return dp
}

// BuildDiffFromLCS builds diff lines from LCS matrix
func BuildDiffFromLCS(lines1, lines2 []string, dp [][]int) []DiffLine {
	var diffLines []DiffLine
	i := len(lines1)
	j := len(lines2)
	oldLine := i
	newLine := j

	for i > 0 || j > 0 {
		if i > 0 && j > 0 && lines1[i-1] == lines2[j-1] {
			// Line unchanged
			diffLines = append([]DiffLine{{
				Type:          DiffLineUnchanged,
				Content:       lines1[i-1],
				OldLineNumber: i - 1,
				NewLineNumber: j - 1,
			}}, diffLines...)
			i--
			j--
			oldLine--
			newLine--
		} else if j > 0 && (i == 0 || dp[i][j-1] >= dp[i-1][j]) {
			// Line added
			diffLines = append([]DiffLine{{
				Type:          DiffLineAdded,
				Content:       lines2[j-1],
				OldLineNumber: -1,
				NewLineNumber: j - 1,
			}}, diffLines...)
			j--
			newLine--
		} else if i > 0 {
			// Line removed
			diffLines = append([]DiffLine{{
				Type:          DiffLineRemoved,
				Content:       lines1[i-1],
				OldLineNumber: i - 1,
				NewLineNumber: -1,
			}}, diffLines...)
			i--
			oldLine--
		}
	}

	return diffLines
}

// ComputeDiff computes diff between two text contents
func ComputeDiff(content1, content2 string) []DiffLine {
	lines1 := SplitLines(content1)
	lines2 := SplitLines(content2)

	dp := ComputeLCS(lines1, lines2)
	return BuildDiffFromLCS(lines1, lines2, dp)
}

// FormatUnifiedDiff formats diff as unified diff format
func FormatUnifiedDiff(file1, file2 string, diffLines []DiffLine) string {
	var result strings.Builder

	result.WriteString(fmt.Sprintf("--- %s\n", file1))
	result.WriteString(fmt.Sprintf("+++ %s\n", file2))

	oldStart := -1
	newStart := -1
	oldCount := 0
	newCount := 0

	for _, line := range diffLines {
		if line.Type == DiffLineUnchanged {
			if oldStart >= 0 {
				// Output previous hunk
				result.WriteString(fmt.Sprintf("@@ -%d,%d +%d,%d @@\n", oldStart+1, oldCount, newStart+1, newCount))
				oldStart = -1
				newStart = -1
				oldCount = 0
				newCount = 0
			}
		} else {
			if oldStart < 0 {
				// Start new hunk
				if line.OldLineNumber >= 0 {
					oldStart = line.OldLineNumber
				}
				if line.NewLineNumber >= 0 {
					newStart = line.NewLineNumber
				}
			}

			if line.Type == DiffLineRemoved {
				result.WriteString(fmt.Sprintf("-%s\n", line.Content))
				oldCount++
			} else if line.Type == DiffLineAdded {
				result.WriteString(fmt.Sprintf("+%s\n", line.Content))
				newCount++
			}
		}
	}

	if oldStart >= 0 {
		result.WriteString(fmt.Sprintf("@@ -%d,%d +%d,%d @@\n", oldStart+1, oldCount, newStart+1, newCount))
	}

	return result.String()
}

// FormatUnifiedDiffColored formats diff as unified diff format with colors
func FormatUnifiedDiffColored(file1, file2 string, diffLines []DiffLine) string {
	var result strings.Builder

	result.WriteString(Cyan(fmt.Sprintf("--- %s\n", file1)))
	result.WriteString(Cyan(fmt.Sprintf("+++ %s\n", file2)))

	oldStart := -1
	newStart := -1
	oldCount := 0
	newCount := 0
	var hunkLines []string

	for i, line := range diffLines {
		if line.Type == DiffLineUnchanged {
			if oldStart >= 0 {
				// Output hunk header and lines
				result.WriteString(Blue(fmt.Sprintf("@@ -%d,%d +%d,%d @@\n", oldStart+1, oldCount, newStart+1, newCount)))
				for _, hunkLine := range hunkLines {
					result.WriteString(hunkLine)
				}
				// Reset
				oldStart = -1
				newStart = -1
				oldCount = 0
				newCount = 0
				hunkLines = nil
			}
		} else {
			if oldStart < 0 {
				// Start new hunk
				if line.OldLineNumber >= 0 {
					oldStart = line.OldLineNumber
				}
				if line.NewLineNumber >= 0 {
					newStart = line.NewLineNumber
				}
			}

			var coloredLine string
			if line.Type == DiffLineRemoved {
				coloredLine = Red(fmt.Sprintf("-%s\n", line.Content))
				oldCount++
			} else if line.Type == DiffLineAdded {
				coloredLine = Green(fmt.Sprintf("+%s\n", line.Content))
				newCount++
			}
			hunkLines = append(hunkLines, coloredLine)
		}

		// Output final hunk if we're at the end
		if i == len(diffLines)-1 && oldStart >= 0 {
			result.WriteString(Blue(fmt.Sprintf("@@ -%d,%d +%d,%d @@\n", oldStart+1, oldCount, newStart+1, newCount)))
			for _, hunkLine := range hunkLines {
				result.WriteString(hunkLine)
			}
		}
	}

	return result.String()
}
