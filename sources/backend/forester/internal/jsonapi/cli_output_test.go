package jsonapi

import (
	"bytes"
	"encoding/json"
	"os"
	"testing"

	"github.com/difference-machine/forester/internal/commands"
)

func TestWithSilencedCLIOutputSuppressesInitMessages(t *testing.T) {
	dir := t.TempDir()
	if err := os.Chdir(dir); err != nil {
		t.Fatalf("chdir: %v", err)
	}
	t.Cleanup(func() {
		_ = os.Chdir(os.TempDir())
	})

	var buf bytes.Buffer
	prevStdout := os.Stdout
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatalf("pipe: %v", err)
	}
	os.Stdout = w

	_, callErr := withSilencedCLIOutput(func() (interface{}, error) {
		if err := commands.Init([]string{}); err != nil {
			return nil, err
		}
		return successResult(), nil
	})

	w.Close()
	os.Stdout = prevStdout
	_, _ = buf.ReadFrom(r)
	_ = r.Close()

	if callErr != nil {
		t.Fatalf("Init via API: %v", callErr)
	}
	if buf.Len() != 0 {
		t.Fatalf("expected no stdout from silenced API call, got %q", buf.String())
	}
}

func TestRepoInitAPIIsQuiet(t *testing.T) {
	dir := t.TempDir()
	h := openRepoHandle(t, dir)

	var buf bytes.Buffer
	prevStdout := os.Stdout
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatalf("pipe: %v", err)
	}
	os.Stdout = w

	raw := Call(h, "repo.init", `{"author":"quiet"}`)
	if !jsonOK(t, raw) {
		t.Fatalf("repo.init failed: %s", string(raw))
	}

	w.Close()
	os.Stdout = prevStdout
	_, _ = buf.ReadFrom(r)
	_ = r.Close()

	if buf.Len() != 0 {
		t.Fatalf("expected quiet repo.init, got stdout: %q", buf.String())
	}
}

func openRepoHandle(t *testing.T, dir string) Handle {
	t.Helper()
	return Open(dir)
}

func jsonOK(t *testing.T, raw []byte) bool {
	t.Helper()
	var resp struct {
		OK bool `json:"ok"`
	}
	if err := json.Unmarshal(raw, &resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	return resp.OK
}
