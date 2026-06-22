package jsonapi

import (
	"fmt"
	"os"

	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/utils"
)

func withWorkDir(workPath string, fn func() (interface{}, error)) (interface{}, error) {
	path := workPath
	if path == "" {
		path = "."
	}

	oldDir, _ := os.Getwd()
	if path != "." {
		if err := os.Chdir(path); err != nil {
			return nil, fmt.Errorf("failed to change directory: %w", err)
		}
		defer func() { _ = os.Chdir(oldDir) }()
	}
	return fn()
}

func withRepo(workPath string, fn func(repo *core.Repository, repoPath string) (interface{}, error)) (interface{}, error) {
	return withWorkDir(workPath, func() (interface{}, error) {
		repoPath, err := utils.FindRepositoryRoot(".")
		if err != nil {
			return nil, fmt.Errorf("not a Forester repository")
		}
		repo, err := core.OpenRepository(repoPath)
		if err != nil {
			return nil, fmt.Errorf("failed to open repository: %w", err)
		}
		defer repo.Close()
		return fn(repo, repoPath)
	})
}

func currentBranch(repoPath string) string {
	refs := core.NewRefs(repoPath)
	branch, err := refs.GetCurrentBranch()
	if err != nil || branch == "" {
		return "main"
	}
	return branch
}
