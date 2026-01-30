package commands

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/models"
	"github.com/difference-machine/forester/internal/utils"
)

// Compare compares versions or extracts a commit to tmp_review
func Compare(args []string) error {
	if len(args) < 1 {
		return fmt.Errorf("usage: forester compare <commit1> [commit2] [--cleanup] [--editor <path>]")
	}

	repoPath, err := utils.FindRepositoryRoot(".")
	if err != nil {
		return fmt.Errorf("not a Forester repository")
	}

	dbPath := filepath.Join(repoPath, ".DFM", "database.db")
	db, err := core.NewDatabase(dbPath)
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}
	defer db.Close()

	storage, err := core.NewStorage(repoPath)
	if err != nil {
		return fmt.Errorf("failed to create storage: %w", err)
	}

	// Parse arguments
	var commitHashes []string
	cleanup := false
	editorPath := ""

	for i := 0; i < len(args); i++ {
		arg := args[i]
		if arg == "--cleanup" {
			cleanup = true
		} else if arg == "--editor" {
			if i+1 >= len(args) {
				return fmt.Errorf("flag --editor requires a value")
			}
			editorPath = args[i+1]
			i++ // Skip next argument as it's the editor path
		} else if !strings.HasPrefix(arg, "--") {
			commitHashes = append(commitHashes, arg)
		} else {
			return fmt.Errorf("unknown flag: %s", arg)
		}
	}

	if len(commitHashes) == 0 {
		return fmt.Errorf("usage: forester compare <commit1> [commit2] [--cleanup] [--editor <path>]")
	}
	if cleanup && len(commitHashes) != 1 {
		return fmt.Errorf("flag --cleanup requires a single commit")
	}

	// Single commit: extract to tmp_review
	if len(commitHashes) == 1 {
		return extractCommitToTmpReview(storage, db, repoPath, commitHashes[0], cleanup, editorPath)
	}

	// Two commits: compare them
	if len(commitHashes) != 2 {
		return fmt.Errorf("usage: forester compare <commit1> [commit2] [--cleanup] [--editor <path>]")
	}

	commit1Hash := commitHashes[0]
	commit2Hash := commitHashes[1]

	// Validate and get commits by full hash
	if !utils.IsValidCommitHash(commit1Hash) {
		return fmt.Errorf("invalid commit hash format: %s (must be 64 hex characters)", commit1Hash)
	}
	if !utils.IsValidCommitHash(commit2Hash) {
		return fmt.Errorf("invalid commit hash format: %s (must be 64 hex characters)", commit2Hash)
	}

	commit1, err := db.GetCommit(commit1Hash)
	if err != nil {
		return fmt.Errorf("commit not found: %s", commit1Hash)
	}

	commit2, err := db.GetCommit(commit2Hash)
	if err != nil {
		return fmt.Errorf("commit not found: %s", commit2Hash)
	}

	// Create temporary directories for comparison
	tmpDir := filepath.Join(repoPath, ".DFM", "tmp", "compare")
	if err := utils.RemoveRecursive(tmpDir); err != nil {
		// Ignore error
	}
	if err := utils.CreateDirectories(tmpDir); err != nil {
		return fmt.Errorf("failed to create temp directory: %w", err)
	}
	defer utils.RemoveRecursive(tmpDir)

	dir1 := filepath.Join(tmpDir, "commit1")
	dir2 := filepath.Join(tmpDir, "commit2")

	if err := utils.CreateDirectories(dir1); err != nil {
		return fmt.Errorf("failed to create temp directory: %w", err)
	}
	if err := utils.CreateDirectories(dir2); err != nil {
		return fmt.Errorf("failed to create temp directory: %w", err)
	}

	// Extract commits to temp directories
	if err := extractCommitToDir(storage, commit1, dir1); err != nil {
		return fmt.Errorf("failed to extract commit1: %w", err)
	}
	if err := extractCommitToDir(storage, commit2, dir2); err != nil {
		return fmt.Errorf("failed to extract commit2: %w", err)
	}

	fmt.Printf("Comparison directories created:\n")
	fmt.Printf("  Commit 1 (%s): %s\n", commit1Hash, dir1)
	fmt.Printf("  Commit 2 (%s): %s\n", commit2Hash, dir2)

	// Try to launch diff tool if available
	diffTool := os.Getenv("FORESTER_DIFF_TOOL")
	if diffTool == "" {
		diffTool = os.Getenv("DIFF_TOOL")
	}

	if diffTool != "" {
		fmt.Printf("\nLaunching diff tool: %s\n", diffTool)
		// Note: Actual tool launching would require os/exec, simplified here
		fmt.Println("(Diff tool launching not fully implemented)")
	}

	return nil
}

func extractCommitToDir(storage *core.Storage, commit *models.Commit, destDir string) error {
	if err := utils.CreateDirectories(destDir); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}

	// Get tree content
	treeContent, err := storage.GetTreeContent(commit.TreeHash)
	if err != nil {
		return fmt.Errorf("failed to get tree content: %w", err)
	}

	var tree models.Tree
	if err := tree.FromJSON(treeContent); err != nil {
		return fmt.Errorf("failed to parse tree: %w", err)
	}

	// Extract all files from tree
	for _, entry := range tree.Entries {
		destPath := filepath.Join(destDir, entry.Name)

		if entry.Type == "blob" {
			// Extract blob to file
			if err := storage.WriteBlobToFile(entry.Hash, destPath); err != nil {
				return fmt.Errorf("failed to extract blob %s: %w", entry.Name, err)
			}
		} else if entry.Type == "tree" {
			// Recursive extraction for subtrees
			if err := utils.CreateDirectories(destPath); err != nil {
				return fmt.Errorf("failed to create subdirectory: %w", err)
			}
			// TODO: Implement recursive tree extraction if needed
		}
	}

	// Create marker file
	markerFile := filepath.Join(destDir, ".commit_hash")
	return utils.WriteFileString(markerFile, commit.Hash)
}

func extractCommitToTmpReview(storage *core.Storage, db *core.Database, repoPath, commitHash string, cleanup bool, editorPath string) error {
	// Validate and get commit by full hash
	if !utils.IsValidCommitHash(commitHash) {
		return fmt.Errorf("invalid commit hash format: %s (must be 64 hex characters)", commitHash)
	}

	commit, err := db.GetCommit(commitHash)
	if err != nil {
		return fmt.Errorf("commit not found: %s", commitHash)
	}

	tmpReviewDir := filepath.Join(repoPath, ".DFM", "tmp_review")

	// Cleanup if requested
	if cleanup {
		if utils.Exists(tmpReviewDir) {
			if err := utils.RemoveRecursive(tmpReviewDir); err != nil {
				return fmt.Errorf("failed to cleanup tmp_review: %w", err)
			}
		}
		return nil
	}

	// Extract commit to tmp_review
	if err := extractCommitToDir(storage, commit, tmpReviewDir); err != nil {
		return fmt.Errorf("failed to extract commit: %w", err)
	}

	fmt.Printf("Commit %s extracted to: %s\n", commitHash, tmpReviewDir)

	// Launch editor if specified
	if editorPath != "" {
		// Find .blend file(s) in tmp_review directory
		blendFile := findBlendFile(tmpReviewDir)
		if blendFile == "" {
			fmt.Printf("Warning: No .blend file found in %s, skipping editor launch\n", tmpReviewDir)
			return nil
		}

		fmt.Printf("Launching editor: %s\n", editorPath)
		fmt.Printf("Opening file: %s\n", blendFile)
		cmd := exec.Command(editorPath, blendFile)
		if err := cmd.Start(); err != nil {
			fmt.Printf("Warning: failed to launch editor: %v\n", err)
		}
	}

	return nil
}

// findBlendFile searches for .blend files in the given directory
// First checks root level, then searches recursively
// Returns the first .blend file found, or empty string if none found
func findBlendFile(dir string) string {
	// First, check root level for .blend files
	entries, err := os.ReadDir(dir)
	if err == nil {
		for _, entry := range entries {
			if !entry.IsDir() && strings.HasSuffix(strings.ToLower(entry.Name()), ".blend") {
				return filepath.Join(dir, entry.Name())
			}
		}
	}

	// If no root-level .blend file found, search recursively
	var blendFile string
	err = filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // Continue walking on error
		}
		// Skip root directory itself
		if path == dir {
			return nil
		}
		if !info.IsDir() && strings.HasSuffix(strings.ToLower(path), ".blend") {
			blendFile = path
			return filepath.SkipAll // Found a blend file, stop walking
		}
		return nil
	})
	if err != nil {
		return ""
	}
	return blendFile
}
