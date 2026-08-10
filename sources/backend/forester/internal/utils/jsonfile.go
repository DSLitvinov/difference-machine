package utils

import (
	"encoding/json"
	"os"
	"path/filepath"
)

// ReadJSONFile reads and unmarshals JSON from path.
func ReadJSONFile(path string, dest interface{}) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, dest)
}

// WriteJSONFileAtomic marshals value and writes it atomically under an advisory lock.
func WriteJSONFileAtomic(path string, value interface{}) error {
	return withPathLock(path, func() error {
		data, err := json.MarshalIndent(value, "", "  ")
		if err != nil {
			return err
		}
		return WriteFileAtomic(path, data)
	})
}

// UpdateJSONFileAtomic reads JSON, applies update, and writes atomically under lock.
func UpdateJSONFileAtomic(path string, initial interface{}, update func() error) error {
	return withPathLock(path, func() error {
		if Exists(path) {
			data, err := os.ReadFile(path)
			if err != nil {
				return err
			}
			if err := json.Unmarshal(data, initial); err != nil {
				return err
			}
		}
		if err := update(); err != nil {
			return err
		}
		data, err := json.MarshalIndent(initial, "", "  ")
		if err != nil {
			return err
		}
		return WriteFileAtomic(path, data)
	})
}

// WithFileLock runs fn while holding an advisory lock for path.
func WithFileLock(path string, fn func() error) error {
	if err := EnsureDirectory(filepath.Dir(path)); err != nil {
		return err
	}
	return withPathLock(path, fn)
}
