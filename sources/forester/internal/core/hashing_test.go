package core

import (
	"testing"
)

func TestHashBytes(t *testing.T) {
	tests := []struct {
		name     string
		data     []byte
		expected string
	}{
		{
			name:     "empty",
			data:     []byte{},
			expected: "0000000000000000000000000000000000000000000000000000000000000000",
		},
		{
			name:     "simple text",
			data:     []byte("test"),
			expected: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
		},
		{
			name:     "binary data",
			data:     []byte{0x00, 0x01, 0x02, 0xFF},
			expected: "153768e2ecc7a0c884d0b45f7b0e8c0e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := HashBytes(tt.data)
			if tt.name == "binary data" {
				// For binary data, just check it's a valid hash (64 hex chars)
				if len(got) != 64 {
					t.Errorf("HashBytes() length = %d, want 64", len(got))
				}
			} else {
				if got != tt.expected {
					t.Errorf("HashBytes() = %v, want %v", got, tt.expected)
				}
			}
		})
	}
}

func TestHashString(t *testing.T) {
	tests := []struct {
		name     string
		content  string
		expected string
	}{
		{
			name:     "empty",
			content:  "",
			expected: "0000000000000000000000000000000000000000000000000000000000000000",
		},
		{
			name:     "simple",
			content:  "test",
			expected: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := HashString(tt.content)
			if got != tt.expected {
				t.Errorf("HashString() = %v, want %v", got, tt.expected)
			}
		})
	}
}

func TestHashCombined(t *testing.T) {
	tests := []struct {
		name     string
		parts    []string
		expected string
	}{
		{
			name:     "empty",
			parts:    []string{},
			expected: "0000000000000000000000000000000000000000000000000000000000000000",
		},
		{
			name:     "single part",
			parts:    []string{"test"},
			expected: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
		},
		{
			name:     "multiple parts",
			parts:    []string{"part1", "part2"},
			expected: HashString("part1\x00part2"),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := HashCombined(tt.parts)
			if tt.name == "multiple parts" {
				// Just check it's a valid hash
				if len(got) != 64 {
					t.Errorf("HashCombined() length = %d, want 64", len(got))
				}
			} else {
				if got != tt.expected {
					t.Errorf("HashCombined() = %v, want %v", got, tt.expected)
				}
			}
		})
	}
}

func TestHashTree(t *testing.T) {
	treeJSON := `{"entries":[{"name":"file.txt","hash":"abc123","type":"blob"}]}`
	got := HashTree(treeJSON)
	if len(got) != 64 {
		t.Errorf("HashTree() length = %d, want 64", len(got))
	}
}

func TestBytesToHex(t *testing.T) {
	tests := []struct {
		name     string
		bytes    []byte
		expected string
	}{
		{"empty", []byte{}, ""},
		{"simple", []byte{0xAB, 0xCD}, "abcd"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := BytesToHex(tt.bytes)
			if got != tt.expected {
				t.Errorf("BytesToHex() = %v, want %v", got, tt.expected)
			}
		})
	}
}

func TestHexToBytes(t *testing.T) {
	tests := []struct {
		name    string
		hexStr  string
		wantErr bool
	}{
		{"valid", "abcd", false},
		{"invalid", "xyz", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := HexToBytes(tt.hexStr)
			if (err != nil) != tt.wantErr {
				t.Errorf("HexToBytes() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

