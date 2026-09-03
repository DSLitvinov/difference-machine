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

const maxStatDiffLines = 2000

// CountLineDelta returns added/removed line counts without building a full diff.
// Large files skip the O(n*m) LCS and contribute 0/0 (files_changed is counted elsewhere).
func CountLineDelta(content1, content2 string) (insertions, deletions int) {
	lines1 := SplitLines(content1)
	lines2 := SplitLines(content2)
	if len(lines1) > maxStatDiffLines || len(lines2) > maxStatDiffLines {
		return 0, 0
	}
	dp := ComputeLCS(lines1, lines2)
	i := len(lines1)
	j := len(lines2)
	for i > 0 || j > 0 {
		if i > 0 && j > 0 && lines1[i-1] == lines2[j-1] {
			i--
			j--
			continue
		}
		if j > 0 && (i == 0 || dp[i][j-1] >= dp[i-1][j]) {
			insertions++
			j--
			continue
		}
		deletions++
		i--
	}
	return insertions, deletions
}

const unifiedContextLines = 3

func buildHunkRanges(diffLines []DiffLine, context int) [][2]int {
	n := len(diffLines)
	if n == 0 {
		return nil
	}

	inHunk := make([]bool, n)
	for i, line := range diffLines {
		if line.Type == DiffLineUnchanged {
			continue
		}
		start := i - context
		if start < 0 {
			start = 0
		}
		end := i + context
		if end >= n {
			end = n - 1
		}
		for j := start; j <= end; j++ {
			inHunk[j] = true
		}
	}

	var ranges [][2]int
	i := 0
	for i < n {
		if !inHunk[i] {
			i++
			continue
		}
		start := i
		for i < n && inHunk[i] {
			i++
		}
		ranges = append(ranges, [2]int{start, i - 1})
	}
	return ranges
}

func emitUnifiedHunk(result *strings.Builder, hunkLines []DiffLine) {
	if len(hunkLines) == 0 {
		return
	}

	oldStart := -1
	newStart := -1
	oldCount := 0
	newCount := 0

	for _, line := range hunkLines {
		switch line.Type {
		case DiffLineUnchanged:
			if oldStart < 0 && line.OldLineNumber >= 0 {
				oldStart = line.OldLineNumber
			}
			if newStart < 0 && line.NewLineNumber >= 0 {
				newStart = line.NewLineNumber
			}
			oldCount++
			newCount++
		case DiffLineRemoved:
			if oldStart < 0 && line.OldLineNumber >= 0 {
				oldStart = line.OldLineNumber
			}
			oldCount++
		case DiffLineAdded:
			if newStart < 0 && line.NewLineNumber >= 0 {
				newStart = line.NewLineNumber
			}
			newCount++
		}
	}

	if oldStart < 0 {
		oldStart = 0
	}
	if newStart < 0 {
		newStart = 0
	}

	oldHeaderStart := oldStart + 1
	newHeaderStart := newStart + 1
	if oldCount == 0 {
		oldHeaderStart = 0
	}
	if newCount == 0 {
		newHeaderStart = 0
	}

	result.WriteString(fmt.Sprintf("@@ -%d,%d +%d,%d @@\n", oldHeaderStart, oldCount, newHeaderStart, newCount))
	for _, line := range hunkLines {
		switch line.Type {
		case DiffLineUnchanged:
			result.WriteString(fmt.Sprintf(" %s\n", line.Content))
		case DiffLineRemoved:
			result.WriteString(fmt.Sprintf("-%s\n", line.Content))
		case DiffLineAdded:
			result.WriteString(fmt.Sprintf("+%s\n", line.Content))
		}
	}
}

// FormatUnifiedDiff formats diff as unified diff format
func FormatUnifiedDiff(file1, file2 string, diffLines []DiffLine) string {
	var result strings.Builder

	result.WriteString(fmt.Sprintf("--- %s\n", file1))
	result.WriteString(fmt.Sprintf("+++ %s\n", file2))

	for _, span := range buildHunkRanges(diffLines, unifiedContextLines) {
		emitUnifiedHunk(&result, diffLines[span[0]:span[1]+1])
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
