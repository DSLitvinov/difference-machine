package main

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
)

func thumbCacheFile(repoAbs, rel string, size, mtime int64) string {
	sum := sha256.Sum256([]byte(fmt.Sprintf("%s:%d:%d", rel, size, mtime)))
	return filepath.Join(repoAbs, ".DFM", "cache", "thumbs", hex.EncodeToString(sum[:])+".png")
}

// ReadThumbCache returns a base64 PNG from .DFM/cache/thumbs, or empty on miss.
func (a *App) ReadThumbCache(relPath string, size, mtime int64) string {
	repoAbs := a.repoAbs()
	if repoAbs == "" || relPath == "" {
		return ""
	}
	raw, err := os.ReadFile(thumbCacheFile(repoAbs, relPath, size, mtime))
	if err != nil || len(raw) == 0 {
		return ""
	}
	return base64.StdEncoding.EncodeToString(raw)
}

// WriteThumbCache stores an ffmpeg PNG under .DFM/cache/thumbs. Blend/text skip this.
func (a *App) WriteThumbCache(relPath string, size, mtime int64, pngBase64 string) error {
	repoAbs := a.repoAbs()
	if repoAbs == "" || relPath == "" || pngBase64 == "" {
		return nil
	}
	raw, err := base64.StdEncoding.DecodeString(pngBase64)
	if err != nil || len(raw) == 0 {
		return err
	}
	path := thumbCacheFile(repoAbs, relPath, size, mtime)
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	return os.WriteFile(path, raw, 0o644)
}

func (a *App) repoAbs() string {
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.workPath
}
