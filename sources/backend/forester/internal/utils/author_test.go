package utils

import "testing"

func TestFormatAuthor(t *testing.T) {
	tests := []struct {
		name  string
		email string
		want  string
	}{
		{"Alice", "alice@example.com", "Alice <alice@example.com>"},
		{"Alice", "", "Alice"},
		{"", "alice@example.com", "<alice@example.com>"},
		{"", "", "Unknown"},
		{"Bob <bob@test.com>", "", "Bob <bob@test.com>"},
	}
	for _, tc := range tests {
		if got := FormatAuthor(tc.name, tc.email); got != tc.want {
			t.Fatalf("FormatAuthor(%q, %q) = %q, want %q", tc.name, tc.email, got, tc.want)
		}
	}
}

func TestParseAuthor(t *testing.T) {
	name, email := ParseAuthor("Alice <alice@example.com>")
	if name != "Alice" || email != "alice@example.com" {
		t.Fatalf("ParseAuthor git format = (%q, %q)", name, email)
	}
	name, email = ParseAuthor("Plain Name")
	if name != "Plain Name" || email != "" {
		t.Fatalf("ParseAuthor plain name = (%q, %q)", name, email)
	}
}
