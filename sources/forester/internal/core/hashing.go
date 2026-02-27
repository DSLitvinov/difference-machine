package core

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"strings"
)

// HashString computes SHA-256 hash of a string.
//
// Example:
//
//	hash := HashString("test content")
func HashString(content string) string {
	if content == "" {
		return strings.Repeat("0", 64) // Empty hash for empty string
	}

	hash := sha256.Sum256([]byte(content))
	return hex.EncodeToString(hash[:])
}

// HashBytes computes SHA-256 hash of byte slice (for binary data).
// This function should be used instead of HashString for binary data to avoid
// incorrect conversion of []byte to string which can corrupt binary data.
//
// Example:
//
//	hash := HashBytes([]byte{0x00, 0x01, 0xFF})
func HashBytes(data []byte) string {
	if len(data) == 0 {
		return strings.Repeat("0", 64) // Empty hash for empty data
	}
	hash := sha256.Sum256(data)
	return hex.EncodeToString(hash[:])
}

// HashFile computes SHA-256 hash of a file.
// The file is read in streaming mode to handle large files efficiently.
//
// Example:
//
//	hash, err := HashFile("/path/to/file.txt")
func HashFile(filePath string) (string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	hash := sha256.New()
	if _, err := io.Copy(hash, file); err != nil {
		return "", fmt.Errorf("failed to read file: %w", err)
	}

	hashBytes := hash.Sum(nil)
	return hex.EncodeToString(hashBytes), nil
}

// HashCombined computes hash of combined parts.
// Parts are combined with null byte separators before hashing.
//
// Example:
//
//	hash := HashCombined([]string{"part1", "part2"})
func HashCombined(parts []string) string {
	if len(parts) == 0 {
		return strings.Repeat("0", 64)
	}

	// Combine parts with null byte separator
	var combined strings.Builder
	for i, part := range parts {
		if i > 0 {
			combined.WriteByte(0) // Null byte separator
		}
		combined.WriteString(part)
	}

	return HashString(combined.String())
}

// HashTree computes hash of a tree JSON representation.
//
// Example:
//
//	hash := HashTree(`{"entries":[...]}`)
func HashTree(treeJSON string) string {
	return HashString(treeJSON)
}

// BytesToHex converts bytes to hex string.
//
// Example:
//
//	hex := BytesToHex([]byte{0xAB, 0xCD})
func BytesToHex(bytes []byte) string {
	return hex.EncodeToString(bytes)
}

// HexToBytes converts hex string to bytes.
//
// Example:
//
//	bytes, err := HexToBytes("abcd")
func HexToBytes(hexStr string) ([]byte, error) {
	return hex.DecodeString(hexStr)
}


