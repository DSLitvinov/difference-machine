package core

import "fmt"

// ErrObjectNotFound represents a missing object in the object store.
type ErrObjectNotFound struct {
	Hash string
}

func (e *ErrObjectNotFound) Error() string {
	return fmt.Sprintf("object not found: %s", e.Hash)
}

// ErrAmbiguousStashPrefix represents an ambiguous stash hash prefix.
type ErrAmbiguousStashPrefix struct {
	Prefix string
}

func (e *ErrAmbiguousStashPrefix) Error() string {
	return fmt.Sprintf("ambiguous stash prefix: %s", e.Prefix)
}

// ErrCommentNotFound represents a missing review comment.
type ErrCommentNotFound struct {
	ID int
}

func (e *ErrCommentNotFound) Error() string {
	return fmt.Sprintf("comment not found: %d", e.ID)
}

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

// ErrAmbiguousCommitPrefix represents an error when a commit prefix matches multiple commits
type ErrAmbiguousCommitPrefix struct {
	Prefix string
}

func (e *ErrAmbiguousCommitPrefix) Error() string {
	return fmt.Sprintf("ambiguous commit prefix: %s", e.Prefix)
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

