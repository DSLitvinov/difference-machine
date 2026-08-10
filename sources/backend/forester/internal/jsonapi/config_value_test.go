package jsonapi

import "testing"

func TestSanitizeConfigValue(t *testing.T) {
	got := sanitizeConfigValue(`"""""""""""C:\Program Files\Difference Machine\bin\forester.exe"""""""""""`)
	want := `C:\Program Files\Difference Machine\bin\forester.exe`
	if got != want {
		t.Fatalf("sanitizeConfigValue() = %q, want %q", got, want)
	}
}
