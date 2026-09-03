package main

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
)

const (
	gcReflogDaysDefault     = 90
	gcIntervalDaysDefault   = 7
	gcScheduleHourDefault   = 7
	gcScheduleMinuteDefault = 0
	gcReflogDaysMin         = 1
	gcReflogDaysMax         = 3650
	gcIntervalDaysMin       = 1
	gcIntervalDaysMax       = 365
	gcHourMin               = 0
	gcHourMax               = 23
	gcMinuteMin             = 0
	gcMinuteMax             = 59
)

type setupCfg struct {
	UserName           string
	UserEmail          string
	Locale             string
	Theme              string
	WindowWidth        int
	WindowHeight       int
	ForesterPath       string
	APIPath            string
	AddonPath          string
	BlenderPath        string
	Editors            []string
	GCEnabled          bool
	GCReflogExpireDays int
	GCScheduleEnabled  bool
	GCIntervalDays     int
	GCScheduleHour     int
	GCScheduleMinute   int
	GCLastRun          int64
	raw                map[string]map[string]string
}

type repoState struct {
	Current string
	Repos   []string
}

func dfmDir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".dfm"), nil
}

func setupCfgPath() (string, error) {
	dir, err := dfmDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "setup.cfg"), nil
}

func reposCfgPath() (string, error) {
	dir, err := dfmDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "repos.cfg"), nil
}

func loadSetupCfg() (setupCfg, error) {
	cfg := setupCfg{
		Locale:             "en",
		Theme:              "light",
		GCReflogExpireDays: gcReflogDaysDefault,
		GCIntervalDays:     gcIntervalDaysDefault,
		GCScheduleHour:     gcScheduleHourDefault,
		GCScheduleMinute:   gcScheduleMinuteDefault,
		raw:                map[string]map[string]string{},
	}
	path, err := setupCfgPath()
	if err != nil {
		return cfg, err
	}
	raw, err := parseIniFile(path)
	if err != nil {
		return cfg, err
	}
	if raw == nil {
		return cfg, nil
	}
	cfg.raw = raw
	applySetupSections(&cfg)
	return cfg, nil
}

func applySetupSections(cfg *setupCfg) {
	if user := cfg.raw["user"]; user != nil {
		cfg.UserName = user["name"]
		cfg.UserEmail = user["email"]
	}
	if ui := cfg.raw["ui"]; ui != nil {
		if ui["language"] == "ru" {
			cfg.Locale = "ru"
		}
		if ui["theme"] == "dark" {
			cfg.Theme = "dark"
		} else {
			cfg.Theme = "light"
		}
		cfg.WindowWidth = parsePositiveInt(ui["window_width"])
		cfg.WindowHeight = parsePositiveInt(ui["window_height"])
	}
	if ed := cfg.raw["editors"]; ed != nil {
		cfg.Editors = loadPathList(ed)
	}
	if f := cfg.raw["forester"]; f != nil {
		cfg.ForesterPath = f["path"]
	}
	if a := cfg.raw["api"]; a != nil {
		cfg.APIPath = a["path"]
	}
	if ad := cfg.raw["addons"]; ad != nil {
		cfg.AddonPath = ad["diffmachine_path"]
	}
	if b := cfg.raw["blender"]; b != nil {
		cfg.BlenderPath = b["path"]
	}
	applyGCSection(cfg)
}

func applyGCSection(cfg *setupCfg) {
	cfg.GCEnabled = false
	cfg.GCScheduleEnabled = false
	cfg.GCReflogExpireDays = gcReflogDaysDefault
	cfg.GCIntervalDays = gcIntervalDaysDefault
	cfg.GCScheduleHour = gcScheduleHourDefault
	cfg.GCScheduleMinute = gcScheduleMinuteDefault
	cfg.GCLastRun = 0
	gc := cfg.raw["gc"]
	if gc == nil {
		return
	}
	cfg.GCEnabled = parseCfgBool(gc["enabled"])
	if _, ok := gc["schedule.enabled"]; ok {
		cfg.GCScheduleEnabled = parseCfgBool(gc["schedule.enabled"])
	} else {
		cfg.GCScheduleEnabled = cfg.GCEnabled
	}
	cfg.GCReflogExpireDays = parseIntInRange(gc["reflog.expire.days"], gcReflogDaysDefault, gcReflogDaysMin, gcReflogDaysMax)
	cfg.GCIntervalDays = parseIntInRange(gc["interval.day"], gcIntervalDaysDefault, gcIntervalDaysMin, gcIntervalDaysMax)
	cfg.GCScheduleHour = parseIntInRange(gc["schedule.hour"], gcScheduleHourDefault, gcHourMin, gcHourMax)
	cfg.GCScheduleMinute = parseIntInRange(gc["schedule.minute"], gcScheduleMinuteDefault, gcMinuteMin, gcMinuteMax)
	if n, err := strconv.ParseInt(strings.TrimSpace(gc["last.run"]), 10, 64); err == nil && n > 0 {
		cfg.GCLastRun = n
	}
}

func parseIniFile(path string) (map[string]map[string]string, error) {
	f, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	defer f.Close()

	raw := map[string]map[string]string{}
	section := ""
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") || strings.HasPrefix(line, ";") {
			continue
		}
		if strings.HasPrefix(line, "[") && strings.HasSuffix(line, "]") {
			section = strings.TrimSpace(line[1 : len(line)-1])
			if _, ok := raw[section]; !ok {
				raw[section] = map[string]string{}
			}
			continue
		}
		key, value, ok := strings.Cut(line, "=")
		if !ok || section == "" {
			continue
		}
		key = strings.TrimSpace(key)
		value = strings.Trim(strings.TrimSpace(value), `"`)
		if raw[section] == nil {
			raw[section] = map[string]string{}
		}
		raw[section][key] = value
	}
	if err := sc.Err(); err != nil {
		return nil, err
	}
	return raw, nil
}

func updateSetupCfg(mut func(*setupCfg)) error {
	cfg, err := loadSetupCfg()
	if err != nil {
		return err
	}
	mut(&cfg)
	return writeSetupCfg(cfg)
}

func rememberRepo(absPath string) error {
	state, err := loadRepoState()
	if err != nil {
		return err
	}
	state.Current = absPath
	state.Repos = uniquePaths(append([]string{absPath}, state.Repos...))
	return writeRepoState(state)
}

func saveRepoList(paths []string) error {
	state, err := loadRepoState()
	if err != nil {
		return err
	}
	state.Repos = compactPaths(paths)
	if len(state.Repos) == 0 {
		// Allow an empty list: knownRepos would otherwise re-insert [current repo].
		state.Current = ""
	} else {
		state.Repos = knownRepos(state)
	}
	return writeRepoState(state)
}

func loadRepoState() (repoState, error) {
	path, err := reposCfgPath()
	if err != nil {
		return repoState{}, err
	}
	raw, err := parseIniFile(path)
	if err != nil {
		return repoState{}, err
	}
	if raw != nil {
		return repoStateFromRaw(raw), nil
	}
	cfg, err := loadSetupCfg()
	if err != nil {
		return repoState{}, err
	}
	state := repoStateFromSetup(cfg)
	if state.Current == "" && len(state.Repos) == 0 {
		return state, nil
	}
	if err := writeRepoState(state); err != nil {
		return state, err
	}
	if err := writeSetupCfg(cfg); err != nil {
		return state, err
	}
	return state, nil
}

func repoStateFromRaw(raw map[string]map[string]string) repoState {
	state := repoState{}
	if cur := raw["current repo"]; cur != nil {
		state.Current = strings.TrimSpace(cur["path"])
	}
	if repo := raw["repo"]; repo != nil {
		state.Repos = loadPathList(repo)
	}
	state.Repos = knownRepos(state)
	return state
}

func repoStateFromSetup(cfg setupCfg) repoState {
	return repoStateFromRaw(cfg.raw)
}

func writeRepoState(state repoState) error {
	path, err := reposCfgPath()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	state.Repos = knownRepos(state)
	var b strings.Builder
	if state.Current != "" {
		fmt.Fprintf(&b, "[current repo]\npath = %s\n\n", state.Current)
	}
	if len(state.Repos) > 0 {
		fmt.Fprintf(&b, "[repo]\n")
		for i, p := range state.Repos {
			if p == "" {
				continue
			}
			fmt.Fprintf(&b, "path_%d = %s\n", i+1, p)
		}
		b.WriteByte('\n')
	}
	return writeAtomic(path, []byte(b.String()))
}

func writeSetupCfg(cfg setupCfg) error {
	path, err := setupCfgPath()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	if cfg.raw == nil {
		cfg.raw = map[string]map[string]string{}
	}
	legacy := repoStateFromSetup(cfg)
	delete(cfg.raw, "current repo")
	delete(cfg.raw, "repo")
	if reposPath, err := reposCfgPath(); err == nil {
		if _, err := os.Stat(reposPath); os.IsNotExist(err) && (legacy.Current != "" || len(legacy.Repos) > 0) {
			if err := writeRepoState(legacy); err != nil {
				return err
			}
		}
	}
	setSection(cfg.raw, "user", "name", cfg.UserName)
	setSection(cfg.raw, "user", "email", cfg.UserEmail)
	setSection(cfg.raw, "ui", "language", cfg.Locale)
	theme := cfg.Theme
	if theme != "dark" {
		theme = "light"
	}
	setSection(cfg.raw, "ui", "theme", theme)
	windowW, windowH := "", ""
	if cfg.WindowWidth >= appMinWidth && cfg.WindowHeight >= appMinHeight {
		windowW = strconv.Itoa(cfg.WindowWidth)
		windowH = strconv.Itoa(cfg.WindowHeight)
	}
	setSection(cfg.raw, "ui", "window_width", windowW)
	setSection(cfg.raw, "ui", "window_height", windowH)
	setSection(cfg.raw, "forester", "path", cfg.ForesterPath)
	setSection(cfg.raw, "api", "path", cfg.APIPath)
	setSection(cfg.raw, "addons", "diffmachine_path", cfg.AddonPath)
	setSection(cfg.raw, "blender", "path", cfg.BlenderPath)
	writeGCSection(&cfg)

	editors := map[string]string{}
	for i, p := range cfg.Editors {
		editors["path_"+strconv.Itoa(i+1)] = p
	}
	cfg.raw["editors"] = editors

	order := []string{"user", "ui", "forester", "api", "addons", "blender", "editors", "gc", "python_bindings", "plugins"}
	seen := map[string]bool{}
	var b strings.Builder
	writeSection := func(name string) {
		if name == "current repo" || name == "repo" {
			return
		}
		keys := cfg.raw[name]
		if len(keys) == 0 {
			return
		}
		seen[name] = true
		fmt.Fprintf(&b, "[%s]\n", name)
		if name == "editors" {
			for i := 1; i <= len(cfg.Editors); i++ {
				p := cfg.Editors[i-1]
				if p == "" {
					continue
				}
				fmt.Fprintf(&b, "path_%d = %s\n", i, p)
			}
		} else {
			for k, v := range keys {
				if v == "" {
					continue
				}
				fmt.Fprintf(&b, "%s = %s\n", k, v)
			}
		}
		b.WriteByte('\n')
	}
	for _, name := range order {
		writeSection(name)
	}
	for name := range cfg.raw {
		if !seen[name] {
			writeSection(name)
		}
	}
	return writeAtomic(path, []byte(b.String()))
}

func writeAtomic(path string, data []byte) error {
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, data, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

func loadPathList(section map[string]string) []string {
	var keys []string
	if p := strings.TrimSpace(section["path"]); p != "" {
		keys = append(keys, p)
	}
	for i := 1; i < 1024; i++ {
		p := strings.TrimSpace(section["path_"+strconv.Itoa(i)])
		if p == "" {
			continue
		}
		keys = append(keys, p)
	}
	return uniquePaths(keys)
}

func knownRepos(state repoState) []string {
	return uniquePaths(append([]string{state.Current}, state.Repos...))
}

func uniquePaths(paths []string) []string {
	seen := map[string]bool{}
	var out []string
	for _, p := range paths {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		key := filepath.Clean(p)
		if runtime.GOOS == "windows" {
			key = strings.ToLower(key)
		}
		if seen[key] {
			continue
		}
		seen[key] = true
		out = append(out, p)
	}
	return out
}

func parsePositiveInt(s string) int {
	n, err := strconv.Atoi(strings.TrimSpace(s))
	if err != nil || n <= 0 {
		return 0
	}
	return n
}

func parseIntInRange(s string, def, min, max int) int {
	s = strings.TrimSpace(s)
	if s == "" {
		return def
	}
	n, err := strconv.Atoi(s)
	if err != nil {
		return def
	}
	return clampInt(n, min, max, def)
}

func clampInt(n, min, max, fallback int) int {
	if min > max {
		return fallback
	}
	if n < min {
		return min
	}
	if n > max {
		return max
	}
	return n
}

func parseCfgBool(s string) bool {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "1", "true", "yes", "on":
		return true
	default:
		return false
	}
}

func writeGCSection(cfg *setupCfg) {
	if cfg.GCReflogExpireDays == 0 {
		cfg.GCReflogExpireDays = gcReflogDaysDefault
	}
	if cfg.GCIntervalDays == 0 {
		cfg.GCIntervalDays = gcIntervalDaysDefault
	}
	cfg.GCReflogExpireDays = clampInt(cfg.GCReflogExpireDays, gcReflogDaysMin, gcReflogDaysMax, gcReflogDaysDefault)
	cfg.GCIntervalDays = clampInt(cfg.GCIntervalDays, gcIntervalDaysMin, gcIntervalDaysMax, gcIntervalDaysDefault)
	cfg.GCScheduleHour = clampInt(cfg.GCScheduleHour, gcHourMin, gcHourMax, gcScheduleHourDefault)
	cfg.GCScheduleMinute = clampInt(cfg.GCScheduleMinute, gcMinuteMin, gcMinuteMax, gcScheduleMinuteDefault)
	enabled := "false"
	if cfg.GCEnabled {
		enabled = "true"
	}
	scheduleEnabled := "false"
	if cfg.GCScheduleEnabled {
		scheduleEnabled = "true"
	}
	setSection(cfg.raw, "gc", "enabled", enabled)
	setSection(cfg.raw, "gc", "reflog.expire.days", strconv.Itoa(cfg.GCReflogExpireDays))
	setSection(cfg.raw, "gc", "schedule.enabled", scheduleEnabled)
	setSection(cfg.raw, "gc", "interval.day", strconv.Itoa(cfg.GCIntervalDays))
	setSection(cfg.raw, "gc", "schedule.hour", strconv.Itoa(cfg.GCScheduleHour))
	setSection(cfg.raw, "gc", "schedule.minute", strconv.Itoa(cfg.GCScheduleMinute))
	lastRun := ""
	if cfg.GCLastRun > 0 {
		lastRun = strconv.FormatInt(cfg.GCLastRun, 10)
	}
	setSection(cfg.raw, "gc", "last.run", lastRun)
}

func setSection(raw map[string]map[string]string, section, key, value string) {
	if raw[section] == nil {
		raw[section] = map[string]string{}
	}
	if value == "" {
		delete(raw[section], key)
		return
	}
	raw[section][key] = value
}

func samePath(a, b string) bool {
	a = filepath.Clean(a)
	b = filepath.Clean(b)
	if runtime.GOOS == "windows" {
		return strings.EqualFold(a, b)
	}
	return a == b
}
