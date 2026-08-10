package jsonapi

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

func ffmpegBinaryName() string {
	if runtime.GOOS == "windows" {
		return "ffmpeg.exe"
	}
	return "ffmpeg"
}

func resolveFFmpegPath() (string, error) {
	if env := strings.TrimSpace(os.Getenv("DFM_FFMPEG_PATH")); env != "" {
		if path, err := validateFFmpegBinary(env); err == nil {
			return path, nil
		}
	}

	for _, candidate := range ffmpegCandidatePaths() {
		if path, err := validateFFmpegBinary(candidate); err == nil {
			return path, nil
		}
	}

	if path, err := exec.LookPath("ffmpeg"); err == nil {
		return path, nil
	}

	return "", fmt.Errorf("ffmpeg not found (set DFM_FFMPEG_PATH or install bundled binary in bin/)")
}

func ffmpegCandidatePaths() []string {
	name := ffmpegBinaryName()
	var paths []string

	if cfgPath := ffmpegPathFromSetupCfg(); cfgPath != "" {
		paths = append(paths, cfgPath)
	}

	if exe, err := os.Executable(); err == nil {
		dir := filepath.Clean(filepath.Dir(exe))
		for i := 0; i < 4; i++ {
			paths = append(paths,
				filepath.Join(dir, name),
				filepath.Join(dir, "bin", name),
			)
			parent := filepath.Dir(dir)
			if parent == dir {
				break
			}
			dir = parent
		}
	}

	return paths
}

func ffmpegPathFromSetupCfg() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	configPath := filepath.Join(home, ".dfm", "setup.cfg")
	values, err := readSetupCfgSection(configPath, "forester")
	if err != nil {
		return ""
	}
	if path := strings.TrimSpace(values["ffmpeg_path"]); path != "" {
		return sanitizeConfigValue(path)
	}
	if foresterPath := sanitizeConfigValue(values["path"]); foresterPath != "" {
		return filepath.Join(filepath.Dir(foresterPath), ffmpegBinaryName())
	}
	return ""
}

func readSetupCfgSection(configPath, section string) (map[string]string, error) {
	file, err := os.Open(configPath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	out := make(map[string]string)
	current := ""
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") || strings.HasPrefix(line, ";") {
			continue
		}
		if strings.HasPrefix(line, "[") && strings.HasSuffix(line, "]") {
			current = line[1 : len(line)-1]
			continue
		}
		if current != section {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.TrimSpace(parts[0])
		value := strings.Trim(strings.TrimSpace(parts[1]), `"`)
		out[key] = value
	}
	if err := scanner.Err(); err != nil {
		return nil, err
	}
	return out, nil
}

func validateFFmpegBinary(path string) (string, error) {
	path = strings.TrimSpace(path)
	if path == "" {
		return "", fmt.Errorf("empty ffmpeg path")
	}
	abs, err := filepath.Abs(path)
	if err != nil {
		return "", err
	}
	info, err := os.Stat(abs)
	if err != nil {
		return "", err
	}
	if info.IsDir() {
		return "", fmt.Errorf("ffmpeg path is a directory")
	}
	return abs, nil
}
