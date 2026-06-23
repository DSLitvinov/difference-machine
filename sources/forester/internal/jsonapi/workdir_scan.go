package jsonapi

import (
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
	p := filepath.ToSlash(strings.TrimSpace(path))
	p = strings.TrimPrefix(p, "./")
	return strings.Trim(p, "/")
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

func (s *workdirScanner) shouldSkipName(name string, rel string, isDir bool) bool {
	if name == ".DFM" {
		return true
	}
	rel = filepath.ToSlash(rel)
	if rel == ".DFM" || strings.HasPrefix(rel, ".DFM/") {
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
