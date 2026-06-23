package jsonapi

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"unicode/utf8"

	"github.com/difference-machine/forester/internal/core"
)

const (
	maxThumbnailBytes   = 5 * 1024 * 1024
	maxTextPreviewBytes = 32 * 1024
	maxTextPreviewRunes = 2000
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

func handleWorkdirThumbnail(workPath string, args json.RawMessage) (interface{}, error) {
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

		mime := guessMime(rel)
		ext := strings.ToLower(filepath.Ext(rel))

		if isImageExt(ext) {
			if info.Size() > maxThumbnailBytes {
				return map[string]interface{}{
					"kind": "placeholder",
					"mime": mime,
				}, nil
			}
			raw, err := os.ReadFile(abs)
			if err != nil {
				return nil, err
			}
			return map[string]interface{}{
				"kind":            "image",
				"mime":            mime,
				"content_base64":  base64.StdEncoding.EncodeToString(raw),
			}, nil
		}

		if isTextExt(ext) && info.Size() <= maxTextPreviewBytes {
			raw, err := os.ReadFile(abs)
			if err != nil {
				return nil, err
			}
			if !utf8.Valid(raw) {
				return map[string]interface{}{
					"kind": "placeholder",
					"mime": mime,
				}, nil
			}
			text := string(raw)
			if utf8.RuneCountInString(text) > maxTextPreviewRunes {
				runes := []rune(text)
				text = string(runes[:maxTextPreviewRunes])
			}
			return map[string]interface{}{
				"kind":         "text",
				"mime":         mime,
				"text_preview": text,
			}, nil
		}

		return map[string]interface{}{
			"kind": "placeholder",
			"mime": mime,
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

func handleWorkdirSearch(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		Query string `json:"query"`
		Limit int    `json:"limit"`
	}
	if err := decodeArgs(args, &params); err != nil {
		return nil, err
	}
	limit := params.Limit
	if limit <= 0 {
		limit = 200
	}

	return withRepo(workPath, func(_ *core.Repository, repoPath string) (interface{}, error) {
		scanner := newWorkdirScanner(repoPath)
		entries, capped, err := scanner.search(params.Query, limit)
		if err != nil {
			return nil, fmt.Errorf("workdir.search: %w", err)
		}
		if entries == nil {
			entries = []dirEntry{}
		}
		return map[string]interface{}{
			"entries": entries,
			"total":   len(entries),
			"capped":  capped,
		}, nil
	})
}

func isImageExt(ext string) bool {
	switch ext {
	case ".png", ".jpg", ".jpeg", ".gif", ".webp", ".exr", ".tiff", ".tif", ".bmp":
		return true
	default:
		return false
	}
}

func isTextExt(ext string) bool {
	switch ext {
	case ".txt", ".md", ".json", ".xml", ".svg", ".tsx", ".ts", ".js", ".jsx", ".go", ".py", ".rs", ".css", ".html", ".yaml", ".yml", ".ini", ".cfg", ".sh":
		return true
	default:
		return false
	}
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
