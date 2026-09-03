package main

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"

	"github.com/difference-machine/forester/pkg/jsonapi"
	"github.com/fsnotify/fsnotify"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	appName          = "Difference Machine"
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
	watcher    *fsnotify.Watcher
	watchStop  chan struct{}
	gcStop     chan struct{}
	gcBusy     atomic.Bool
}

// SessionInfo is the bootstrap payload for the React shell.
type SessionInfo struct {
	Shell        string `json:"shell"`
	RepoPath     string `json:"repoPath"`
	Locale       string `json:"locale"`
	Theme        string `json:"theme"`
	UserName     string `json:"userName"`
	UserEmail    string `json:"userEmail"`
	Platform     string `json:"platform"`
	IsRepository bool   `json:"isRepository"`
	Error        string `json:"error,omitempty"`
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	defer a.applyWindowTitle()
	a.startGCScheduler()
	cfg, err := loadSetupCfg()
	if err == nil {
		a.applyWindowTheme(cfg.Theme)
	} else {
		a.applyWindowTheme("light")
	}
	a.applyMenuLocale()
	if err != nil {
		return
	}
	repos, err := loadRepoState()
	if err != nil {
		return
	}
	path := repos.Current
	if path == "" || !isForesterRepo(path) {
		return
	}
	a.openLocked(path)
	applyAppWindowSize(ctx)
	a.applyMenuLocale()
}

func (a *App) beforeClose(ctx context.Context) bool {
	a.ctx = ctx
	a.saveAppWindowSize()
	return false
}

func (a *App) shutdown(_ context.Context) {
	a.stopGCScheduler()
	a.saveAppWindowSize()
	a.mu.Lock()
	defer a.mu.Unlock()
	a.closeLocked()
}

// GetSession returns cfg + current Forester session for the first paint.
func (a *App) GetSession() SessionInfo {
	cfg, err := loadSetupCfg()
	info := SessionInfo{
		Shell:     "first-start",
		Locale:    "en",
		Theme:     "light",
		UserName:  "",
		UserEmail: "",
		Platform:  hostPlatform(),
	}
	if err == nil {
		info.Locale = cfg.Locale
		info.Theme = normalizeTheme(cfg.Theme)
		info.UserName = cfg.UserName
		info.UserEmail = cfg.UserEmail
		a.applyWindowTheme(info.Theme)
	}
	if repos, err := loadRepoState(); err == nil {
		info.RepoPath = repos.Current
	}
	a.mu.Lock()
	if a.hasSession && a.workPath != "" {
		info.RepoPath = a.workPath
		info.IsRepository = true
		info.Shell = "app"
	} else if info.RepoPath != "" && isForesterRepo(info.RepoPath) {
		a.openLocked(info.RepoPath)
		info.IsRepository = true
		info.Shell = "app"
	}
	a.mu.Unlock()
	a.applyWindowTitle()
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
	a.applyMenuLocale()
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
	a.applyMenuLocale()
	return a.GetSession()
}

// CleanRepository deletes `.DFM/` of the open folder. Project files stay on disk.
func (a *App) CleanRepository() SessionInfo {
	a.mu.Lock()
	path := a.workPath
	if !a.hasSession || path == "" {
		a.mu.Unlock()
		return sessionError("no open repository")
	}
	a.stopWatchLocked()
	jsonapi.Close(a.handle)
	a.hasSession = false
	a.handle = 0
	a.mu.Unlock()

	if err := os.RemoveAll(filepath.Join(path, ".DFM")); err != nil {
		return sessionError(err.Error())
	}

	info := SessionInfo{
		Shell:        "app",
		RepoPath:     path,
		Locale:       "en",
		Theme:        "light",
		Platform:     hostPlatform(),
		IsRepository: false,
	}
	if cfg, err := loadSetupCfg(); err == nil {
		info.Locale = cfg.Locale
		info.Theme = normalizeTheme(cfg.Theme)
		info.UserName = cfg.UserName
		info.UserEmail = cfg.UserEmail
		a.applyWindowTheme(info.Theme)
	}
	a.applyMenuLocale()
	a.applyWindowTitle()
	return info
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
	err := updateSetupCfg(func(cfg *setupCfg) {
		cfg.Locale = locale
	})
	if err != nil {
		return err
	}
	a.applyMenuLocale()
	return nil
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
	UserName           string   `json:"userName"`
	UserEmail          string   `json:"userEmail"`
	Locale             string   `json:"locale"`
	Theme              string   `json:"theme"`
	Repos              []string `json:"repos"`
	APIPath            string   `json:"apiPath"`
	ForesterPath       string   `json:"foresterPath"`
	BlenderPath        string   `json:"blenderPath"`
	AddonPath          string   `json:"addonPath"`
	Editors            []string `json:"editors"`
	Platform           string   `json:"platform"`
	HasRepository      bool     `json:"hasRepository"`
	GCEnabled          bool     `json:"gcEnabled"`
	GCReflogExpireDays int      `json:"gcReflogExpireDays"`
	GCScheduleEnabled  bool     `json:"gcScheduleEnabled"`
	GCIntervalDays     int      `json:"gcIntervalDays"`
	GCScheduleHour     int      `json:"gcScheduleHour"`
	GCScheduleMinute   int      `json:"gcScheduleMinute"`
}

// GCRunResult is the payload after gc.run.
type GCRunResult struct {
	CommitsDeleted int   `json:"commitsDeleted"`
	TreesDeleted   int   `json:"treesDeleted"`
	BlobsDeleted   int   `json:"blobsDeleted"`
	LastRun        int64 `json:"lastRun"`
}

func settingsFromCfg(cfg setupCfg, repos repoState) SettingsInfo {
	list := knownRepos(repos)
	if list == nil {
		list = []string{}
	}
	editors := cfg.Editors
	if editors == nil {
		editors = []string{}
	}
	locale := cfg.Locale
	if locale != "ru" {
		locale = "en"
	}
	reflogDays := cfg.GCReflogExpireDays
	if reflogDays == 0 {
		reflogDays = gcReflogDaysDefault
	}
	intervalDays := cfg.GCIntervalDays
	if intervalDays == 0 {
		intervalDays = gcIntervalDaysDefault
	}
	return SettingsInfo{
		UserName:           cfg.UserName,
		UserEmail:          cfg.UserEmail,
		Locale:             locale,
		Theme:              normalizeTheme(cfg.Theme),
		Repos:              list,
		APIPath:            cfg.APIPath,
		ForesterPath:       cfg.ForesterPath,
		BlenderPath:        cfg.BlenderPath,
		AddonPath:          cfg.AddonPath,
		Editors:            editors,
		Platform:           hostPlatform(),
		GCEnabled:          cfg.GCEnabled,
		GCReflogExpireDays: reflogDays,
		GCScheduleEnabled:  cfg.GCScheduleEnabled,
		GCIntervalDays:     intervalDays,
		GCScheduleHour:     cfg.GCScheduleHour,
		GCScheduleMinute:   cfg.GCScheduleMinute,
	}
}

// GetSettings returns author, repos, editors, and Forester paths from cfg files.
func (a *App) GetSettings() (SettingsInfo, error) {
	cfg, err := loadSetupCfg()
	if err != nil {
		return SettingsInfo{}, err
	}
	repos, err := loadRepoState()
	if err != nil {
		return SettingsInfo{}, err
	}
	info := settingsFromCfg(cfg, repos)
	a.mu.Lock()
	info.HasRepository = a.hasSession
	a.mu.Unlock()
	return info, nil
}

// SaveProfile writes [user] name/email and [ui] language.
func (a *App) SaveProfile(name, email, locale string) error {
	if locale != "en" && locale != "ru" {
		locale = "en"
	}
	err := updateSetupCfg(func(cfg *setupCfg) {
		cfg.UserName = strings.TrimSpace(name)
		cfg.UserEmail = strings.TrimSpace(email)
		cfg.Locale = locale
	})
	if err != nil {
		return err
	}
	a.applyMenuLocale()
	return nil
}

// SaveRepos writes ~/.dfm/repos.cfg. Does not delete .DFM/ on disk.
// An empty list clears [current repo] and returns the window to First Start.
func (a *App) SaveRepos(paths []string) error {
	if err := saveRepoList(paths); err != nil {
		return err
	}
	state, err := loadRepoState()
	if err != nil {
		return err
	}
	if state.Current == "" && len(knownRepos(state)) == 0 {
		a.leaveToFirstStart()
		return nil
	}
	a.applyMenuLocale()
	return nil
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

// SaveGC writes [gc] keys from Settings → Garbage collection.
func (a *App) SaveGC(enabled bool, reflogExpireDays int, scheduleEnabled bool, intervalDays, hour, minute int) error {
	return updateSetupCfg(func(cfg *setupCfg) {
		cfg.GCEnabled = enabled
		cfg.GCReflogExpireDays = reflogExpireDays
		cfg.GCScheduleEnabled = scheduleEnabled
		cfg.GCIntervalDays = intervalDays
		cfg.GCScheduleHour = hour
		cfg.GCScheduleMinute = minute
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
	return cleanPickedPath(path)
}

// SelectApplication opens a native application picker for the host OS.
// macOS: .app under /Applications. Windows: .exe. Linux: binaries under /usr/bin.
func (a *App) SelectApplication() (string, error) {
	path, err := runtime.OpenFileDialog(a.ctx, applicationDialogOptions(hostPlatform()))
	if err != nil || path == "" {
		return "", err
	}
	return cleanPickedPath(path)
}

func cleanPickedPath(path string) (string, error) {
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
	a.startWatchLocked()
}

func (a *App) closeLocked() {
	a.stopWatchLocked()
	if a.hasSession {
		jsonapi.Close(a.handle)
		a.hasSession = false
		a.handle = 0
		a.workPath = ""
	}
}

func applyAppWindowSize(ctx context.Context) {
	curW, curH := runtime.WindowGetSize(ctx)
	runtime.WindowSetMinSize(ctx, appMinWidth, appMinHeight)
	if curW >= appMinWidth && curH >= appMinHeight {
		return
	}
	w, h := loadAppWindowSize()
	runtime.WindowSetSize(ctx, w, h)
}

func applyFirstStartWindowSize(ctx context.Context) {
	if ctx == nil {
		return
	}
	runtime.WindowUnmaximise(ctx)
	runtime.WindowSetMinSize(ctx, firstStartWidth, firstStartHeight)
	runtime.WindowSetSize(ctx, firstStartWidth, firstStartHeight)
}

func (a *App) leaveToFirstStart() {
	a.saveAppWindowSize()
	a.mu.Lock()
	a.closeLocked()
	a.mu.Unlock()
	applyFirstStartWindowSize(a.ctx)
	a.applyWindowTitle()
	a.applyMenuLocale()
	if a.ctx == nil {
		return
	}
	runtime.EventsEmit(a.ctx, eventSessionChanged, a.GetSession())
}

func loadAppWindowSize() (int, int) {
	if cfg, err := loadSetupCfg(); err == nil {
		return resolveAppWindowSize(cfg.WindowWidth, cfg.WindowHeight)
	}
	return appWidth, appHeight
}

func resolveAppWindowSize(w, h int) (int, int) {
	if w < appMinWidth || h < appMinHeight {
		return appWidth, appHeight
	}
	return w, h
}

func (a *App) saveAppWindowSize() {
	if a.ctx == nil {
		return
	}
	w, h := runtime.WindowGetSize(a.ctx)
	if w < appMinWidth || h < appMinHeight {
		return
	}
	_ = updateSetupCfg(func(cfg *setupCfg) {
		cfg.WindowWidth = w
		cfg.WindowHeight = h
	})
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

func (a *App) applyWindowTheme(theme string) {
	if a.ctx == nil {
		return
	}
	if normalizeTheme(theme) == "dark" {
		runtime.WindowSetDarkTheme(a.ctx)
		return
	}
	runtime.WindowSetLightTheme(a.ctx)
}

func (a *App) applyWindowTitle() {
	if a.ctx == nil {
		return
	}
	a.mu.Lock()
	path := a.workPath
	a.mu.Unlock()
	runtime.WindowSetTitle(a.ctx, windowTitle(path))
}

func windowTitle(repoAbs string) string {
	repoAbs = strings.TrimSpace(repoAbs)
	if repoAbs == "" {
		return appName
	}
	name := filepath.Base(filepath.Clean(repoAbs))
	if name == "" || name == "." || name == string(filepath.Separator) {
		return appName
	}
	return appName + " (" + name + ")"
}

func normalizeTheme(theme string) string {
	if theme == "dark" {
		return "dark"
	}
	return "light"
}

// SetTheme persists UI theme (light|dark) in setup.cfg and updates the native window chrome.
func (a *App) SetTheme(theme string) error {
	theme = normalizeTheme(theme)
	err := updateSetupCfg(func(cfg *setupCfg) {
		cfg.Theme = theme
	})
	if err != nil {
		return err
	}
	a.applyWindowTheme(theme)
	return nil
}

func sessionError(msg string) SessionInfo {
	info := SessionInfo{Shell: "first-start", Locale: "en", Theme: "light", Platform: hostPlatform(), Error: msg}
	if cfg, err := loadSetupCfg(); err == nil {
		info.Locale = cfg.Locale
		info.Theme = normalizeTheme(cfg.Theme)
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
