package jsonapi

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

func TestFFmpegPathFromSetupCfg(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	if runtimeHome := os.Getenv("USERPROFILE"); runtimeHome != "" {
		t.Setenv("USERPROFILE", home)
	}

	configDir := filepath.Join(home, ".dfm")
	if err := os.MkdirAll(configDir, 0o755); err != nil {
		t.Fatalf("mkdir config: %v", err)
	}

	cliName := "forester"
	if runtime.GOOS == "windows" {
		cliName = "forester.exe"
	}
	foresterPath := filepath.Join(home, "install", "bin", cliName)
	config := "[forester]\npath = " + foresterPath + "\n"
	if err := os.WriteFile(filepath.Join(configDir, "setup.cfg"), []byte(config), 0o644); err != nil {
		t.Fatalf("write setup.cfg: %v", err)
	}

	got := ffmpegPathFromSetupCfg()
	want := filepath.Join(home, "install", "bin", ffmpegBinaryName())
	if got != want {
		t.Fatalf("ffmpegPathFromSetupCfg() = %q, want %q", got, want)
	}
}
