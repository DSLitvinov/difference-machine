package install

import (
	"archive/zip"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

const addonZipRelative = "addons/blender/difference_machine.zip"

// resolveAddonDir returns the extracted addon directory, unpacking the DMG zip when needed.
func resolveAddonDir(root string) (string, bool) {
	dir := filepath.Join(root, addonRelative)
	if info, err := os.Stat(dir); err == nil && info.IsDir() {
		return dir, true
	}

	zipPath := filepath.Join(root, addonZipRelative)
	if info, err := os.Stat(zipPath); err != nil || info.IsDir() {
		return "", false
	}

	if err := extractAddonZip(zipPath, filepath.Join(root, "addons", "blender")); err != nil {
		return "", false
	}

	if info, err := os.Stat(dir); err == nil && info.IsDir() {
		return dir, true
	}
	return "", false
}

func extractAddonZip(zipPath, destParent string) error {
	reader, err := zip.OpenReader(zipPath)
	if err != nil {
		return fmt.Errorf("open addon zip: %w", err)
	}
	defer reader.Close()

	if err := os.MkdirAll(destParent, 0o755); err != nil {
		return fmt.Errorf("create addon parent dir: %w", err)
	}

	for _, file := range reader.File {
		target := filepath.Join(destParent, file.Name)
		if !strings.HasPrefix(filepath.Clean(target), filepath.Clean(destParent)+string(os.PathSeparator)) {
			return fmt.Errorf("invalid zip entry path: %s", file.Name)
		}

		if file.FileInfo().IsDir() {
			if err := os.MkdirAll(target, 0o755); err != nil {
				return fmt.Errorf("create dir %s: %w", target, err)
			}
			continue
		}

		if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
			return fmt.Errorf("create parent for %s: %w", target, err)
		}

		if err := extractZipFile(file, target); err != nil {
			return err
		}
	}

	manifest := filepath.Join(destParent, "difference_machine", "blender_manifest.toml")
	if _, err := os.Stat(manifest); err != nil {
		return fmt.Errorf("addon zip missing blender_manifest.toml after extract")
	}
	return nil
}

func extractZipFile(file *zip.File, target string) error {
	src, err := file.Open()
	if err != nil {
		return fmt.Errorf("open zip entry %s: %w", file.Name, err)
	}
	defer src.Close()

	mode := file.Mode()
	if mode == 0 {
		mode = 0o644
	}

	dst, err := os.OpenFile(target, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, mode)
	if err != nil {
		return fmt.Errorf("create %s: %w", target, err)
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		return fmt.Errorf("extract %s: %w", target, err)
	}
	return nil
}
