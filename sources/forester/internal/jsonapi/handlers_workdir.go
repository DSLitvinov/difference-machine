package jsonapi

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/difference-machine/forester/internal/core"
)

func handleWorkdirTree(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		Path  string `json:"path"`
		Depth int    `json:"depth"`
	}
	_ = decodeArgs(args, &params)
	depth := params.Depth
	if depth <= 0 {
		depth = 1
	}

	return withRepo(workPath, func(_ *core.Repository, repoPath string) (interface{}, error) {
		scanner := newWorkdirScanner(repoPath)
		node, err := scanner.treeNode(params.Path, depth)
		if err != nil {
			return nil, fmt.Errorf("workdir.tree: %w", err)
		}
		return node, nil
	})
}

func handleWorkdirEntries(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		Path   string `json:"path"`
		Offset int    `json:"offset"`
		Limit  int    `json:"limit"`
	}
	_ = decodeArgs(args, &params)
	limit := params.Limit
	if limit <= 0 {
		limit = 200
	}
	offset := params.Offset
	if offset < 0 {
		offset = 0
	}

	return withRepo(workPath, func(_ *core.Repository, repoPath string) (interface{}, error) {
		scanner := newWorkdirScanner(repoPath)
		all, err := scanner.listEntries(params.Path)
		if err != nil {
			return nil, fmt.Errorf("workdir.entries: %w", err)
		}
		total := len(all)
		if offset > total {
			offset = total
		}
		end := offset + limit
		if end > total {
			end = total
		}
		page := all[offset:end]
		if page == nil {
			page = []dirEntry{}
		}
		return map[string]interface{}{
			"entries":  page,
			"total":    total,
			"has_more": end < total,
		}, nil
	})
}

// handleWorkdirMetadata returns file stat and mime type for Content Info (stub mime).
func handleWorkdirMetadata(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		Path string `json:"path"`
	}
	if err := decodeArgs(args, &params); err != nil {
		return nil, err
	}
	if params.Path == "" {
		return nil, fmt.Errorf("path is required")
	}

	return withRepo(workPath, func(_ *core.Repository, repoPath string) (interface{}, error) {
		rel := canonicalRelPath(params.Path)
		abs := filepath.Join(repoPath, filepath.FromSlash(rel))
		info, err := os.Stat(abs)
		if err != nil {
			return nil, err
		}
		return map[string]interface{}{
			"path":       rel,
			"size":       info.Size(),
			"modified":   info.ModTime().Unix(),
			"mime":       guessMime(rel),
			"is_dir":     info.IsDir(),
		}, nil
	})
}

func handleWorkdirOpen(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		Path string `json:"path"`
	}
	if err := decodeArgs(args, &params); err != nil {
		return nil, err
	}
	if params.Path == "" {
		return nil, fmt.Errorf("path is required")
	}

	return withRepo(workPath, func(_ *core.Repository, repoPath string) (interface{}, error) {
		rel := canonicalRelPath(params.Path)
		abs := filepath.Join(repoPath, filepath.FromSlash(rel))
		info, err := os.Stat(abs)
		if err != nil {
			return nil, err
		}
		if info.IsDir() {
			return nil, fmt.Errorf("path is a directory")
		}
		if err := openWithOSDefault(abs); err != nil {
			return nil, fmt.Errorf("workdir.open: %w", err)
		}
		return successResult(), nil
	})
}

func guessMime(rel string) string {
	lower := rel
	if idx := len(rel) - 1; idx >= 0 {
		for i := len(rel) - 1; i >= 0; i-- {
			if rel[i] == '.' {
				lower = rel[i:]
				break
			}
		}
	}
	switch lower {
	case ".png":
		return "image/png"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".gif":
		return "image/gif"
	case ".webp":
		return "image/webp"
	case ".blend":
		return "application/x-blender"
	case ".txt", ".md", ".json", ".xml", ".tsx", ".ts", ".go", ".py":
		return "text/plain"
	default:
		return "application/octet-stream"
	}
}
