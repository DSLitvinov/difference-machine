package core

import (
	"os"
	"path/filepath"
	"testing"
)

func TestStorage_StoreBlob(t *testing.T) {
	// Create temporary directory
	tmpDir, err := os.MkdirTemp("", "forester_test_*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	storage, err := NewStorage(tmpDir)
	if err != nil {
		t.Fatalf("Failed to create storage: %v", err)
	}

	tests := []struct {
		name    string
		content []byte
		wantErr bool
	}{
		{"empty", []byte{}, false},
		{"text", []byte("test content"), false},
		{"binary", []byte{0x00, 0x01, 0xFF}, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			hash, err := storage.StoreBlob(tt.content)
			if (err != nil) != tt.wantErr {
				t.Errorf("StoreBlob() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr {
				if len(hash) != 64 {
					t.Errorf("StoreBlob() hash length = %d, want 64", len(hash))
				}
			}
		})
	}
}

func TestStorage_BlobExists(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "forester_test_*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	storage, err := NewStorage(tmpDir)
	if err != nil {
		t.Fatalf("Failed to create storage: %v", err)
	}

	// Store a blob
	content := []byte("test")
	hash, err := storage.StoreBlob(content)
	if err != nil {
		t.Fatalf("Failed to store blob: %v", err)
	}

	// Check if it exists
	if !storage.BlobExists(hash) {
		t.Errorf("BlobExists() = false, want true for hash %s", hash)
	}

	// Check non-existent blob
	if storage.BlobExists("nonexistent123456789012345678901234567890123456789012345678901234567890") {
		t.Errorf("BlobExists() = true, want false for non-existent hash")
	}
}

func TestStorage_Deduplication(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "forester_test_*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	storage, err := NewStorage(tmpDir)
	if err != nil {
		t.Fatalf("Failed to create storage: %v", err)
	}

	content := []byte("test content")
	hash1, err := storage.StoreBlob(content)
	if err != nil {
		t.Fatalf("Failed to store blob: %v", err)
	}

	// Store the same content again
	hash2, err := storage.StoreBlob(content)
	if err != nil {
		t.Fatalf("Failed to store blob second time: %v", err)
	}

	// Hashes should be the same (deduplication)
	if hash1 != hash2 {
		t.Errorf("Deduplication failed: hash1 = %s, hash2 = %s", hash1, hash2)
	}
}

func TestStorage_hashToPath(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "forester_test_*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	storage, err := NewStorage(tmpDir)
	if err != nil {
		t.Fatalf("Failed to create storage: %v", err)
	}

	tests := []struct {
		name    string
		hash    string
		wantErr bool
	}{
		{"valid hash", "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890", false},
		{"short hash", "ab", true},
		{"invalid hash", "../etc/passwd", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			path, err := storage.hashToPath(tt.hash)
			if (err != nil) != tt.wantErr {
				t.Errorf("hashToPath() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr {
				// Check that path doesn't contain ..
				if filepath.IsAbs(path) {
					t.Errorf("hashToPath() returned absolute path: %s", path)
				}
			}
		})
	}
}

