package commands

import (
	"fmt"
	"strings"

	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/utils"
)

// MergeOptions holds all merge options
type MergeOptions struct {
	NoFF          bool
	FFOnly        bool
	Squash        bool
	NoCommit      bool
	Abort         bool
	Continue      bool
	Strategy      string // "ours", "theirs", "ort", "recursive"
	StrategyOpt   string // "ours", "theirs" for -X
	BranchToMerge string
}

// Merge merges a branch into the current branch
// Usage:
//
//	merge <branch> [options]
//	merge --abort
//	merge --continue
func Merge(args []string) error {
	if len(args) == 0 {
		return fmt.Errorf("usage: merge <branch> [--no-ff|--ff-only|--squash|--no-commit|-s <strategy>|-X <option>] or merge --abort or merge --continue")
	}

	repoPath, err := utils.FindRepositoryRoot(".")
	if err != nil {
		return fmt.Errorf("not a Forester repository")
	}

	repo, err := core.OpenRepository(repoPath)
	if err != nil {
		return fmt.Errorf("failed to open repository: %w", err)
	}
	defer repo.Close()

	storage := repo.Storage
	refs := repo.Refs
	hooks := core.NewHooks(repoPath)

	// Parse arguments
	opts, err := parseMergeArgs(args)
	if err != nil {
		return err
	}

	if opts.Abort && opts.Continue {
		return fmt.Errorf("flags --abort and --continue are mutually exclusive")
	}
	if opts.Abort || opts.Continue {
		if opts.BranchToMerge != "" || opts.NoFF || opts.FFOnly || opts.Squash || opts.NoCommit || opts.Strategy != "" || opts.StrategyOpt != "" {
			return fmt.Errorf("flags --abort/--continue cannot be combined with other options")
		}
	}
	if opts.NoFF && opts.FFOnly {
		return fmt.Errorf("flags --no-ff and --ff-only are mutually exclusive")
	}
	if opts.Squash && opts.NoCommit {
		return fmt.Errorf("flags --squash and --no-commit are mutually exclusive")
	}

	// Handle abort
	if opts.Abort {
		return abortMerge(repoPath, repo)
	}

	// Handle continue
	if opts.Continue {
		return continueMerge(repoPath, repo, hooks)
	}

	if opts.BranchToMerge == "" {
		return fmt.Errorf("branch name required")
	}

	// Get current branch
	currentBranch, err := refs.GetCurrentBranch()
	if err != nil || currentBranch == "" {
		currentBranch = "main"
	}

	if opts.BranchToMerge == currentBranch {
		return fmt.Errorf("cannot merge branch into itself")
	}

	// Check if branch exists
	branches, err := repo.ListBranches()
	if err != nil {
		return fmt.Errorf("failed to list branches: %w", err)
	}

	targetFound := false
	for _, branchName := range branches {
		if branchName == opts.BranchToMerge {
			targetFound = true
			break
		}
	}

	if !targetFound {
		return fmt.Errorf("branch '%s' not found", opts.BranchToMerge)
	}

	currentHead, err := repo.GetBranchHead(currentBranch)

	targetHead, err := repo.GetBranchHead(opts.BranchToMerge)
	if err != nil {
		targetHead = ""
	}

	if targetHead == "" {
		return fmt.Errorf("branch '%s' has no commits", opts.BranchToMerge)
	}

	// Check if already merged
	if currentHead == targetHead {
		fmt.Printf("Already up to date with '%s'\n", opts.BranchToMerge)
		return nil
	}

	// Check if current HEAD is ancestor of target (fast-forward possible)
	if currentHead != "" {
		if isAncestor(repo, currentHead, targetHead) {
			if opts.FFOnly {
				return performFastForward(repoPath, repo, currentBranch, targetHead)
			}
			if opts.NoFF {
				return performMergeCommit(repoPath, repo, storage, refs, hooks, currentBranch, currentHead, targetHead, opts.BranchToMerge, opts)
			}
			return performFastForward(repoPath, repo, currentBranch, targetHead)
		}
	}

	// FF-only mode: fail if fast-forward not possible
	if opts.FFOnly {
		return fmt.Errorf("not possible to fast-forward merge; merge aborted")
	}

	// Perform merge commit
	return performMergeCommit(repoPath, repo, storage, refs, hooks, currentBranch, currentHead, targetHead, opts.BranchToMerge, opts)
}

// parseMergeArgs parses merge command arguments
func parseMergeArgs(args []string) (MergeOptions, error) {
	opts := MergeOptions{}

	for i := 0; i < len(args); i++ {
		arg := args[i]
		switch arg {
		case "--no-ff":
			opts.NoFF = true
		case "--ff-only":
			opts.FFOnly = true
		case "--squash":
			opts.Squash = true
		case "--no-commit":
			opts.NoCommit = true
		case "--abort":
			opts.Abort = true
		case "--continue":
			opts.Continue = true
		case "-s", "--strategy":
			if i+1 >= len(args) {
				return opts, fmt.Errorf("flag %s requires a value", arg)
			}
			opts.Strategy = args[i+1]
			i++
		case "-X", "--strategy-option":
			if i+1 >= len(args) {
				return opts, fmt.Errorf("flag %s requires a value", arg)
			}
			opts.StrategyOpt = args[i+1]
			i++
		default:
			if strings.HasPrefix(arg, "-") {
				return opts, fmt.Errorf("unknown flag: %s", arg)
			}
			if opts.BranchToMerge != "" {
				return opts, fmt.Errorf("multiple branch names provided")
			}
			opts.BranchToMerge = arg
		}
	}

	return opts, nil
}

// performFastForward performs a fast-forward merge
func performFastForward(repoPath string, repo *core.Repository, currentBranch, targetHead string) error {
	oldHead, _ := repo.GetBranchHead(currentBranch)
	if err := repo.SetBranchHead(currentBranch, targetHead, oldHead); err != nil {
		return fmt.Errorf("failed to update branch head: %w", err)
	}

	storage := repo.Storage

	targetCommit, err := repo.GetCommit(targetHead)
	if err != nil {
		return fmt.Errorf("failed to get target commit: %w", err)
	}

	// Restore files
	if err := restoreTreeFromCommit(storage, repoPath, targetCommit.TreeHash); err != nil {
		return fmt.Errorf("failed to restore files: %w", err)
	}

	// Clear index
	index, _ := core.NewIndex(repoPath)
	index.Clear()

	hashShort := targetHead
	if len(hashShort) > 8 {
		hashShort = hashShort[:8]
	}
	fmt.Printf("Fast-forward merge: HEAD is now at %s\n", hashShort)
	return nil
}

