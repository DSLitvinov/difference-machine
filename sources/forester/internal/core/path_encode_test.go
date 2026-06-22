package core

import "testing"

func TestEncodeStoragePath_NoCollision(t *testing.T) {
	a := EncodeStoragePath("a/b")
	b := EncodeStoragePath("a__b")
	if a == b {
		t.Fatalf("paths must not collide: %q == %q", a, b)
	}
	if got := DecodeStoragePath(a); got != "a/b" {
		t.Fatalf("DecodeStoragePath(%q) = %q, want a/b", a, got)
	}
}

func TestEncodeStoragePath_LegacyFallback(t *testing.T) {
	legacy := "models__scene.blend"
	if got := DecodeStoragePath(legacy); got != "models/scene.blend" {
		t.Fatalf("legacy decode = %q", got)
	}
}
