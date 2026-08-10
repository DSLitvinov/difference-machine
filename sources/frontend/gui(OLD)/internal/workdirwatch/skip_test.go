package workdirwatch

import "testing"

func TestShouldSkipRelPath(t *testing.T) {
	tests := []struct {
		rel  string
		skip bool
	}{
		{"", false},
		{"assets/scene.blend", false},
		{".DFM", true},
		{".DFM/refs/heads/main", true},
		{".dfmignore", true},
	}

	for _, tc := range tests {
		if got := shouldSkipRelPath(tc.rel); got != tc.skip {
			t.Fatalf("shouldSkipRelPath(%q) = %v, want %v", tc.rel, got, tc.skip)
		}
	}
}

func TestShouldSkipEvent(t *testing.T) {
	repo := "/repo"
	if !shouldSkipEvent(repo, "/repo/.DFM/index") {
		t.Fatal("expected .DFM path to be skipped")
	}
	if shouldSkipEvent(repo, "/repo/assets/file.txt") {
		t.Fatal("expected workdir file not to be skipped")
	}
}
