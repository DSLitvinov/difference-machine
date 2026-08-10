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
	_ = ext

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

	scale := fmt.Sprintf("scale=%d:%d:force_original_aspect_ratio=decrease", maxThumbnailEdge, maxThumbnailEdge)
	cmd := exec.Command(
		ffmpeg,
		"-nostdin", "-hide_banner", "-loglevel", "error",
		"-i", abs,
		"-vf", scale,
		"-frames:v", "1",
		"-f", "image2pipe",
		"-vcodec", "png",
		"pipe:1",
	)
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
