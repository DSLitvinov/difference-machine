package utils

import "testing"

func TestIsTmpReviewRelPath(t *testing.T) {
	tests := []struct {
		path string
		want bool
	}{
		{".DFM/tmp_review", true},
		{".DFM/tmp_review/scene.blend", true},
		{`.DFM\tmp_review\scene.blend`, true},
		{"./.DFM/tmp_review/", true},
		{".DFM/config", false},
		{"assets/scene.blend", false},
	}
	for _, tc := range tests {
		if got := IsTmpReviewRelPath(tc.path); got != tc.want {
			t.Fatalf("IsTmpReviewRelPath(%q) = %v, want %v", tc.path, got, tc.want)
		}
	}
}
