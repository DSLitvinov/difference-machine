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
		OK    bool   `json:"ok"`
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

func TestCallStashList(t *testing.T) {
	dir := t.TempDir()
	h := jsonapi.Open(dir)
	defer jsonapi.Close(h)

	initResp := jsonapi.Call(h, "repo.init", "{}")
	var initPayload struct {
		OK    bool   `json:"ok"`
		Error string `json:"error"`
	}
	if err := json.Unmarshal(initResp, &initPayload); err != nil {
		t.Fatalf("init response: %v", err)
	}
	if !initPayload.OK {
		t.Fatalf("repo.init failed: %s", initPayload.Error)
	}

	emptyResp := jsonapi.Call(h, "stash.list", "{}")
	var emptyPayload struct {
		OK     bool   `json:"ok"`
		Error  string `json:"error"`
		Result struct {
			Stashes []struct {
				Hash      string `json:"hash"`
				Message   string `json:"message"`
				TreeHash  string `json:"tree_hash"`
				CreatedAt int64  `json:"created_at"`
			} `json:"stashes"`
		} `json:"result"`
	}
	if err := json.Unmarshal(emptyResp, &emptyPayload); err != nil {
		t.Fatalf("empty stash.list: %v", err)
	}
	if !emptyPayload.OK {
		t.Fatalf("stash.list failed: %s", emptyPayload.Error)
	}
	if len(emptyPayload.Result.Stashes) != 0 {
		t.Fatalf("expected empty stash list, got %d", len(emptyPayload.Result.Stashes))
	}

	hash := "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
	treeHash := "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
	stashDir := filepath.Join(dir, ".DFM", "stash")
	if err := os.MkdirAll(stashDir, 0o755); err != nil {
		t.Fatalf("mkdir stash: %v", err)
	}
	body := []byte(`{"hash":"` + hash + `","message":"WIP on main","tree_hash":"` + treeHash + `","created_at":1700000000}`)
	if err := os.WriteFile(filepath.Join(stashDir, hash+".json"), body, 0o644); err != nil {
		t.Fatalf("write stash: %v", err)
	}

	listResp := jsonapi.Call(h, "stash.list", "{}")
	var listPayload struct {
		OK     bool   `json:"ok"`
		Error  string `json:"error"`
		Result struct {
			Stashes []struct {
				Hash      string `json:"hash"`
				Message   string `json:"message"`
				TreeHash  string `json:"tree_hash"`
				CreatedAt int64  `json:"created_at"`
			} `json:"stashes"`
		} `json:"result"`
	}
	if err := json.Unmarshal(listResp, &listPayload); err != nil {
		t.Fatalf("stash.list: %v", err)
	}
	if !listPayload.OK {
		t.Fatalf("stash.list failed: %s", listPayload.Error)
	}
	if len(listPayload.Result.Stashes) != 1 {
		t.Fatalf("expected 1 stash, got %d", len(listPayload.Result.Stashes))
	}
	got := listPayload.Result.Stashes[0]
	if got.Hash != hash || got.Message != "WIP on main" || got.TreeHash != treeHash || got.CreatedAt != 1700000000 {
		t.Fatalf("unexpected stash: %+v", got)
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
