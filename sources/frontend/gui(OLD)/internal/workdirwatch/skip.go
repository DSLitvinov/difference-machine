package workdirwatch

import (
	"os"
	"path/filepath"
	"strings"
)

func canonicalRelPath(repoPath, absPath string) string {
	rel, err := filepath.Rel(repoPath, absPath)
	if err != nil {
		return ""
	}
	return strings.Trim(filepath.ToSlash(rel), "/")
}

func shouldSkipDirName(name string) bool {
	return name == ".DFM"
}

func shouldSkipRelPath(rel string) bool {
	rel = strings.Trim(filepath.ToSlash(rel), "/")
	if rel == "" {
		return false
	}
	if rel == ".DFM" || strings.HasPrefix(rel, ".DFM/") {
		return true
	}
	if rel == ".dfmignore" {
		return true
	}
	return false
}

func shouldSkipEvent(repoPath, absPath string) bool {
	rel := canonicalRelPath(repoPath, absPath)
	if rel == "" {
		return true
	}
	return shouldSkipRelPath(rel)
}

func addWatchTree(watcher interface {
	Add(path string) error
}, repoPath string) error {
	return filepath.WalkDir(repoPath, func(path string, entry os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if entry.IsDir() {
			if path != repoPath {
				name := entry.Name()
				if shouldSkipDirName(name) {
					return filepath.SkipDir
				}
			}
			return watcher.Add(path)
		}
		return nil
	})
}
