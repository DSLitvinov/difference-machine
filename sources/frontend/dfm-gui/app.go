package main

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/difference-machine/forester/pkg/jsonapi"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	firstStartWidth  = 640
	firstStartHeight = 656
	appWidth         = 1429
	appHeight        = 768
	appMinWidth      = 1024
	appMinHeight     = 640
)

// App is the Wails backend: window, setup.cfg, Forester session.
type App struct {
	ctx        context.Context
	mu         sync.Mutex
	handle     jsonapi.Handle
	hasSession bool
	workPath   string
}

// SessionInfo is the bootstrap payload for the React shell.
type SessionInfo struct {
	Shell          string `json:"shell"`
	RepoPath       string `json:"repoPath"`
	Locale         string `json:"locale"`
	UserName       string `json:"userName"`
	UserEmail      string `json:"userEmail"`
	IsRepository   bool   `json:"isRepository"`
	Error          string `json:"error,omitempty"`
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	cfg, err := loadSetupCfg()
	if err != nil {
		return
	}
	path := cfg.CurrentRepo
	if path == "" || !isForesterRepo(path) {
		return
	}
	a.openLocked(path)
	applyAppWindowSize(ctx)
}

func (a *App) shutdown(_ context.Context) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.closeLocked()
}

// GetSession returns cfg + current Forester session for the first paint.
func (a *App) GetSession() SessionInfo {
	cfg, err := loadSetupCfg()
	info := SessionInfo{
		Shell:    "first-start",
		Locale:   "en",
		UserName: "",
		UserEmail: "",
	}
	if err == nil {
		info.Locale = cfg.Locale
		info.UserName = cfg.UserName
		info.UserEmail = cfg.UserEmail
		info.RepoPath = cfg.CurrentRepo
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.hasSession && a.workPath != "" {
		info.RepoPath = a.workPath
		info.IsRepository = true
		info.Shell = "app"
	} else if info.RepoPath != "" && isForesterRepo(info.RepoPath) {
		a.openLocked(info.RepoPath)
		info.IsRepository = true
		info.Shell = "app"
	}
	return info
}

// SelectDirectory opens a native folder picker and returns an absolute path.
func (a *App) SelectDirectory() (string, error) {
	path, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title:                "Select folder",
		CanCreateDirectories: true,
	})
	if err != nil || path == "" {
		return "", err
	}
	abs, err := filepath.Abs(path)
	if err != nil {
		return "", err
	}
	return filepath.Clean(abs), nil
}

// InitRepository creates .DFM/ in absPath, records cfg, and opens a session.
func (a *App) InitRepository(absPath string) SessionInfo {
	absPath, err := cleanAbs(absPath)
	if err != nil {
		return sessionError(err.Error())
	}
	cfg, _ := loadSetupCfg()
	args := map[string]string{}
	if cfg.UserName != "" {
		args["author"] = cfg.UserName
	}
	rawArgs, _ := json.Marshal(args)
	env := jsonapi.CallStateless(absPath, "repo.init", string(rawArgs))
	if errMsg := envelopeError(env); errMsg != "" {
		return sessionError(errMsg)
	}
	if err := rememberRepo(absPath); err != nil {
		return sessionError(err.Error())
	}
	a.mu.Lock()
	a.closeLocked()
	a.openLocked(absPath)
	a.mu.Unlock()
	applyAppWindowSize(a.ctx)
	return a.GetSession()
}

// OpenRepository binds a session to an existing Forester root.
func (a *App) OpenRepository(absPath string) SessionInfo {
	absPath, err := cleanAbs(absPath)
	if err != nil {
		return sessionError(err.Error())
	}
	if !isForesterRepo(absPath) {
		return sessionError("not a Forester repository")
	}
	if err := rememberRepo(absPath); err != nil {
		return sessionError(err.Error())
	}
	a.mu.Lock()
	a.closeLocked()
	a.openLocked(absPath)
	a.mu.Unlock()
	applyAppWindowSize(a.ctx)
	return a.GetSession()
}

// ForesterCall dispatches a JSON API method on the open session.
func (a *App) ForesterCall(method, argsJSON string) string {
	a.mu.Lock()
	defer a.mu.Unlock()
	if !a.hasSession {
		return `{"ok":false,"error":"invalid session handle"}`
	}
	if argsJSON == "" {
		argsJSON = "{}"
	}
	return string(jsonapi.Call(a.handle, method, argsJSON))
}

// SetLocale persists UI language in setup.cfg.
func (a *App) SetLocale(locale string) error {
	if locale != "en" && locale != "ru" {
		locale = "en"
	}
	return updateSetupCfg(func(cfg *setupCfg) {
		cfg.Locale = locale
	})
}

// WindowMinimise hides the window (same as Window menu hide).
func (a *App) WindowMinimise() {
	runtime.WindowMinimise(a.ctx)
}

// WindowToggleMaximise restores or maximises the window.
func (a *App) WindowToggleMaximise() {
	runtime.WindowToggleMaximise(a.ctx)
}

// WindowClose quits the application.
func (a *App) WindowClose() {
	runtime.Quit(a.ctx)
}

// SettingsInfo is the setup.cfg payload for Dialog / Settings.
type SettingsInfo struct {
	UserName     string   `json:"userName"`
	UserEmail    string   `json:"userEmail"`
	Locale       string   `json:"locale"`
	Theme        string   `json:"theme"`
	Repos        []string `json:"repos"`
	APIPath      string   `json:"apiPath"`
	ForesterPath string   `json:"foresterPath"`
	BlenderPath  string   `json:"blenderPath"`
	AddonPath    string   `json:"addonPath"`
	Editors      []string `json:"editors"`
}

func settingsFromCfg(cfg setupCfg) SettingsInfo {
	repos := cfg.Repos
	if repos == nil {
		repos = []string{}
	}
	editors := cfg.Editors
	if editors == nil {
		editors = []string{}
	}
	theme := cfg.Theme
	if theme != "dark" {
		theme = "light"
	}
	locale := cfg.Locale
	if locale != "ru" {
		locale = "en"
	}
	return SettingsInfo{
		UserName:     cfg.UserName,
		UserEmail:    cfg.UserEmail,
		Locale:       locale,
		Theme:        theme,
		Repos:        repos,
		APIPath:      cfg.APIPath,
		ForesterPath: cfg.ForesterPath,
		BlenderPath:  cfg.BlenderPath,
		AddonPath:    cfg.AddonPath,
		Editors:      editors,
	}
}

// GetSettings returns author, repos, editors, and Forester paths from setup.cfg.
func (a *App) GetSettings() (SettingsInfo, error) {
	cfg, err := loadSetupCfg()
	if err != nil {
		return SettingsInfo{}, err
	}
	return settingsFromCfg(cfg), nil
}

// SaveProfile writes [user] name/email and [ui] language.
func (a *App) SaveProfile(name, email, locale string) error {
	if locale != "en" && locale != "ru" {
		locale = "en"
	}
	return updateSetupCfg(func(cfg *setupCfg) {
		cfg.UserName = strings.TrimSpace(name)
		cfg.UserEmail = strings.TrimSpace(email)
		cfg.Locale = locale
	})
}

// SaveAppearance writes [ui] theme. Dark tokens are not applied until a Figma dark set exists.
func (a *App) SaveAppearance(theme string) error {
	if theme != "dark" {
		theme = "light"
	}
	return updateSetupCfg(func(cfg *setupCfg) {
		cfg.Theme = theme
	})
}

// SaveRepos writes [repo] path_N. Does not delete .DFM/ on disk.
func (a *App) SaveRepos(paths []string) error {
	return updateSetupCfg(func(cfg *setupCfg) {
		cfg.Repos = compactPaths(paths)
	})
}

// SaveForester writes [api] path (native library) and [forester] path (CLI).
func (a *App) SaveForester(apiPath, cliPath string) error {
	return updateSetupCfg(func(cfg *setupCfg) {
		cfg.APIPath = strings.TrimSpace(apiPath)
		cfg.ForesterPath = strings.TrimSpace(cliPath)
	})
}

// SaveEditors writes [blender] path, [addons] diffmachine_path, and [editors] path_N.
func (a *App) SaveEditors(blenderPath, addonPath string, others []string) error {
	return updateSetupCfg(func(cfg *setupCfg) {
		cfg.BlenderPath = strings.TrimSpace(blenderPath)
		cfg.AddonPath = strings.TrimSpace(addonPath)
		cfg.Editors = compactPaths(others)
	})
}

// SelectFile opens a native file picker and returns an absolute path.
func (a *App) SelectFile() (string, error) {
	path, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select file",
	})
	if err != nil || path == "" {
		return "", err
	}
	abs, err := filepath.Abs(path)
	if err != nil {
		return "", err
	}
	return filepath.Clean(abs), nil
}

func (a *App) openLocked(absPath string) {
	a.handle = jsonapi.Open(absPath)
	a.hasSession = true
	a.workPath = absPath
}

func (a *App) closeLocked() {
	if a.hasSession {
		jsonapi.Close(a.handle)
		a.hasSession = false
		a.handle = 0
		a.workPath = ""
	}
}

func applyAppWindowSize(ctx context.Context) {
	runtime.WindowSetMinSize(ctx, appMinWidth, appMinHeight)
	runtime.WindowSetSize(ctx, appWidth, appHeight)
}

func cleanAbs(path string) (string, error) {
	abs, err := filepath.Abs(path)
	if err != nil {
		return "", err
	}
	return filepath.Clean(abs), nil
}

func isForesterRepo(absPath string) bool {
	info, err := os.Stat(filepath.Join(absPath, ".DFM"))
	return err == nil && info.IsDir()
}

func sessionError(msg string) SessionInfo {
	info := SessionInfo{Shell: "first-start", Locale: "en", Error: msg}
	if cfg, err := loadSetupCfg(); err == nil {
		info.Locale = cfg.Locale
		info.UserName = cfg.UserName
		info.UserEmail = cfg.UserEmail
	}
	return info
}

func envelopeError(raw []byte) string {
	var env struct {
		OK    bool   `json:"ok"`
		Error string `json:"error"`
	}
	if err := json.Unmarshal(raw, &env); err != nil {
		return err.Error()
	}
	if env.OK {
		return ""
	}
	if env.Error == "" {
		return "request failed"
	}
	return env.Error
}

func compactPaths(paths []string) []string {
	out := make([]string, 0, len(paths))
	for _, p := range paths {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		out = append(out, p)
	}
	return out
}
