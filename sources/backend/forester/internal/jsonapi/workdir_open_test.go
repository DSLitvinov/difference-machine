package jsonapi_test

import (
	"os"
	"path/filepath"
	"testing"
)

func TestWorkdirOpenAllowsTmpReview(t *testing.T) {
	dir, h := initTestRepo(t)
	tmpReview := filepath.Join(dir, ".DFM", "tmp_review")
	if err := os.MkdirAll(tmpReview, 0o755); err != nil {
		t.Fatal(err)
	}
	blendPath := filepath.Join(tmpReview, "scene.blend")
	if err := os.WriteFile(blendPath, []byte("blend"), 0o644); err != nil {
		t.Fatal(err)
	}

	mustOK(t, h, "workdir.open", `{"path":".DFM/tmp_review"}`)
	mustOK(t, h, "workdir.open", `{"path":".DFM/tmp_review/scene.blend"}`)
	mustOK(t, h, "workdir.open", `{"path":".DFM\\tmp_review\\scene.blend"}`)
}

func TestWorkdirOpenStillRejectsOtherDFMPaths(t *testing.T) {
	dir, h := initTestRepo(t)
	configPath := filepath.Join(dir, ".DFM", "config")
	if err := os.WriteFile(configPath, []byte("cfg"), 0o644); err != nil {
		t.Fatal(err)
	}

	mustFail(t, h, "workdir.open", `{"path":".DFM/config"}`)
}
