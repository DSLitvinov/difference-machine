package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/difference-machine/forester/pkg/jsonapi"
	"github.com/difference-machine/gui/internal/config"
	"github.com/difference-machine/gui/internal/forester"
	"github.com/difference-machine/gui/internal/paths"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App is the Wails binding surface for the Forester GUI.
type App struct {
	ctx    context.Context
	cfg    *config.Store
	client *forester.Client
}

// RepoState is returned to the frontend after open/switch.
type RepoState struct {
	RepoPath string `json:"repoPath"`
	RepoName string `json:"repoName"`
	Status   string `json:"status"`
}

// NewApp creates a new App application struct.
func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	store, err := config.NewStore()
	if err != nil {
		runtime.LogErrorf(ctx, "config: %v", err)
		return
	}
	a.cfg = store

	current := store.CurrentRepoPath()
	if current == "" {
		return
	}
	if _, err := a.openRepo(current, false); err != nil {
		runtime.LogWarningf(ctx, "auto-open repo: %v", err)
	}
}

func (a *App) shutdown(ctx context.Context) {
	if a.client != nil {
		a.client.Close()
	}
}

// ForesterCall executes a jsonapi method on the open repository.
func (a *App) ForesterCall(method string, argsJSON string) (string, error) {
	if a.client == nil {
		return "", fmt.Errorf("no repository open")
	}
	resp, err := a.client.Call(method, argsJSON)
	if err != nil {
		return "", err
	}
	raw, err := json.Marshal(resp)
	if err != nil {
		return "", err
	}
	return string(raw), nil
}

// GetKnownRepos returns registered repository paths.
func (a *App) GetKnownRepos() ([]string, error) {
	if a.cfg == nil {
		return nil, fmt.Errorf("config not loaded")
	}
	return a.cfg.KnownRepos()
}

// GetCurrentRepoPath returns the last opened repository path.
func (a *App) GetCurrentRepoPath() (string, error) {
	if a.cfg == nil {
		return "", fmt.Errorf("config not loaded")
	}
	return a.cfg.CurrentRepoPath(), nil
}

// GetRepoUser returns the configured author name.
func (a *App) GetRepoUser() (string, error) {
	if a.cfg == nil {
		return "", fmt.Errorf("config not loaded")
	}
	return a.cfg.UserName(), nil
}

// SetRepoUser updates the author name in setup.cfg.
func (a *App) SetRepoUser(name string) error {
	if a.cfg == nil {
		return fmt.Errorf("config not loaded")
	}
	return a.cfg.SetUserName(name)
}

// AddKnownRepo registers a repository and sets it current.
func (a *App) AddKnownRepo(path string) (*RepoState, error) {
	if a.cfg == nil {
		return nil, fmt.Errorf("config not loaded")
	}
	if err := a.cfg.AddKnownRepo(path); err != nil {
		return nil, err
	}
	return a.openRepo(path, true)
}

// RemoveKnownRepo removes a repository from the known list.
func (a *App) RemoveKnownRepo(path string) error {
	if a.cfg == nil {
		return fmt.Errorf("config not loaded")
	}
	return a.cfg.RemoveKnownRepo(path)
}

// OpenRepo opens a known or new repository path.
func (a *App) OpenRepo(path string) (*RepoState, error) {
	return a.openRepo(path, true)
}

// PickRepositoryFolder opens a native folder picker.
func (a *App) PickRepositoryFolder() (string, error) {
	if a.ctx == nil {
		return "", fmt.Errorf("application not ready")
	}
	return runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Forester repository",
	})
}

// GetForesterBinaryPath returns the configured forester CLI path.
func (a *App) GetForesterBinaryPath() (string, error) {
	if a.cfg == nil {
		return "", fmt.Errorf("config not loaded")
	}
	return a.cfg.ForesterBinaryPath(), nil
}

// IsForesterRepository reports whether the path contains a .DFM directory.
func (a *App) IsForesterRepository(path string) (bool, error) {
	canonical, err := paths.CanonicalAbsPath(path)
	if err != nil {
		return false, err
	}
	return isForesterRepo(canonical), nil
}

// InitRepository initializes a Forester repository in the given directory.
func (a *App) InitRepository(path string) error {
	canonical, err := paths.CanonicalAbsPath(path)
	if err != nil {
		return err
	}
	info, err := os.Stat(canonical)
	if err != nil {
		return fmt.Errorf("repository not found")
	}
	if !info.IsDir() {
		return fmt.Errorf("path is not a directory")
	}
	if isForesterRepo(canonical) {
		return nil
	}
	raw := jsonapi.CallStateless(canonical, "repo.init", "{}")
	return decodeForesterAPIResponse(raw)
}

func decodeForesterAPIResponse(raw []byte) error {
	var resp struct {
		OK    bool   `json:"ok"`
		Error string `json:"error"`
	}
	if err := json.Unmarshal(raw, &resp); err != nil {
		return err
	}
	if !resp.OK {
		if resp.Error != "" {
			return fmt.Errorf("%s", resp.Error)
		}
		return fmt.Errorf("forester API failed")
	}
	return nil
}

func isForesterRepo(path string) bool {
	info, err := os.Stat(filepath.Join(path, ".DFM"))
	return err == nil && info.IsDir()
}

func (a *App) openRepo(path string, persist bool) (*RepoState, error) {
	canonical, err := paths.CanonicalAbsPath(path)
	if err != nil {
		return nil, err
	}
	if _, err := os.Stat(canonical); err != nil {
		return nil, fmt.Errorf("repository not found")
	}

	if a.client != nil {
		a.client.Close()
		a.client = nil
	}

	client, err := forester.Open(canonical)
	if err != nil {
		return nil, err
	}
	a.client = client

	if persist && a.cfg != nil {
		if err := a.cfg.SetCurrentRepoPath(canonical); err != nil {
			return nil, err
		}
	}

	statusResp, err := client.Call("status.get", "{}")
	if err != nil {
		return nil, err
	}
	if !statusResp.OK {
		if statusResp.Error != "" {
			return nil, fmt.Errorf("%s", statusResp.Error)
		}
		return nil, fmt.Errorf("status.get failed")
	}

	return &RepoState{
		RepoPath: canonical,
		RepoName: paths.Basename(canonical),
		Status:   string(statusResp.Result),
	}, nil
}
