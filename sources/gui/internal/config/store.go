package config

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"

	"github.com/difference-machine/gui/internal/paths"
)

const cfgDirName = ".dfm"
const cfgFileName = "setup.cfg"

// Store reads and writes the user-level ~/.dfm/setup.cfg file.
type Store struct {
	path string
	data map[string]map[string]string
}

// NewStore loads or creates the global setup.cfg path.
func NewStore() (*Store, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return nil, err
	}
	cfgPath := filepath.Join(home, cfgDirName, cfgFileName)
	s := &Store{
		path: cfgPath,
		data: make(map[string]map[string]string),
	}
	if err := s.Load(); err != nil {
		return nil, err
	}
	return s, nil
}

// Path returns the absolute path to setup.cfg.
func (s *Store) Path() string {
	return s.path
}

// Load reads setup.cfg from disk.
func (s *Store) Load() error {
	s.data = make(map[string]map[string]string)

	if err := os.MkdirAll(filepath.Dir(s.path), 0o755); err != nil {
		return err
	}

	file, err := os.Open(s.path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	section := ""
	for scanner.Scan() {
		s.parseLine(scanner.Text(), &section)
	}
	return scanner.Err()
}

func (s *Store) parseLine(line string, section *string) {
	if idx := strings.Index(line, "#"); idx >= 0 {
		line = line[:idx]
	}
	line = strings.TrimSpace(line)
	if line == "" {
		return
	}
	if strings.HasPrefix(line, "[") && strings.HasSuffix(line, "]") {
		*section = strings.TrimSpace(line[1 : len(line)-1])
		return
	}
	parts := strings.SplitN(line, "=", 2)
	if len(parts) != 2 || *section == "" {
		return
	}
	key := strings.TrimSpace(parts[0])
	value := strings.TrimSpace(unquote(parts[1]))
	if s.data[*section] == nil {
		s.data[*section] = make(map[string]string)
	}
	s.data[*section][key] = value
}

func unquote(value string) string {
	if len(value) >= 2 {
		if (value[0] == '"' && value[len(value)-1] == '"') ||
			(value[0] == '\'' && value[len(value)-1] == '\'') {
			return value[1 : len(value)-1]
		}
	}
	return value
}

func quoteIfNeeded(value string) string {
	if strings.ContainsAny(value, " \t#=") {
		return `"` + value + `"`
	}
	return value
}

// Get returns a config value.
func (s *Store) Get(section, key string) string {
	if sec, ok := s.data[section]; ok {
		return sec[key]
	}
	return ""
}

// Set updates a config value in memory.
func (s *Store) Set(section, key, value string) {
	if s.data[section] == nil {
		s.data[section] = make(map[string]string)
	}
	s.data[section][key] = value
}

// Save writes setup.cfg atomically.
func (s *Store) Save() error {
	if err := os.MkdirAll(filepath.Dir(s.path), 0o755); err != nil {
		return err
	}

	sections := make([]string, 0, len(s.data))
	for name := range s.data {
		sections = append(sections, name)
	}
	sort.Strings(sections)

	var b strings.Builder
	for _, section := range sections {
		b.WriteString("[")
		b.WriteString(section)
		b.WriteString("]\n")
		keys := make([]string, 0, len(s.data[section]))
		for key := range s.data[section] {
			keys = append(keys, key)
		}
		sort.Strings(keys)
		for _, key := range keys {
			b.WriteString(key)
			b.WriteString(" = ")
			b.WriteString(quoteIfNeeded(s.data[section][key]))
			b.WriteString("\n")
		}
		b.WriteString("\n")
	}

	tmp := s.path + ".tmp"
	if err := os.WriteFile(tmp, []byte(b.String()), 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, s.path)
}

// CurrentRepoPath returns the last opened repository path.
func (s *Store) CurrentRepoPath() string {
	return s.Get("current repo", "path")
}

// SetCurrentRepoPath updates the last opened repository path.
func (s *Store) SetCurrentRepoPath(path string) error {
	canonical, err := paths.CanonicalAbsPath(path)
	if err != nil {
		return err
	}
	s.Set("current repo", "path", canonical)
	return s.Save()
}

// KnownRepos returns repository paths from [repo] ordered by path_N suffix.
func (s *Store) KnownRepos() ([]string, error) {
	sec := s.data["repo"]
	if len(sec) == 0 {
		return nil, nil
	}

	type item struct {
		index int
		path  string
	}
	items := make([]item, 0, len(sec))
	for key, value := range sec {
		if !strings.HasPrefix(key, "path_") {
			continue
		}
		n, err := strconv.Atoi(strings.TrimPrefix(key, "path_"))
		if err != nil || n < 1 {
			continue
		}
		canonical, err := paths.CanonicalAbsPath(value)
		if err != nil {
			continue
		}
		items = append(items, item{index: n, path: canonical})
	}
	sort.Slice(items, func(i, j int) bool { return items[i].index < items[j].index })

	out := make([]string, 0, len(items))
	seen := make(map[string]struct{})
	for _, it := range items {
		if _, ok := seen[it.path]; ok {
			continue
		}
		seen[it.path] = struct{}{}
		out = append(out, it.path)
	}
	return out, nil
}

// AddKnownRepo appends a repository path or switches to an existing one.
func (s *Store) AddKnownRepo(path string) error {
	canonical, err := paths.CanonicalAbsPath(path)
	if err != nil {
		return err
	}

	repos, err := s.KnownRepos()
	if err != nil {
		return err
	}
	for _, existing := range repos {
		if paths.SamePath(existing, canonical) {
			return s.SetCurrentRepoPath(canonical)
		}
	}

	next := 1
	if sec := s.data["repo"]; len(sec) > 0 {
		for key := range sec {
			if !strings.HasPrefix(key, "path_") {
				continue
			}
			n, err := strconv.Atoi(strings.TrimPrefix(key, "path_"))
			if err == nil && n >= next {
				next = n + 1
			}
		}
	}

	s.Set("repo", fmt.Sprintf("path_%d", next), canonical)
	if err := s.Save(); err != nil {
		return err
	}
	return s.SetCurrentRepoPath(canonical)
}

// RemoveKnownRepo removes a path from [repo].
func (s *Store) RemoveKnownRepo(path string) error {
	canonical, err := paths.CanonicalAbsPath(path)
	if err != nil {
		return err
	}

	sec := s.data["repo"]
	for key, value := range sec {
		if paths.SamePath(value, canonical) {
			delete(sec, key)
		}
	}
	if err := s.Save(); err != nil {
		return err
	}

	if paths.SamePath(s.CurrentRepoPath(), canonical) {
		repos, err := s.KnownRepos()
		if err != nil {
			return err
		}
		if len(repos) > 0 {
			return s.SetCurrentRepoPath(repos[0])
		}
		s.Set("current repo", "path", "")
		return s.Save()
	}
	return nil
}

// ForesterBinaryPath returns the configured forester CLI path.
func (s *Store) ForesterBinaryPath() string {
	return s.Get("forester", "path")
}

// UserName returns the author name from [user].
func (s *Store) UserName() string {
	return s.Get("user", "name")
}

// SetUserName updates [user].name.
func (s *Store) SetUserName(name string) error {
	s.Set("user", "name", strings.TrimSpace(name))
	return s.Save()
}

// SetKnownReposList replaces [repo] with an ordered deduplicated list.
func (s *Store) SetKnownReposList(repoPaths []string) error {
	s.data["repo"] = make(map[string]string)
	seen := make(map[string]struct{})
	idx := 1
	for _, repoPath := range repoPaths {
		canonical, err := paths.CanonicalAbsPath(repoPath)
		if err != nil {
			return err
		}
		if _, ok := seen[canonical]; ok {
			continue
		}
		seen[canonical] = struct{}{}
		s.Set("repo", fmt.Sprintf("path_%d", idx), canonical)
		idx++
	}
	return s.Save()
}

// Language returns [gui].language or "en".
func (s *Store) Language() string {
	if lang := s.Get("gui", "language"); lang != "" {
		return lang
	}
	return "en"
}

// SetLanguage updates [gui].language.
func (s *Store) SetLanguage(lang string) error {
	s.Set("gui", "language", strings.TrimSpace(lang))
	return s.Save()
}

// BlenderPath returns [blender].path.
func (s *Store) BlenderPath() string {
	return s.Get("blender", "path")
}

// AddonPath returns [addons].diffmachine_path.
func (s *Store) AddonPath() string {
	return s.Get("addons", "diffmachine_path")
}

// OrderedPathList returns path_N entries from a config section in numeric order.
func (s *Store) OrderedPathList(section string) ([]string, error) {
	sec := s.data[section]
	if len(sec) == 0 {
		return nil, nil
	}

	type item struct {
		index int
		path  string
	}
	items := make([]item, 0, len(sec))
	for key, value := range sec {
		if !strings.HasPrefix(key, "path_") {
			continue
		}
		n, err := strconv.Atoi(strings.TrimPrefix(key, "path_"))
		if err != nil || n < 1 {
			continue
		}
		canonical, err := paths.CanonicalAbsPath(value)
		if err != nil {
			continue
		}
		items = append(items, item{index: n, path: canonical})
	}
	sort.Slice(items, func(i, j int) bool { return items[i].index < items[j].index })

	out := make([]string, 0, len(items))
	seen := make(map[string]struct{})
	for _, it := range items {
		if _, ok := seen[it.path]; ok {
			continue
		}
		seen[it.path] = struct{}{}
		out = append(out, it.path)
	}
	return out, nil
}

// SetOrderedPathList replaces path_N keys in a section with an ordered deduplicated list.
func (s *Store) SetOrderedPathList(section string, pathList []string) error {
	s.data[section] = make(map[string]string)
	seen := make(map[string]struct{})
	idx := 1
	for _, path := range pathList {
		if path == "" {
			continue
		}
		canonical, err := paths.CanonicalAbsPath(path)
		if err != nil {
			return err
		}
		if _, ok := seen[canonical]; ok {
			continue
		}
		seen[canonical] = struct{}{}
		s.Set(section, fmt.Sprintf("path_%d", idx), canonical)
		idx++
	}
	return s.Save()
}

// GUIEditors returns configured external editor executables.
func (s *Store) GUIEditors() ([]string, error) {
	return s.OrderedPathList("gui editors")
}

// SetGUIEditorsList persists [gui editors].
func (s *Store) SetGUIEditorsList(editorPaths []string) error {
	return s.SetOrderedPathList("gui editors", editorPaths)
}

// SetForesterPaths updates backend toolchain paths in setup.cfg.
func (s *Store) SetForesterPaths(cliPath, blenderPath, addonPath string) error {
	if strings.TrimSpace(cliPath) == "" {
		return fmt.Errorf("Forester CLI path is required")
	}
	cliCanonical, err := paths.CanonicalAbsPath(cliPath)
	if err != nil {
		return err
	}
	if info, err := os.Stat(cliCanonical); err != nil {
		return fmt.Errorf("Forester CLI not found: %w", err)
	} else if info.IsDir() {
		return fmt.Errorf("Forester CLI must be a file")
	}
	s.Set("forester", "path", cliCanonical)

	if blenderPath != "" {
		blenderCanonical, err := paths.CanonicalAbsPath(blenderPath)
		if err != nil {
			return err
		}
		if info, err := os.Stat(blenderCanonical); err != nil {
			return fmt.Errorf("Blender executable not found: %w", err)
		} else if info.IsDir() {
			return fmt.Errorf("Blender executable must be a file")
		}
		s.Set("blender", "path", blenderCanonical)
	} else {
		if sec := s.data["blender"]; sec != nil {
			delete(sec, "path")
		}
	}

	if addonPath != "" {
		addonCanonical, err := paths.CanonicalAbsPath(addonPath)
		if err != nil {
			return err
		}
		info, err := os.Stat(addonCanonical)
		if err != nil {
			return fmt.Errorf("Blender addon path not found: %w", err)
		}
		if !info.IsDir() {
			return fmt.Errorf("Blender addon path must be a directory")
		}
		s.Set("addons", "diffmachine_path", addonCanonical)
	} else {
		if sec := s.data["addons"]; sec != nil {
			delete(sec, "diffmachine_path")
		}
	}

	return s.Save()
}
