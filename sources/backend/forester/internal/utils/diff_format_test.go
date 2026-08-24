package utils

import (
	"strings"
	"testing"
)

func TestFormatUnifiedDiffHeaderBeforeLines(t *testing.T) {
	diffLines := []DiffLine{
		{Type: DiffLineRemoved, Content: "line one", OldLineNumber: 10, NewLineNumber: -1},
		{Type: DiffLineRemoved, Content: "line two", OldLineNumber: 11, NewLineNumber: -1},
	}

	out := FormatUnifiedDiff("old.txt", "/dev/null", diffLines)
	lines := strings.Split(strings.TrimSuffix(out, "\n"), "\n")

	if len(lines) < 5 {
		t.Fatalf("expected at least 5 lines, got %d:\n%s", len(lines), out)
	}
	if !strings.HasPrefix(lines[2], "@@ -11,2 +0,0 @@") {
		t.Fatalf("hunk header should precede body, got line[2]=%q", lines[2])
	}
	if lines[3] != "-line one" {
		t.Fatalf("first hunk line = %q, want %q", lines[3], "-line one")
	}
	if lines[4] != "-line two" {
		t.Fatalf("second hunk line = %q, want %q", lines[4], "-line two")
	}
}

func TestFormatUnifiedDiffIncludesContext(t *testing.T) {
	diffLines := []DiffLine{
		{Type: DiffLineUnchanged, Content: "before", OldLineNumber: 8, NewLineNumber: 8},
		{Type: DiffLineUnchanged, Content: "ctx", OldLineNumber: 9, NewLineNumber: 9},
		{Type: DiffLineRemoved, Content: "old line", OldLineNumber: 10, NewLineNumber: -1},
		{Type: DiffLineAdded, Content: "new line", OldLineNumber: -1, NewLineNumber: 10},
		{Type: DiffLineUnchanged, Content: "after", OldLineNumber: 11, NewLineNumber: 11},
	}

	out := FormatUnifiedDiff("f.txt", "f.txt", diffLines)
	if !strings.Contains(out, " before\n") {
		t.Fatalf("expected context line before change:\n%s", out)
	}
	if !strings.Contains(out, "-old line\n") {
		t.Fatalf("expected removed line:\n%s", out)
	}
	if !strings.Contains(out, "+new line\n") {
		t.Fatalf("expected added line:\n%s", out)
	}
	if !strings.Contains(out, " after\n") {
		t.Fatalf("expected context line after change:\n%s", out)
	}
}

func TestFormatUnifiedDiffMultipleHunks(t *testing.T) {
	diffLines := []DiffLine{
		{Type: DiffLineRemoved, Content: "a", OldLineNumber: 0, NewLineNumber: -1},
		{Type: DiffLineUnchanged, Content: "gap1", OldLineNumber: 1, NewLineNumber: 0},
		{Type: DiffLineUnchanged, Content: "gap2", OldLineNumber: 2, NewLineNumber: 1},
		{Type: DiffLineUnchanged, Content: "gap3", OldLineNumber: 3, NewLineNumber: 2},
		{Type: DiffLineUnchanged, Content: "gap4", OldLineNumber: 4, NewLineNumber: 3},
		{Type: DiffLineUnchanged, Content: "gap5", OldLineNumber: 5, NewLineNumber: 4},
		{Type: DiffLineUnchanged, Content: "gap6", OldLineNumber: 6, NewLineNumber: 5},
		{Type: DiffLineUnchanged, Content: "gap7", OldLineNumber: 7, NewLineNumber: 6},
		{Type: DiffLineRemoved, Content: "b", OldLineNumber: 8, NewLineNumber: -1},
	}

	out := FormatUnifiedDiff("f.txt", "/dev/null", diffLines)
	if !strings.Contains(out, "-a\n") {
		t.Fatalf("first hunk missing removed line:\n%s", out)
	}
	if !strings.Contains(out, "-b\n") {
		t.Fatalf("second hunk missing removed line:\n%s", out)
	}
	if strings.Count(out, "@@ ") < 2 {
		t.Fatalf("expected two hunks:\n%s", out)
	}
}

func TestCountLineDeltaMatchesComputeDiff(t *testing.T) {
	old := "a\nb\nc\n"
	new := "a\nB\nc\nD\n"
	add, del := CountLineDelta(old, new)
	var wantAdd, wantDel int
	for _, line := range ComputeDiff(old, new) {
		if line.Type == DiffLineAdded {
			wantAdd++
		} else if line.Type == DiffLineRemoved {
			wantDel++
		}
	}
	if add != wantAdd || del != wantDel {
		t.Fatalf("CountLineDelta = +%d -%d, want +%d -%d", add, del, wantAdd, wantDel)
	}
}
