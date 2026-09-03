package core

import (
	"encoding/base64"
	"strings"
)

const (
	encodedPathPrefix       = "b64_"
	legacyEncodedPathPrefix = "b64:"
)

// EncodeStoragePath encodes a repository-relative path for use as a single filename segment.
// Unlike slash replacement, base64 encoding cannot collide a/b with a__b.
// The b64_ prefix avoids ":" which is invalid in macOS filenames.
func EncodeStoragePath(path string) string {
	slashPath := strings.ReplaceAll(path, "\\", "/")
	return encodedPathPrefix + base64.RawURLEncoding.EncodeToString([]byte(slashPath))
}

func legacyEncodeStoragePath(path string) string {
	slashPath := strings.ReplaceAll(path, "\\", "/")
	return legacyEncodedPathPrefix + base64.RawURLEncoding.EncodeToString([]byte(slashPath))
}

// DecodeStoragePath decodes a path produced by EncodeStoragePath.
// Legacy paths without the b64_ prefix are returned unchanged.
func DecodeStoragePath(encoded string) string {
	for _, prefix := range []string{encodedPathPrefix, legacyEncodedPathPrefix} {
		if !strings.HasPrefix(encoded, prefix) {
			continue
		}
		raw, err := base64.RawURLEncoding.DecodeString(strings.TrimPrefix(encoded, prefix))
		if err != nil {
			return encoded
		}
		return string(raw)
	}
	return strings.ReplaceAll(encoded, "__", "/")
}
