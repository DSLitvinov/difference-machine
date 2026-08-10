package jsonapi_test

import (
	"testing"

	"github.com/difference-machine/forester/internal/jsonapi"
)

func TestRunCLIParsesFlagsAfterMethod(t *testing.T) {
	dir := t.TempDir()
	h := jsonapi.Open(dir)
	resp := jsonapi.Call(h, "repo.init", "{}")
	jsonapi.Close(h)

	if err := parseOK(resp); err != nil {
		t.Fatalf("init: %v", err)
	}

	if err := jsonapi.RunCLI([]string{"status.get", "-C", dir}); err != nil {
		t.Fatalf("flags after method: %v", err)
	}
}

func TestRunCLIParsesFlagsBeforeMethod(t *testing.T) {
	dir := t.TempDir()
	h := jsonapi.Open(dir)
	resp := jsonapi.Call(h, "repo.init", "{}")
	jsonapi.Close(h)

	if err := parseOK(resp); err != nil {
		t.Fatalf("init: %v", err)
	}

	if err := jsonapi.RunCLI([]string{"-C", dir, "status.get"}); err != nil {
		t.Fatalf("flags before method: %v", err)
	}
}
