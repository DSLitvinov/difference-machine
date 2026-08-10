package jsonapi

import (
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"os"
	"path/filepath"
	"strings"
)

func imageDimensions(abs string, ext string) (width int, height int, ok bool) {
	if !isImageExt(ext) {
		return 0, 0, false
	}

	file, err := os.Open(abs)
	if err != nil {
		return 0, 0, false
	}
	defer file.Close()

	cfg, _, err := image.DecodeConfig(file)
	if err != nil {
		return 0, 0, false
	}
	if cfg.Width <= 0 || cfg.Height <= 0 {
		return 0, 0, false
	}
	return cfg.Width, cfg.Height, true
}

func imageExtFromRel(rel string) string {
	return strings.ToLower(filepath.Ext(rel))
}
