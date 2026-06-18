package core

import "fmt"

// ErrCommitNotFound represents an error when a commit is not found
type ErrCommitNotFound struct {
	Hash string
}

func (e *ErrCommitNotFound) Error() string {
	return fmt.Sprintf("commit not found: %s", e.Hash)
}

// ErrBranchNotFound represents an error when a branch is not found
type ErrBranchNotFound struct {
	Name string
}

func (e *ErrBranchNotFound) Error() string {
	return fmt.Sprintf("branch not found: %s", e.Name)
}

// ErrTagNotFound represents an error when a tag is not found
type ErrTagNotFound struct {
	Name string
}

func (e *ErrTagNotFound) Error() string {
	return fmt.Sprintf("tag not found: %s", e.Name)
}

// ErrInvalidHash represents an error when a hash format is invalid
type ErrInvalidHash struct {
	Hash string
}

func (e *ErrInvalidHash) Error() string {
	return fmt.Sprintf("invalid hash format: %s", e.Hash)
}

// ErrInvalidPath represents an error when a path is invalid
type ErrInvalidPath struct {
	Path string
}

func (e *ErrInvalidPath) Error() string {
	return fmt.Sprintf("invalid path: %s", e.Path)
}

