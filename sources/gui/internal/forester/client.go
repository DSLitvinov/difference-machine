package forester

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/difference-machine/forester/pkg/jsonapi"
)

// Response mirrors the jsonapi envelope.
type Response struct {
	OK     bool            `json:"ok"`
	Error  string          `json:"error,omitempty"`
	Result json.RawMessage `json:"result,omitempty"`
}

// Client wraps a jsonapi session for one repository.
type Client struct {
	repoPath string
	handle   jsonapi.Handle
}

// Open validates the repository and opens a jsonapi session.
func Open(repoPath string) (*Client, error) {
	dfmPath := filepath.Join(repoPath, ".DFM")
	if _, err := os.Stat(dfmPath); err != nil {
		if os.IsNotExist(err) {
			return nil, fmt.Errorf("not a Forester repository")
		}
		return nil, err
	}

	handle := jsonapi.Open(repoPath)
	resp := decodeResponse(jsonapi.Call(handle, "status.get", "{}"))
	if !resp.OK {
		jsonapi.Close(handle)
		if resp.Error == "" {
			resp.Error = "failed to open repository"
		}
		return nil, fmt.Errorf("%s", resp.Error)
	}

	return &Client{repoPath: repoPath, handle: handle}, nil
}

// Close releases the jsonapi session.
func (c *Client) Close() {
	if c == nil || c.handle == 0 {
		return
	}
	jsonapi.Close(c.handle)
	c.handle = 0
}

// RepoPath returns the canonical repository root.
func (c *Client) RepoPath() string {
	if c == nil {
		return ""
	}
	return c.repoPath
}

// Call executes a jsonapi method for the open repository.
func (c *Client) Call(method, argsJSON string) (Response, error) {
	if c == nil || c.handle == 0 {
		return Response{}, fmt.Errorf("no repository open")
	}
	if argsJSON == "" {
		argsJSON = "{}"
	}
	return decodeResponse(jsonapi.Call(c.handle, method, argsJSON)), nil
}

func decodeResponse(raw []byte) Response {
	var resp Response
	if err := json.Unmarshal(raw, &resp); err != nil {
		return Response{OK: false, Error: err.Error()}
	}
	return resp
}
