package jsonapi_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"testing"

	"github.com/difference-machine/forester/internal/jsonapi"
)

func parseOK(data []byte) error {
	var resp struct {
		OK    bool   `json:"ok"`
		Error string `json:"error"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return err
	}
	if !resp.OK {
		return fmt.Errorf("%s", resp.Error)
	}
	return nil
}

func TestRunCLIStatusGet(t *testing.T) {
	dir := t.TempDir()
	h := jsonapi.Open(dir)
	initResp := jsonapi.Call(h, "repo.init", "{}")
	jsonapi.Close(h)

	var init struct {
		OK bool `json:"ok"`
	}
	if err := json.Unmarshal(initResp, &init); err != nil || !init.OK {
		t.Fatalf("repo init failed")
	}

	oldStdout := os.Stdout
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatalf("pipe: %v", err)
	}
	os.Stdout = w

	err = jsonapi.RunCLI([]string{"-C", dir, "status.get"})

	w.Close()
	os.Stdout = oldStdout

	if err != nil {
		t.Fatalf("RunCLI: %v", err)
	}

	var buf bytes.Buffer
	_, _ = buf.ReadFrom(r)
	var resp struct {
		OK     bool `json:"ok"`
		Result struct {
			CurrentBranch string `json:"current_branch"`
		} `json:"result"`
	}
	if err := json.Unmarshal(buf.Bytes(), &resp); err != nil {
		t.Fatalf("decode stdout: %v (%q)", err, buf.String())
	}
	if !resp.OK || resp.Result.CurrentBranch == "" {
		t.Fatalf("unexpected response: %s", buf.String())
	}

	dfmPath := filepath.Join(dir, ".DFM")
	if _, err := os.Stat(dfmPath); err != nil {
		t.Fatalf(".DFM missing: %v", err)
	}
}
