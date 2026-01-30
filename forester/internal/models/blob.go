package models

// Blob represents a blob (file content)
type Blob struct {
	Hash string `json:"hash"`
	Path string `json:"path"`
	Size int64  `json:"size"`
}

// NewBlob creates a new blob
func NewBlob(hash, path string, size int64) *Blob {
	return &Blob{
		Hash: hash,
		Path: path,
		Size: size,
	}
}


