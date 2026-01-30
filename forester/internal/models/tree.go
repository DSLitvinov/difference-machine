package models

import (
	"encoding/json"
)

// TreeEntry represents an entry in a tree
type TreeEntry struct {
	Hash string `json:"hash"`
	Name string `json:"name"`
	Type string `json:"type"` // "blob", "tree"
	Mode int    `json:"mode"` // Unix-style permissions
}

// NewTreeEntry creates a new tree entry with default values
func NewTreeEntry(hash, name, entryType string) *TreeEntry {
	return &TreeEntry{
		Hash: hash,
		Name: name,
		Type: entryType,
		Mode: 0644,
	}
}

// Tree represents a tree object
type Tree struct {
	Hash    string       `json:"hash"`
	Entries []*TreeEntry `json:"entries"`
}

// NewTree creates a new tree
func NewTree() *Tree {
	return &Tree{
		Entries: []*TreeEntry{},
	}
}

// ToJSON converts tree to JSON string
func (t *Tree) ToJSON() (string, error) {
	data, err := json.Marshal(t)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// FromJSON creates a tree from JSON string
func (t *Tree) FromJSON(jsonStr string) error {
	return json.Unmarshal([]byte(jsonStr), t)
}

// AddEntry adds an entry to the tree
func (t *Tree) AddEntry(entry *TreeEntry) {
	t.Entries = append(t.Entries, entry)
}

// FindEntry finds an entry by name
func (t *Tree) FindEntry(name string) *TreeEntry {
	for _, entry := range t.Entries {
		if entry.Name == name {
			return entry
		}
	}
	return nil
}


