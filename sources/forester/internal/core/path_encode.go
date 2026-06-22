package core

import (
	"encoding/base64"
	"strings"
)

const encodedPathPrefix = "b64:"

// EncodeStoragePath encodes a repository-relative path for use as a single filename segment.
// Unlike slash replacement, base64 encoding cannot collide a/b with a__b.
func EncodeStoragePath(path string) string {
	slashPath := strings.ReplaceAll(path, "\\", "/")
	return encodedPathPrefix + base64.RawURLEncoding.EncodeToString([]byte(slashPath))
}

// DecodeStoragePath decodes a path produced by EncodeStoragePath.
// Legacy paths without the b64: prefix are returned unchanged.
func DecodeStoragePath(encoded string) string {
	if !strings.HasPrefix(encoded, encodedPathPrefix) {
		return strings.ReplaceAll(encoded, "__", "/")
	}
	raw, err := base64.RawURLEncoding.DecodeString(strings.TrimPrefix(encoded, encodedPathPrefix))
	if err != nil {
		return encoded
	}
	return string(raw)
}
