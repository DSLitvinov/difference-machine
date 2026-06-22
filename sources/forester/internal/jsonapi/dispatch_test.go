package jsonapi_test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/difference-machine/forester/internal/jsonapi"
)

func TestCallRepoInitAndStatus(t *testing.T) {
	dir := t.TempDir()
	h := jsonapi.Open(dir)
	defer jsonapi.Close(h)

	initResp := jsonapi.Call(h, "repo.init", "{}")
	var initPayload struct {
		OK    bool `json:"ok"`
		Error string `json:"error"`
	}
	if err := json.Unmarshal(initResp, &initPayload); err != nil {
		t.Fatalf("init response: %v", err)
	}
	if !initPayload.OK {
		t.Fatalf("repo.init failed: %s", initPayload.Error)
	}

	statusResp := jsonapi.Call(h, "status.get", "{}")
	var statusPayload struct {
		OK     bool `json:"ok"`
		Result struct {
			CurrentBranch string `json:"current_branch"`
		} `json:"result"`
	}
	if err := json.Unmarshal(statusResp, &statusPayload); err != nil {
		t.Fatalf("status response: %v", err)
	}
	if !statusPayload.OK {
		t.Fatalf("status.get failed")
	}
	if statusPayload.Result.CurrentBranch == "" {
		t.Fatalf("expected current branch")
	}

	dfmPath := filepath.Join(dir, ".DFM")
	if _, err := os.Stat(dfmPath); err != nil {
		t.Fatalf(".DFM not created: %v", err)
	}
}

func TestCallUnknownMethod(t *testing.T) {
	h := jsonapi.Open(".")
	defer jsonapi.Close(h)

	resp := jsonapi.Call(h, "does.not.exist", "{}")
	var payload struct {
		OK    bool   `json:"ok"`
		Error string `json:"error"`
	}
	if err := json.Unmarshal(resp, &payload); err != nil {
		t.Fatalf("response: %v", err)
	}
	if payload.OK || payload.Error == "" {
		t.Fatalf("expected error for unknown method")
	}
}
