package main

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

type setupCfg struct {
	UserName     string
	UserEmail    string
	CurrentRepo  string
	Repos        []string
	Locale       string
	Theme        string
	ForesterPath string
	APIPath      string
	AddonPath    string
	BlenderPath  string
	Editors      []string
	raw          map[string]map[string]string
}

func setupCfgPath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".dfm", "setup.cfg"), nil
}

func loadSetupCfg() (setupCfg, error) {
	cfg := setupCfg{
		Locale: "en",
		Theme:  "light",
		raw:    map[string]map[string]string{},
	}
	path, err := setupCfgPath()
	if err != nil {
		return cfg, err
	}
	f, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return cfg, nil
		}
		return cfg, err
	}
	defer f.Close()

	section := ""
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") || strings.HasPrefix(line, ";") {
			continue
		}
		if strings.HasPrefix(line, "[") && strings.HasSuffix(line, "]") {
			section = strings.TrimSpace(line[1 : len(line)-1])
			if _, ok := cfg.raw[section]; !ok {
				cfg.raw[section] = map[string]string{}
			}
			continue
		}
		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		value = strings.Trim(strings.TrimSpace(value), `"`)
		if section == "" {
			continue
		}
		if cfg.raw[section] == nil {
			cfg.raw[section] = map[string]string{}
		}
		cfg.raw[section][key] = value
	}
	if err := sc.Err(); err != nil {
		return cfg, err
	}

	if user := cfg.raw["user"]; user != nil {
		cfg.UserName = user["name"]
		cfg.UserEmail = user["email"]
	}
	if cur := cfg.raw["current repo"]; cur != nil {
		cfg.CurrentRepo = cur["path"]
	}
	if ui := cfg.raw["ui"]; ui != nil {
		if ui["language"] == "ru" {
			cfg.Locale = "ru"
		}
		if ui["theme"] == "dark" {
			cfg.Theme = "dark"
		}
	}
	if repo := cfg.raw["repo"]; repo != nil {
		cfg.Repos = loadPathList(repo)
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
	return cfg, nil
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
	return updateSetupCfg(func(cfg *setupCfg) {
		cfg.CurrentRepo = absPath
		found := false
		for _, p := range cfg.Repos {
			if samePath(p, absPath) {
				found = true
				break
			}
		}
		if !found {
			cfg.Repos = append(cfg.Repos, absPath)
		}
	})
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
	setSection(cfg.raw, "user", "name", cfg.UserName)
	setSection(cfg.raw, "user", "email", cfg.UserEmail)
	setSection(cfg.raw, "current repo", "path", cfg.CurrentRepo)
	setSection(cfg.raw, "ui", "language", cfg.Locale)
	setSection(cfg.raw, "ui", "theme", cfg.Theme)
	setSection(cfg.raw, "forester", "path", cfg.ForesterPath)
	setSection(cfg.raw, "api", "path", cfg.APIPath)
	setSection(cfg.raw, "addons", "diffmachine_path", cfg.AddonPath)
	setSection(cfg.raw, "blender", "path", cfg.BlenderPath)

	repo := map[string]string{}
	for i, p := range cfg.Repos {
		repo["path_"+strconv.Itoa(i+1)] = p
	}
	cfg.raw["repo"] = repo

	editors := map[string]string{}
	for i, p := range cfg.Editors {
		editors["path_"+strconv.Itoa(i+1)] = p
	}
	cfg.raw["editors"] = editors

	order := []string{"user", "ui", "current repo", "repo", "forester", "api", "addons", "blender", "editors", "gc", "python_bindings", "plugins"}
	seen := map[string]bool{}
	var b strings.Builder
	writeSection := func(name string) {
		keys := cfg.raw[name]
		if len(keys) == 0 {
			return
		}
		seen[name] = true
		fmt.Fprintf(&b, "[%s]\n", name)
		if name == "repo" {
			for i := 1; i <= len(cfg.Repos); i++ {
				p := cfg.Repos[i-1]
				if p == "" {
					continue
				}
				fmt.Fprintf(&b, "path_%d = %s\n", i, p)
			}
		} else if name == "editors" {
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

	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, []byte(b.String()), 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

func loadPathList(section map[string]string) []string {
	var out []string
	for i := 1; i < 1024; i++ {
		p := section["path_"+strconv.Itoa(i)]
		if p == "" {
			break
		}
		out = append(out, p)
	}
	return out
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
	return filepath.Clean(a) == filepath.Clean(b)
}
