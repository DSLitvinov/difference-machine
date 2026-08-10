package install

import (
	"bufio"
	"os"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/difference-machine/gui/internal/config"
)

// FFmpegBinaryName returns the platform ffmpeg executable file name.
func FFmpegBinaryName() string {
	if runtime.GOOS == "windows" {
		return "ffmpeg.exe"
	}
	return "ffmpeg"
}

// DetectFFmpegPath locates bundled ffmpeg next to the Forester install layout.
func DetectFFmpegPath() (string, bool) {
	if path, ok := ffmpegBesideForesterCLI(); ok {
		return path, true
	}
	return ffmpegNearExecutable()
}

func ffmpegBesideForesterCLI() (string, bool) {
	paths, ok := DetectToolchainPaths()
	if !ok {
		return "", false
	}
	ffmpeg := filepath.Join(filepath.Dir(paths.ForesterCLI), FFmpegBinaryName())
	if st, err := os.Stat(ffmpeg); err == nil && !st.IsDir() {
		return ffmpeg, true
	}
	return "", false
}

func ffmpegNearExecutable() (string, bool) {
	execPath, err := os.Executable()
	if err != nil {
		return "", false
	}
	execPath, err = filepath.EvalSymlinks(execPath)
	if err != nil {
		return "", false
	}

	dir := filepath.Clean(filepath.Dir(execPath))
	name := FFmpegBinaryName()
	for i := 0; i < 4; i++ {
		candidates := []string{
			filepath.Join(dir, name),
			filepath.Join(dir, portableCLIRelative, name),
			filepath.Join(dir, "bin", name),
		}
		for _, candidate := range candidates {
			if st, err := os.Stat(candidate); err == nil && !st.IsDir() {
				return candidate, true
			}
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	return "", false
}

// EnsureFFmpegEnv sets DFM_FFMPEG_PATH when bundled ffmpeg is found.
func EnsureFFmpegEnv() {
	if path := os.Getenv("DFM_FFMPEG_PATH"); path != "" {
		if st, err := os.Stat(path); err == nil && !st.IsDir() {
			return
		}
	}
	if path, ok := ffmpegPathFromSetupCfg(); ok {
		_ = os.Setenv("DFM_FFMPEG_PATH", path)
		return
	}
	if path, ok := DetectFFmpegPath(); ok {
		_ = os.Setenv("DFM_FFMPEG_PATH", path)
		return
	}
	if path, ok := darwinHomebrewFFmpegPath(); ok {
		_ = os.Setenv("DFM_FFMPEG_PATH", path)
	}
}

func darwinHomebrewFFmpegPath() (string, bool) {
	if runtime.GOOS != "darwin" {
		return "", false
	}
	for _, candidate := range []string{
		"/opt/homebrew/bin/ffmpeg",
		"/usr/local/bin/ffmpeg",
	} {
		if st, err := os.Stat(candidate); err == nil && !st.IsDir() {
			return candidate, true
		}
	}
	return "", false
}

// RefreshToolchainFFmpegPath writes forester.ffmpeg_path when ffmpeg sits beside the CLI.
func RefreshToolchainFFmpegPath(store *config.Store) {
	if store == nil {
		return
	}
	if strings.TrimSpace(store.Get("forester", "ffmpeg_path")) != "" {
		return
	}
	cliPath := strings.TrimSpace(store.ForesterBinaryPath())
	if cliPath == "" {
		return
	}
	ffmpegPath := filepath.Join(filepath.Dir(cliPath), FFmpegBinaryName())
	if st, err := os.Stat(ffmpegPath); err != nil || st.IsDir() {
		if path, ok := darwinHomebrewFFmpegPath(); ok {
			ffmpegPath = path
		} else {
			return
		}
	}
	_ = store.SetForesterFFmpegPath(ffmpegPath)
}

func ffmpegPathFromSetupCfg() (string, bool) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", false
	}
	values, err := readSetupCfgSection(filepath.Join(home, ".dfm", "setup.cfg"), "forester")
	if err != nil {
		return "", false
	}
	if path := strings.TrimSpace(values["ffmpeg_path"]); path != "" {
		if st, err := os.Stat(path); err == nil && !st.IsDir() {
			return path, true
		}
	}
	if foresterPath := strings.TrimSpace(values["path"]); foresterPath != "" {
		candidate := filepath.Join(filepath.Dir(foresterPath), FFmpegBinaryName())
		if st, err := os.Stat(candidate); err == nil && !st.IsDir() {
			return candidate, true
		}
	}
	return "", false
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
