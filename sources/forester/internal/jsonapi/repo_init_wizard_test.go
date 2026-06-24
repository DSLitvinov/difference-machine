package jsonapi_test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestRepoInitWithAuthorAndDfmignore(t *testing.T) {
	dir := t.TempDir()
	h := openRepo(t, dir)

	mustOK(t, h, "repo.init", `{"author":"Wizard User","dfmignore":"# wizard\n*.cache\n"}`)

	configBytes, err := os.ReadFile(filepath.Join(dir, ".DFM", "config"))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(configBytes), "name = Wizard User") {
		t.Fatalf("config missing author: %s", configBytes)
	}

	ignoreBytes, err := os.ReadFile(filepath.Join(dir, ".dfmignore"))
	if err != nil {
		t.Fatal(err)
	}
	if string(ignoreBytes) != "# wizard\n*.cache\n" {
		t.Fatalf("dfmignore = %q", string(ignoreBytes))
	}

	var branches struct {
		Branches []struct {
			Name      string `json:"name"`
			IsCurrent bool   `json:"is_current"`
		} `json:"branches"`
	}
	if err := json.Unmarshal(mustOK(t, h, "branch.list", `{}`), &branches); err != nil {
		t.Fatalf("decode branch.list: %v", err)
	}
	if len(branches.Branches) != 1 || branches.Branches[0].Name != "main" {
		t.Fatalf("branches = %+v", branches.Branches)
	}
}
