package install

import (
	"os"
	"path/filepath"
	"runtime"
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
	if path, ok := DetectFFmpegPath(); ok {
		_ = os.Setenv("DFM_FFMPEG_PATH", path)
	}
}
