package core

import (
	"bytes"
	"compress/flate"
	"fmt"
	"io"
)

// Compress compresses data using zlib/deflate
func Compress(data []byte) ([]byte, error) {
	if len(data) == 0 {
		return data, nil
	}

	var buf bytes.Buffer
	writer, err := flate.NewWriter(&buf, flate.DefaultCompression)
	if err != nil {
		return nil, fmt.Errorf("failed to create compressor: %w", err)
	}

	if _, err := writer.Write(data); err != nil {
		writer.Close()
		return nil, fmt.Errorf("failed to write data: %w", err)
	}

	if err := writer.Close(); err != nil {
		return nil, fmt.Errorf("failed to close compressor: %w", err)
	}

	return buf.Bytes(), nil
}

// CompressString compresses a string
func CompressString(data string) ([]byte, error) {
	return Compress([]byte(data))
}

// Decompress decompresses data using zlib/inflate
func Decompress(compressed []byte) ([]byte, error) {
	if len(compressed) == 0 {
		return compressed, nil
	}

	reader := flate.NewReader(bytes.NewReader(compressed))
	defer reader.Close()

	var buf bytes.Buffer
	if _, err := io.Copy(&buf, reader); err != nil {
		return nil, fmt.Errorf("failed to decompress: %w", err)
	}

	return buf.Bytes(), nil
}

// DecompressString decompresses data to a string
func DecompressString(compressed []byte) (string, error) {
	data, err := Decompress(compressed)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// IsCompressed checks if data appears to be compressed (zlib format)
func IsCompressed(data []byte) bool {
	if len(data) < 2 {
		return false
	}

	// Check for zlib header: 0x78 followed by valid second byte
	byte1 := data[0]
	byte2 := data[1]

	// zlib header: 0x78 and second byte should be one of valid values
	if byte1 == 0x78 {
		validSeconds := []byte{0x01, 0x5E, 0x9C, 0xDA, 0x20, 0x7D, 0xBB, 0xFB}
		for _, valid := range validSeconds {
			if byte2 == valid {
				return true
			}
		}
	}

	return false
}

// IsCompressedString checks if a string appears to be compressed
func IsCompressedString(data string) bool {
	return IsCompressed([]byte(data))
}

// Compressor wraps a flate writer for streaming compression
type Compressor struct {
	writer *flate.Writer
}

// NewCompressor creates a new compressor that writes to the given writer
func NewCompressor(w io.Writer) *Compressor {
	writer, err := flate.NewWriter(w, flate.DefaultCompression)
	if err != nil {
		// Return nil compressor if creation fails - caller should check
		return nil
	}
	return &Compressor{writer: writer}
}

// Write writes data to the compressor
func (c *Compressor) Write(p []byte) (n int, err error) {
	if c.writer == nil {
		return 0, fmt.Errorf("compressor not initialized")
	}
	return c.writer.Write(p)
}

// Close closes the compressor and flushes remaining data
func (c *Compressor) Close() error {
	if c.writer == nil {
		return fmt.Errorf("compressor not initialized")
	}
	return c.writer.Close()
}


