package utils

import "testing"

func TestIsDfmignoreRelPath(t *testing.T) {
	tests := []struct {
		path string
		want bool
	}{
		{".dfmignore", true},
		{"./.dfmignore", true},
		{".dfmignore/", true},
		{"subdir/.dfmignore", false},
		{"readme.txt", false},
	}
	for _, tc := range tests {
		if got := IsDfmignoreRelPath(tc.path); got != tc.want {
			t.Errorf("IsDfmignoreRelPath(%q) = %v, want %v", tc.path, got, tc.want)
		}
	}
}

func TestFilterDfmignorePaths(t *testing.T) {
	in := []string{"a.txt", ".dfmignore", "b.txt"}
	got := FilterDfmignorePaths(in)
	if len(got) != 2 || got[0] != "a.txt" || got[1] != "b.txt" {
		t.Fatalf("FilterDfmignorePaths = %v, want [a.txt b.txt]", got)
	}
}
