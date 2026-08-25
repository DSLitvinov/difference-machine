package jsonapi

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"unicode/utf8"

	"github.com/difference-machine/forester/internal/core"
)

const (
	maxThumbnailBytes   = 5 * 1024 * 1024
	maxWorkdirFileBytes = 64 * 1024 * 1024
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
		var all []dirEntry
		var err error
		if params.Path == "*" {
			all, err = scanner.listAllFiles()
		} else {
			all, err = scanner.listEntries(params.Path)
		}
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

func handleWorkdirEntriesByPaths(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		Paths []string `json:"paths"`
	}
	if err := decodeArgs(args, &params); err != nil {
		return nil, err
	}

	return withRepo(workPath, func(_ *core.Repository, repoPath string) (interface{}, error) {
		scanner := newWorkdirScanner(repoPath)
		entries, err := scanner.entriesForPaths(params.Paths)
		if err != nil {
			return nil, fmt.Errorf("workdir.entries_by_paths: %w", err)
		}
		if entries == nil {
			entries = []dirEntry{}
		}
		return map[string]interface{}{
			"entries": entries,
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
		scanner := newWorkdirScanner(repoPath)
		rel := canonicalRelPath(params.Path)
		abs, err := scanner.absFile(rel)
		if err != nil {
			return nil, err
		}
		info, err := os.Stat(abs)
		if err != nil {
			return nil, err
		}
		result := map[string]interface{}{
			"path":     rel,
			"size":     info.Size(),
			"modified": info.ModTime().Unix(),
			"mime":     guessMime(rel),
			"is_dir":   info.IsDir(),
		}
		if created, ok := fileCreatedUnix(info); ok {
			result["created"] = created
		}
		if !info.IsDir() {
			if w, h, ok := imageDimensions(abs, imageExtFromRel(rel)); ok {
				result["width"] = w
				result["height"] = h
			}
		}
		return result, nil
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
		scanner := newWorkdirScanner(repoPath)
		rel := canonicalRelPath(params.Path)
		abs, err := scanner.absFile(rel)
		if err != nil {
			return nil, err
		}
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
			if thumb, thumbMime, err := buildImageThumbnail(abs, ext); err == nil && len(thumb) > 0 {
				return map[string]interface{}{
					"kind":           "image",
					"mime":           thumbMime,
					"content_base64": base64.StdEncoding.EncodeToString(thumb),
				}, nil
			}
			return map[string]interface{}{
				"kind": "placeholder",
				"mime": mime,
			}, nil
		}

		if isVideoExt(ext) {
			if thumb, thumbMime, err := buildVideoThumbnail(abs); err == nil && len(thumb) > 0 {
				return map[string]interface{}{
					"kind":           "image",
					"mime":           thumbMime,
					"content_base64": base64.StdEncoding.EncodeToString(thumb),
				}, nil
			}
			return map[string]interface{}{
				"kind": "placeholder",
				"mime": mime,
			}, nil
		}

		if ext == ".blend" {
			if thumb, err := loadBlendThumbnail(abs); err == nil && len(thumb) > 0 {
				return map[string]interface{}{
					"kind":           "image",
					"mime":           "image/png",
					"content_base64": base64.StdEncoding.EncodeToString(thumb),
				}, nil
			}
		}

		if isTextExt(ext) {
			raw, err := readTextPreviewBytes(abs)
			if err != nil {
				return nil, err
			}
			raw = clipUTF8(raw)
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

func handleWorkdirFile(workPath string, args json.RawMessage) (interface{}, error) {
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
		scanner := newWorkdirScanner(repoPath)
		rel := canonicalRelPath(params.Path)
		abs, err := scanner.absFile(rel)
		if err != nil {
			return nil, err
		}
		info, err := os.Stat(abs)
		if err != nil {
			return nil, err
		}
		if info.IsDir() {
			return nil, fmt.Errorf("path is a directory")
		}
		ext := strings.ToLower(filepath.Ext(rel))
		if !isImageExt(ext) {
			return nil, fmt.Errorf("not an image")
		}
		if info.Size() > maxThumbnailSourceBytes {
			return nil, fmt.Errorf("file_too_large")
		}

		raw, mime, err := readWorkdirImageBytes(abs, ext)
		if err != nil {
			return nil, err
		}
		if len(raw) > maxWorkdirFileBytes {
			return nil, fmt.Errorf("file_too_large")
		}
		return map[string]interface{}{
			"content_base64": base64.StdEncoding.EncodeToString(raw),
			"mime":           mime,
			"size":           len(raw),
		}, nil
	})
}

func handleWorkdirOpen(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		Path   string `json:"path"`
		Editor string `json:"editor"`
	}
	if err := decodeArgs(args, &params); err != nil {
		return nil, err
	}

	return withRepo(workPath, func(_ *core.Repository, repoPath string) (interface{}, error) {
		scanner := newWorkdirScanner(repoPath)
		rel := canonicalRelPath(params.Path)
		abs, err := scanner.absOpenPath(rel)
		if err != nil {
			return nil, err
		}
		if params.Editor != "" {
			if err := openWithExecutable(params.Editor, abs); err != nil {
				return nil, fmt.Errorf("workdir.open: %w", err)
			}
		} else if err := openWithOSDefault(abs); err != nil {
			return nil, fmt.Errorf("workdir.open: %w", err)
		}
		return successResult(), nil
	})
}

func handleWorkdirRename(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		Path    string `json:"path"`
		NewName string `json:"new_name"`
	}
	if err := decodeArgs(args, &params); err != nil {
		return nil, err
	}
	if params.Path == "" {
		return nil, fmt.Errorf("path is required")
	}
	newName := strings.TrimSpace(params.NewName)
	if newName == "" {
		return nil, fmt.Errorf("new_name is required")
	}
	if strings.ContainsAny(newName, `/\`) {
		return nil, fmt.Errorf("new_name must not contain path separators")
	}
	if newName == "." || newName == ".." {
		return nil, fmt.Errorf("invalid new_name")
	}

	return withRepo(workPath, func(_ *core.Repository, repoPath string) (interface{}, error) {
		scanner := newWorkdirScanner(repoPath)
		rel := canonicalRelPath(params.Path)
		abs, err := scanner.absFile(rel)
		if err != nil {
			return nil, err
		}
		parentRel := filepath.ToSlash(filepath.Dir(filepath.FromSlash(rel)))
		if parentRel == "." {
			parentRel = ""
		}
		newRel := rel
		if parentRel == "" {
			newRel = newName
		} else {
			newRel = parentRel + "/" + newName
		}
		newAbs, err := scanner.absFilePath(newRel)
		if err != nil {
			return nil, err
		}
		if _, err := os.Stat(newAbs); err == nil {
			return nil, fmt.Errorf("a file already exists at %s", newRel)
		} else if !os.IsNotExist(err) {
			return nil, err
		}
		if err := os.Rename(abs, newAbs); err != nil {
			return nil, fmt.Errorf("workdir.rename: %w", err)
		}
		return map[string]interface{}{
			"success":  true,
			"new_path": newRel,
		}, nil
	})
}

func handleWorkdirDelete(workPath string, args json.RawMessage) (interface{}, error) {
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
		scanner := newWorkdirScanner(repoPath)
		rel := canonicalRelPath(params.Path)
		abs, err := scanner.absFile(rel)
		if err != nil {
			return nil, err
		}
		if err := moveToOSTrash(abs); err != nil {
			return nil, fmt.Errorf("workdir.delete: %w", err)
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

func isVideoExt(ext string) bool {
	switch ext {
	case ".mp4", ".m4v", ".mov", ".webm", ".mkv", ".avi", ".mpg", ".mpeg", ".wmv", ".flv", ".ogv", ".3gp":
		return true
	default:
		return false
	}
}

func isTextExt(ext string) bool {
	switch ext {
	case ".txt", ".md", ".markdown", ".json", ".xml", ".svg", ".tsx", ".ts", ".js", ".jsx", ".mjs", ".cjs",
		".go", ".py", ".rs", ".css", ".html", ".htm", ".yaml", ".yml", ".toml", ".ini", ".cfg", ".sh", ".bash",
		".csv", ".log":
		return true
	default:
		return false
	}
}

func readTextPreviewBytes(abs string) ([]byte, error) {
	f, err := os.Open(abs)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	buf := make([]byte, maxTextPreviewBytes)
	n, err := f.Read(buf)
	if err != nil && err != io.EOF {
		return nil, err
	}
	return buf[:n], nil
}

func clipUTF8(raw []byte) []byte {
	for len(raw) > 0 && !utf8.Valid(raw) {
		raw = raw[:len(raw)-1]
	}
	return raw
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
	case ".bmp":
		return "image/bmp"
	case ".blend":
		return "application/x-blender"
	case ".mp4", ".m4v":
		return "video/mp4"
	case ".mov":
		return "video/quicktime"
	case ".webm":
		return "video/webm"
	case ".mkv":
		return "video/x-matroska"
	case ".avi":
		return "video/x-msvideo"
	case ".txt", ".md", ".json", ".xml", ".tsx", ".ts", ".go", ".py":
		return "text/plain"
	default:
		return "application/octet-stream"
	}
}
