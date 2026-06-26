package install

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDetectFFmpegNearExecutable(t *testing.T) {
	root := t.TempDir()
	appsDir := filepath.Join(root, "apps")
	binDir := filepath.Join(root, "bin")
	if err := os.MkdirAll(appsDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(binDir, 0o755); err != nil {
		t.Fatal(err)
	}

	name := FFmpegBinaryName()
	gui := filepath.Join(appsDir, "difference-machine.exe")
	ffmpeg := filepath.Join(binDir, name)
	if err := os.WriteFile(gui, []byte{0}, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(ffmpeg, []byte{0}, 0o755); err != nil {
		t.Fatal(err)
	}

	t.Setenv("DFM_FFMPEG_PATH", "")
	got, ok := ffmpegNearExecutableForTest(gui)
	if !ok {
		t.Fatal("expected ffmpeg near executable")
	}
	want, _ := filepath.Abs(ffmpeg)
	if got != want {
		t.Fatalf("ffmpeg path = %q, want %q", got, want)
	}
}

func ffmpegNearExecutableForTest(execPath string) (string, bool) {
	execPath, err := filepath.Abs(execPath)
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
