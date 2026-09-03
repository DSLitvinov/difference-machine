package jsonapi_test

import (
	"encoding/json"
	"testing"
	"github.com/difference-machine/forester/pkg/jsonapi"
)

func TestWorkdirThumbnailPngLive(t *testing.T) {
	repo := "/Users/nopomuk/Documents/test"
	raw := jsonapi.CallStateless(repo, "workdir.thumbnail", `{"path":"image 11.png"}`)
	var resp struct {
		OK bool `json:"ok"`
		Error string `json:"error"`
		Result struct {
			Kind string `json:"kind"`
			ContentBase64 string `json:"content_base64"`
		} `json:"result"`
	}
	json.Unmarshal(raw, &resp)
	if !resp.OK || resp.Result.Kind != "image" || len(resp.Result.ContentBase64) < 100 {
		t.Fatalf("ok=%v err=%q kind=%s len=%d", resp.OK, resp.Error, resp.Result.Kind, len(resp.Result.ContentBase64))
	}
}
