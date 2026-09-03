package jsonapi

import "github.com/difference-machine/forester/internal/core"

// headObjectsBroken reports whether HEAD (or detached commit) cannot be loaded
// from the object store: missing commit file, unreadable payload, or missing tree.
func headObjectsBroken(repo *core.Repository, headCommit string) bool {
	if headCommit == "" {
		return false
	}
	commit, err := repo.GetCommit(headCommit)
	if err != nil {
		return true
	}
	if commit.TreeHash == "" {
		return false
	}
	_, err = repo.Storage.GetTreeContent(commit.TreeHash)
	return err != nil
}
