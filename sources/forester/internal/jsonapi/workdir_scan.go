package jsonapi

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/difference-machine/forester/internal/utils"
)

type workdirScanner struct {
	repoPath string
	patterns *utils.Patterns
}

func newWorkdirScanner(repoPath string) *workdirScanner {
	patterns := utils.NewPatterns()
	ignorePath := filepath.Join(repoPath, ".dfmignore")
	if utils.Exists(ignorePath) {
		_ = patterns.LoadFromFile(ignorePath)
	}
	return &workdirScanner{repoPath: repoPath, patterns: patterns}
}

func canonicalRelPath(path string) string {
	return utils.NormalizeRepoRelPath(path)
}

func isTmpReviewPath(rel string) bool {
	return utils.IsTmpReviewRelPath(rel)
}

func parentRepoRelPath(rel string) string {
	return filepath.ToSlash(filepath.Dir(filepath.FromSlash(rel)))
}

func (s *workdirScanner) absDir(rel string) (string, error) {
	rel = canonicalRelPath(rel)
	if rel == "" {
		return s.repoPath, nil
	}
	if strings.Contains(rel, "..") {
		return "", os.ErrInvalid
	}
	abs := filepath.Join(s.repoPath, filepath.FromSlash(rel))
	abs, err := filepath.Abs(abs)
	if err != nil {
		return "", err
	}
	repoAbs, err := filepath.Abs(s.repoPath)
	if err != nil {
		return "", err
	}
	if abs != repoAbs && !strings.HasPrefix(abs, repoAbs+string(filepath.Separator)) {
		return "", os.ErrInvalid
	}
	return abs, nil
}

func (s *workdirScanner) ensureInsideRepo(abs string) (string, error) {
	repoAbs, err := filepath.Abs(s.repoPath)
	if err != nil {
		return "", err
	}
	if resolved, err := filepath.EvalSymlinks(abs); err == nil {
		abs = resolved
	}
	abs, err = filepath.Abs(abs)
	if err != nil {
		return "", err
	}
	if abs != repoAbs && !strings.HasPrefix(abs, repoAbs+string(filepath.Separator)) {
		return "", fmt.Errorf("path is not accessible")
	}
	return abs, nil
}

func (s *workdirScanner) shouldSkipName(name string, rel string, isDir bool) bool {
	if name == ".DFM" || name == ".dfmignore" {
		return true
	}
	rel = filepath.ToSlash(rel)
	if rel == ".DFM" || strings.HasPrefix(rel, ".DFM/") {
		return true
	}
	if rel == ".dfmignore" {
		return true
	}
	if s.patterns.Matches(rel) {
		return true
	}
	if isDir && s.patterns.Matches(rel+"/") {
		return true
	}
	return false
}

// absOpenPath resolves a repo-relative path for workdir.open.
// Compare extracts commits to .DFM/tmp_review; those paths are allowed here only.
func (s *workdirScanner) absOpenPath(rel string) (string, error) {
	rel = canonicalRelPath(rel)
	if rel == "" {
		return "", fmt.Errorf("path is required")
	}
	if isTmpReviewPath(rel) {
		abs, err := utils.JoinRepoPath(s.repoPath, rel)
		if err != nil {
			return "", err
		}
		abs, err = s.ensureInsideRepo(abs)
		if err != nil {
			return "", err
		}
		if _, err := os.Stat(abs); err != nil {
			return "", err
		}
		return abs, nil
	}
	return s.absFile(rel)
}

// absFilePath resolves a relative workdir file path and rejects internal paths.
func (s *workdirScanner) absFilePath(rel string) (string, error) {
	rel = canonicalRelPath(rel)
	if rel == "" {
		return "", fmt.Errorf("path is required")
	}
	name := filepath.Base(filepath.FromSlash(rel))
	if s.shouldSkipName(name, rel, false) {
		return "", fmt.Errorf("path is not accessible")
	}
	abs, err := s.absDir(parentRepoRelPath(rel))
	if err != nil {
		return "", err
	}
	return filepath.Join(abs, name), nil
}

// absFile resolves a relative workdir file path and rejects directories and internal paths.
func (s *workdirScanner) absFile(rel string) (string, error) {
	abs, err := s.absFilePath(rel)
	if err != nil {
		return "", err
	}
	abs, err = s.ensureInsideRepo(abs)
	if err != nil {
		return "", err
	}
	info, err := os.Stat(abs)
	if err != nil {
		return "", err
	}
	if info.IsDir() {
		return "", fmt.Errorf("path is a directory")
	}
	return abs, nil
}

func (s *workdirScanner) countFilesRecursive(rel string) (int, error) {
	absDir, err := s.absDir(rel)
	if err != nil {
		return 0, err
	}
	info, err := os.Stat(absDir)
	if err != nil {
		return 0, err
	}
	if !info.IsDir() {
		return 0, nil
	}

	count := 0
	err = filepath.Walk(absDir, func(path string, fi os.FileInfo, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		relPath, err := filepath.Rel(s.repoPath, path)
		if err != nil {
			return err
		}
		relPath = filepath.ToSlash(relPath)
		if fi.IsDir() {
			if s.shouldSkipName(fi.Name(), relPath, true) {
				return filepath.SkipDir
			}
			return nil
		}
		if s.shouldSkipName(fi.Name(), relPath, false) {
			return nil
		}
		count++
		return nil
	})
	return count, err
}

type folderNode struct {
	Name      string       `json:"name"`
	Path      string       `json:"path"`
	ItemCount int          `json:"item_count"`
	Children  []folderNode `json:"children"`
}

func (s *workdirScanner) listFolderChildren(rel string, depth int) ([]folderNode, error) {
	if depth <= 0 {
		return nil, nil
	}
	absDir, err := s.absDir(rel)
	if err != nil {
		return nil, err
	}
	entries, err := os.ReadDir(absDir)
	if err != nil {
		return nil, err
	}

	parentRel := canonicalRelPath(rel)
	nodes := make([]folderNode, 0)
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		name := entry.Name()
		childRel := name
		if parentRel != "" {
			childRel = parentRel + "/" + name
		}
		if s.shouldSkipName(name, childRel, true) {
			continue
		}
		itemCount, err := s.countFilesRecursive(childRel)
		if err != nil {
			return nil, err
		}
		var grandchildren []folderNode
		if depth > 1 {
			grandchildren, err = s.listFolderChildren(childRel, depth-1)
			if err != nil {
				return nil, err
			}
		}
		if grandchildren == nil {
			grandchildren = []folderNode{}
		}
		nodes = append(nodes, folderNode{
			Name:      name,
			Path:      childRel,
			ItemCount: itemCount,
			Children:  grandchildren,
		})
	}

	sort.Slice(nodes, func(i, j int) bool {
		return strings.ToLower(nodes[i].Name) < strings.ToLower(nodes[j].Name)
	})
	return nodes, nil
}

type dirEntry struct {
	Name      string `json:"name"`
	Path      string `json:"path"`
	IsDir     bool   `json:"is_dir"`
	ItemCount int    `json:"item_count"`
	Size      int64  `json:"size"`
	Modified  int64  `json:"modified,omitempty"`
	Created   int64  `json:"created,omitempty"`
}

func fillEntryTimestamps(item *dirEntry, info os.FileInfo) {
	if info == nil || info.IsDir() {
		return
	}
	item.Modified = info.ModTime().Unix()
	if created, ok := fileCreatedUnix(info); ok {
		item.Created = created
	}
}

func (s *workdirScanner) listEntries(rel string) ([]dirEntry, error) {
	absDir, err := s.absDir(rel)
	if err != nil {
		return nil, err
	}
	entries, err := os.ReadDir(absDir)
	if err != nil {
		return nil, err
	}

	parentRel := canonicalRelPath(rel)
	out := make([]dirEntry, 0, len(entries))
	for _, entry := range entries {
		name := entry.Name()
		childRel := name
		if parentRel != "" {
			childRel = parentRel + "/" + name
		}
		isDir := entry.IsDir()
		if s.shouldSkipName(name, childRel, isDir) {
			continue
		}

		item := dirEntry{
			Name:  name,
			Path:  childRel,
			IsDir: isDir,
		}
		if isDir {
			count, err := s.countFilesRecursive(childRel)
			if err != nil {
				return nil, err
			}
			item.ItemCount = count
		} else {
			info, err := entry.Info()
			if err != nil {
				return nil, err
			}
			item.Size = info.Size()
			fillEntryTimestamps(&item, info)
		}
		out = append(out, item)
	}

	sort.Slice(out, func(i, j int) bool {
		if out[i].IsDir != out[j].IsDir {
			return out[i].IsDir
		}
		return strings.ToLower(out[i].Name) < strings.ToLower(out[j].Name)
	})
	return out, nil
}

func (s *workdirScanner) listAllFiles() ([]dirEntry, error) {
	out := make([]dirEntry, 0, 256)
	err := filepath.Walk(s.repoPath, func(path string, fi os.FileInfo, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		relPath, err := filepath.Rel(s.repoPath, path)
		if err != nil {
			return err
		}
		relPath = filepath.ToSlash(relPath)
		if relPath == "." {
			return nil
		}
		isDir := fi.IsDir()
		if s.shouldSkipName(fi.Name(), relPath, isDir) {
			if isDir {
				return filepath.SkipDir
			}
			return nil
		}
		if isDir {
			return nil
		}
		item := dirEntry{
			Name:  fi.Name(),
			Path:  relPath,
			IsDir: false,
			Size:  fi.Size(),
		}
		fillEntryTimestamps(&item, fi)
		out = append(out, item)
		return nil
	})
	if err != nil {
		return nil, err
	}
	sort.Slice(out, func(i, j int) bool {
		return strings.ToLower(out[i].Path) < strings.ToLower(out[j].Path)
	})
	return out, nil
}

func (s *workdirScanner) treeNode(rel string, depth int) (folderNode, error) {
	rel = canonicalRelPath(rel)
	absDir, err := s.absDir(rel)
	if err != nil {
		return folderNode{}, err
	}
	name := filepath.Base(absDir)
	if rel == "" {
		name = filepath.Base(s.repoPath)
	}
	itemCount, err := s.countFilesRecursive(rel)
	if err != nil {
		return folderNode{}, err
	}
	children, err := s.listFolderChildren(rel, depth)
	if err != nil {
		return folderNode{}, err
	}
	if children == nil {
		children = []folderNode{}
	}
	return folderNode{
		Name:      name,
		Path:      rel,
		ItemCount: itemCount,
		Children:  children,
	}, nil
}

func (s *workdirScanner) search(query string, limit int) ([]dirEntry, bool, error) {
	query = strings.ToLower(strings.TrimSpace(query))
	if query == "" {
		return []dirEntry{}, false, nil
	}
	if limit <= 0 {
		limit = 200
	}

	results := make([]dirEntry, 0, limit)
	capped := false
	err := filepath.Walk(s.repoPath, func(path string, fi os.FileInfo, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if len(results) >= limit {
			capped = true
			return filepath.SkipAll
		}

		relPath, err := filepath.Rel(s.repoPath, path)
		if err != nil {
			return err
		}
		relPath = filepath.ToSlash(relPath)
		if relPath == "." {
			return nil
		}

		isDir := fi.IsDir()
		if s.shouldSkipName(fi.Name(), relPath, isDir) {
			if isDir {
				return filepath.SkipDir
			}
			return nil
		}

		if !strings.Contains(strings.ToLower(fi.Name()), query) {
			return nil
		}

		item := dirEntry{
			Name:  fi.Name(),
			Path:  relPath,
			IsDir: isDir,
		}
		if isDir {
			count, err := s.countFilesRecursive(relPath)
			if err != nil {
				return err
			}
			item.ItemCount = count
		} else {
			item.Size = fi.Size()
			fillEntryTimestamps(&item, fi)
		}
		results = append(results, item)
		return nil
	})
	if err != nil {
		return nil, false, err
	}

	sort.Slice(results, func(i, j int) bool {
		if results[i].IsDir != results[j].IsDir {
			return results[i].IsDir
		}
		return strings.ToLower(results[i].Name) < strings.ToLower(results[j].Name)
	})
	return results, capped, nil
}

func (s *workdirScanner) entriesForPaths(paths []string) ([]dirEntry, error) {
	out := make([]dirEntry, 0, len(paths))
	for _, rel := range paths {
		rel = canonicalRelPath(rel)
		abs, err := s.absFile(rel)
		if err != nil {
			return nil, err
		}
		info, err := os.Stat(abs)
		if err != nil {
			if os.IsNotExist(err) {
				continue
			}
			return nil, err
		}
		if info.IsDir() {
			continue
		}
		item := dirEntry{
			Name:  info.Name(),
			Path:  rel,
			IsDir: false,
			Size:  info.Size(),
		}
		fillEntryTimestamps(&item, info)
		out = append(out, item)
	}
	return out, nil
}
