package jsonapi

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

const (
	maxThumbnailSourceBytes = 64 << 20 // 64 MiB
	maxThumbnailEdge        = 512
	thumbnailFFmpegTimeout  = 60 * time.Second
)

func buildImageThumbnail(abs string, ext string) ([]byte, string, error) {
	if ext == ".svg" {
		info, err := os.Stat(abs)
		if err != nil {
			return nil, "", err
		}
		if info.Size() > maxThumbnailBytes {
			return nil, "", fmt.Errorf("source image too large")
		}
		return readWorkdirImageBytes(abs, ext)
	}
	scale := fmt.Sprintf("scale=%d:%d:force_original_aspect_ratio=decrease", maxThumbnailEdge, maxThumbnailEdge)
	return runFFmpegImage(abs, scale)
}

func readWorkdirImageBytes(abs string, ext string) ([]byte, string, error) {
	if isBrowserRasterExt(ext) || ext == ".svg" {
		raw, err := os.ReadFile(abs)
		if err != nil {
			return nil, "", err
		}
		return raw, guessMime(abs), nil
	}
	return runFFmpegImage(abs, "")
}

func isBrowserRasterExt(ext string) bool {
	switch ext {
	case ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp":
		return true
	default:
		return false
	}
}

func runFFmpegImage(abs string, scaleFilter string) ([]byte, string, error) {
	info, err := os.Stat(abs)
	if err != nil {
		return nil, "", err
	}
	if info.Size() > maxThumbnailSourceBytes {
		return nil, "", fmt.Errorf("source image too large")
	}

	ffmpeg, err := resolveFFmpegPath()
	if err != nil {
		return nil, "", err
	}

	args := []string{"-nostdin", "-hide_banner", "-loglevel", "error", "-i", abs}
	if scaleFilter != "" {
		args = append(args, "-vf", scaleFilter)
	}
	args = append(args, "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "pipe:1")
	cmd := exec.Command(ffmpeg, args...)
	configureHiddenExec(cmd)
	cmd.Dir = filepath.Dir(cmd.Path)
	return runFFmpegThumbnail(cmd)
}

func buildVideoThumbnail(abs string) ([]byte, string, error) {
	scale := fmt.Sprintf("scale=%d:%d:force_original_aspect_ratio=decrease", maxThumbnailEdge, maxThumbnailEdge)
	thumb, mime, err := runFFmpegVideoFrame(abs, scale, "1")
	if err == nil && len(thumb) > 0 {
		return thumb, mime, nil
	}
	return runFFmpegVideoFrame(abs, scale, "")
}

func runFFmpegVideoFrame(abs string, scaleFilter string, seekSeconds string) ([]byte, string, error) {
	if _, err := os.Stat(abs); err != nil {
		return nil, "", err
	}

	ffmpeg, err := resolveFFmpegPath()
	if err != nil {
		return nil, "", err
	}

	args := []string{"-nostdin", "-hide_banner", "-loglevel", "error"}
	if seekSeconds != "" {
		args = append(args, "-ss", seekSeconds)
	}
	args = append(args, "-i", abs)
	if scaleFilter != "" {
		args = append(args, "-vf", scaleFilter)
	}
	args = append(args, "-an", "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "pipe:1")
	cmd := exec.Command(ffmpeg, args...)
	configureHiddenExec(cmd)
	cmd.Dir = filepath.Dir(cmd.Path)
	return runFFmpegThumbnail(cmd)
}

func runFFmpegThumbnail(cmd *exec.Cmd) ([]byte, string, error) {
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if thumbnailFFmpegTimeout > 0 {
		timer := time.AfterFunc(thumbnailFFmpegTimeout, func() {
			if cmd.Process != nil {
				_ = cmd.Process.Kill()
			}
		})
		defer timer.Stop()
	}

	if err := cmd.Run(); err != nil {
		return nil, "", fmt.Errorf("%s: %w (%s)", filepath.Base(cmd.Path), err, strings.TrimSpace(stderr.String()))
	}
	if stdout.Len() == 0 {
		return nil, "", fmt.Errorf("%s: empty output", filepath.Base(cmd.Path))
	}
	return stdout.Bytes(), "image/png", nil
}
