package core

import (
	"strings"
	"testing"
)

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

func TestEncodeStoragePath_NoColon(t *testing.T) {
	encoded := EncodeStoragePath("scene.blend")
	if strings.Contains(encoded, ":") {
		t.Fatalf("encoded path must not contain colon on macOS: %q", encoded)
	}
	if !strings.HasPrefix(encoded, "b64_") {
		t.Fatalf("encoded path = %q, want b64_ prefix", encoded)
	}
}

func TestDecodeStoragePath_LegacyPrefix(t *testing.T) {
	legacy := legacyEncodeStoragePath("scene.blend")
	if got := DecodeStoragePath(legacy); got != "scene.blend" {
		t.Fatalf("legacy decode = %q, want scene.blend", got)
	}
}

func TestEncodeStoragePath_LegacyFallback(t *testing.T) {
	legacy := "models__scene.blend"
	if got := DecodeStoragePath(legacy); got != "models/scene.blend" {
		t.Fatalf("legacy decode = %q", got)
	}
}
