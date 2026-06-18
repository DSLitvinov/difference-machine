package commands

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/utils"
)

// Init initializes a new Forester repository
func Init(args []string) error {
	var repoPath string
	if len(args) > 0 {
		if len(args) > 1 {
			return fmt.Errorf("usage: init [path]")
		}
		if strings.HasPrefix(args[0], "-") {
			return fmt.Errorf("usage: init [path]")
		}
		repoPath = args[0]
	} else {
		var err error
		repoPath, err = os.Getwd()
		if err != nil {
			return fmt.Errorf("failed to get current directory: %w", err)
		}
	}

	// Check if repository is already initialized
	dfmPath := filepath.Join(repoPath, ".DFM")
	if utils.Exists(dfmPath) {
		return fmt.Errorf("repository already initialized in %s", repoPath)
	}

	fmt.Printf("Initializing Forester repository in %s\n", repoPath)

	// Create directory structure
	if err := createDirectoryStructure(repoPath); err != nil {
		return err
	}

	// Initialize empty product database (locks, reviews, objects, stashes)
	if err := initializeDatabase(repoPath); err != nil {
		return fmt.Errorf("failed to initialize database: %w", err)
	}

	// Create HEAD file and ref for main branch (refs are source of truth for VCS)
	refs := core.NewRefs(repoPath)
	if err := refs.SetCurrentBranch("main"); err != nil {
		return fmt.Errorf("failed to set current branch: %w", err)
	}
	if err := refs.CreateBranch("main", ""); err != nil {
		return fmt.Errorf("failed to create main branch: %w", err)
	}

	// Create configuration files
	if err := createDefaultIgnoreFile(repoPath); err != nil {
		return fmt.Errorf("failed to create ignore file: %w", err)
	}
	if err := createHooksDirectory(repoPath); err != nil {
		return fmt.Errorf("failed to create hooks directory: %w", err)
	}
	if err := createConfigFile(repoPath); err != nil {
		return fmt.Errorf("failed to create config file: %w", err)
	}

	fmt.Println("Repository initialized successfully!")
	return nil
}

func createDirectoryStructure(repoPath string) error {
	dirs := []string{
		".DFM",
		".DFM/objects",
		".DFM/logs/refs/heads",
		".DFM/refs/heads",
		".DFM/refs/tags",
		".DFM/hooks",
	}

	for _, dir := range dirs {
		fullPath := filepath.Join(repoPath, dir)
		if err := utils.CreateDirectories(fullPath); err != nil {
			return fmt.Errorf("failed to create directory %s: %w", dir, err)
		}
	}

	return nil
}

func initializeDatabase(repoPath string) error {
	dbPath := filepath.Join(repoPath, ".DFM", "database.db")
	db, err := core.NewDatabase(dbPath)
	if err != nil {
		return err
	}
	return db.Close()
}

func createDefaultIgnoreFile(repoPath string) error {
	ignorePath := filepath.Join(repoPath, ".dfmignore")
	if utils.Exists(ignorePath) {
		return nil // Already exists
	}

	ignoreContent := `# Forester ignore file
# Similar to .gitignore

# OS files
.DS_Store
Thumbs.db
desktop.ini

# IDE
.vscode/
.idea/
*.swp
*.swo

# Build artifacts
build/
*.o
*.a
*.so
*.dylib
*.dll
*.exe

# Temporary files
*.tmp
*.log
*.cache

# Blender
*.blend1
*.blend2

# Unity
Library/
Temp/
Obj/
*.csproj
*.sln

# Unreal
Binaries/
Intermediate/
Saved/
DerivedDataCache/
`

	return utils.WriteFileString(ignorePath, ignoreContent)
}

func createHooksDirectory(repoPath string) error {
	hooksPath := filepath.Join(repoPath, ".DFM", "hooks")
	if err := utils.CreateDirectories(hooksPath); err != nil {
		return err
	}

	hooks := map[string]string{
		"pre-commit": `#!/bin/sh
# Pre-commit hook
# Exit with non-zero status to abort commit
exit 0
`,
		"post-commit": `#!/bin/sh
# Post-commit hook
echo "Commit completed"
`,
		"pre-checkout": `#!/bin/sh
# Pre-checkout hook
# Exit with non-zero status to abort checkout
exit 0
`,
		"post-checkout": `#!/bin/sh
# Post-checkout hook
echo "Checkout completed"
`,
	}

	for name, content := range hooks {
		hookPath := filepath.Join(hooksPath, name)
		if utils.Exists(hookPath) {
			continue
		}

		if err := utils.WriteFileString(hookPath, content); err != nil {
			return err
		}

		// Make executable on Unix systems
		if err := os.Chmod(hookPath, 0755); err != nil {
			// Ignore chmod errors on Windows
		}
	}

	return nil
}

func createConfigFile(repoPath string) error {
	configPath := filepath.Join(repoPath, ".DFM", "config")
	if utils.Exists(configPath) {
		return nil
	}

	configContent := `# Forester configuration
[core]
    repositoryformatversion = 0
    filemode = true
    bare = false

[user]
    name = 
    email = 
`

	return utils.WriteFileString(configPath, configContent)
}
