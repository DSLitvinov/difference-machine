package config

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"sync"

	"github.com/difference-machine/gui/internal/paths"
)

const cfgDirName = ".dfm"
const cfgFileName = "setup.cfg"

// Store reads and writes the user-level ~/.dfm/setup.cfg file.
type Store struct {
	mu   sync.RWMutex
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
	s.mu.Lock()
	defer s.mu.Unlock()

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
	value = strings.TrimSpace(value)
	for len(value) >= 2 && value[0] == '"' && value[len(value)-1] == '"' {
		value = strings.TrimSpace(value[1 : len(value)-1])
	}
	return value
}

func quoteIfNeeded(value string) string {
	value = unquote(value)
	if strings.ContainsAny(value, " \t#=") {
		return `"` + value + `"`
	}
	return value
}

// Get returns a config value.
func (s *Store) Get(section, key string) string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.getUnlocked(section, key)
}

func (s *Store) getUnlocked(section, key string) string {
	if sec, ok := s.data[section]; ok {
		return sec[key]
	}
	return ""
}

// Set updates a config value in memory.
func (s *Store) Set(section, key, value string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.setUnlocked(section, key, value)
}

func (s *Store) setUnlocked(section, key, value string) {
	if s.data[section] == nil {
		s.data[section] = make(map[string]string)
	}
	s.data[section][key] = value
}

// Save writes setup.cfg atomically.
func (s *Store) Save() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.saveUnlocked()
}

func (s *Store) saveUnlocked() error {
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
	s.mu.Lock()
	defer s.mu.Unlock()
	s.setUnlocked("current repo", "path", canonical)
	return s.saveUnlocked()
}

// knownReposUnlocked returns repository paths from [repo] ordered by path_N suffix.
func (s *Store) knownReposUnlocked() ([]string, error) {
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

// KnownRepos returns repository paths from [repo] ordered by path_N suffix.
func (s *Store) KnownRepos() ([]string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.knownReposUnlocked()
}

// AddKnownRepo appends a repository path or switches to an existing one.
func (s *Store) AddKnownRepo(path string) error {
	canonical, err := paths.CanonicalAbsPath(path)
	if err != nil {
		return err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	repos, err := s.knownReposUnlocked()
	if err != nil {
		return err
	}
	for _, existing := range repos {
		if paths.SamePath(existing, canonical) {
			s.setUnlocked("current repo", "path", canonical)
			return s.saveUnlocked()
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

	s.setUnlocked("repo", fmt.Sprintf("path_%d", next), canonical)
	if err := s.saveUnlocked(); err != nil {
		return err
	}
	s.setUnlocked("current repo", "path", canonical)
	return s.saveUnlocked()
}

// RemoveKnownRepo removes a path from [repo].
func (s *Store) RemoveKnownRepo(path string) error {
	canonical, err := paths.CanonicalAbsPath(path)
	if err != nil {
		return err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	sec := s.data["repo"]
	for key, value := range sec {
		if paths.SamePath(value, canonical) {
			delete(sec, key)
		}
	}
	if err := s.saveUnlocked(); err != nil {
		return err
	}

	if paths.SamePath(s.getUnlocked("current repo", "path"), canonical) {
		repos, err := s.knownReposUnlocked()
		if err != nil {
			return err
		}
		if len(repos) > 0 {
			s.setUnlocked("current repo", "path", repos[0])
			return s.saveUnlocked()
		}
		s.setUnlocked("current repo", "path", "")
		return s.saveUnlocked()
	}
	return nil
}

// ForesterBinaryPath returns the configured forester CLI path.
func (s *Store) ForesterBinaryPath() string {
	return s.Get("forester", "path")
}

// NeedsForesterBootstrap reports whether install paths should be auto-filled (macOS DMG).
func (s *Store) NeedsForesterBootstrap() bool {
	if !pathExists(s.ForesterBinaryPath()) {
		return true
	}
	if !pathExists(s.Get("addons", "diffmachine_path")) {
		return true
	}
	return false
}

func pathExists(path string) bool {
	path = strings.TrimSpace(path)
	if path == "" {
		return false
	}
	_, err := os.Stat(path)
	return err == nil
}

// UserName returns the author name from [user].
func (s *Store) UserName() string {
	return s.Get("user", "name")
}

// SetUserName updates [user].name.
func (s *Store) SetUserName(name string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.setUnlocked("user", "name", strings.TrimSpace(name))
	return s.saveUnlocked()
}

// SetKnownReposList replaces [repo] with an ordered deduplicated list.
func (s *Store) SetKnownReposList(repoPaths []string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

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
		s.setUnlocked("repo", fmt.Sprintf("path_%d", idx), canonical)
		idx++
	}
	return s.saveUnlocked()
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
	lang = strings.TrimSpace(lang)
	if lang != "ru" {
		lang = "en"
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.setUnlocked("gui", "language", lang)
	return s.saveUnlocked()
}

// GUITheme returns [gui].theme or "light".
func (s *Store) GUITheme() string {
	if theme := s.Get("gui", "theme"); theme != "" {
		return theme
	}
	return "light"
}

// GUIFont returns [gui].font or "inter".
func (s *Store) GUIFont() string {
	if font := s.Get("gui", "font"); font != "" {
		return font
	}
	return "inter"
}

// SetAppearance updates [gui].theme and [gui].font.
func (s *Store) SetAppearance(theme, font string) error {
	if theme != "dark" {
		theme = "light"
	}
	if font == "" {
		font = "inter"
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.setUnlocked("gui", "theme", theme)
	s.setUnlocked("gui", "font", font)
	return s.saveUnlocked()
}

// BlenderPath returns [blender].path.
func (s *Store) BlenderPath() string {
	return s.Get("blender", "path")
}

// AddonPath returns [addons].diffmachine_path.
func (s *Store) AddonPath() string {
	return s.Get("addons", "diffmachine_path")
}

// orderedPathListUnlocked returns path_N entries from a config section in numeric order.
func (s *Store) orderedPathListUnlocked(section string) ([]string, error) {
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

// OrderedPathList returns path_N entries from a config section in numeric order.
func (s *Store) OrderedPathList(section string) ([]string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.orderedPathListUnlocked(section)
}

// SetOrderedPathList replaces path_N keys in a section with an ordered deduplicated list.
func (s *Store) SetOrderedPathList(section string, pathList []string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

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
		s.setUnlocked(section, fmt.Sprintf("path_%d", idx), canonical)
		idx++
	}
	return s.saveUnlocked()
}

// GUIEditors returns configured external editor executables.
func (s *Store) GUIEditors() ([]string, error) {
	return s.OrderedPathList("gui editors")
}

// SetGUIEditorsList persists [gui editors].
func (s *Store) SetGUIEditorsList(editorPaths []string) error {
	return s.SetOrderedPathList("gui editors", editorPaths)
}

// SetInstallToolchainPaths writes Forester CLI, API library, and addon paths (installer bootstrap).
func (s *Store) SetInstallToolchainPaths(cliPath, apiPath, addonPath string) error {
	cliCanonical, err := paths.CanonicalAbsPath(cliPath)
	if err != nil {
		return err
	}
	if info, err := os.Stat(cliCanonical); err != nil {
		return fmt.Errorf("Forester CLI not found: %w", err)
	} else if info.IsDir() {
		return fmt.Errorf("Forester CLI must be a file")
	}

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

	var apiCanonical string
	if strings.TrimSpace(apiPath) != "" {
		apiCanonical, err = paths.CanonicalAbsPath(apiPath)
		if err != nil {
			return err
		}
		if st, err := os.Stat(apiCanonical); err != nil {
			return fmt.Errorf("Forester API library not found: %w", err)
		} else if st.IsDir() {
			return fmt.Errorf("Forester API path must be a file")
		}
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	s.setUnlocked("forester", "installed", "true")
	s.setUnlocked("forester", "path", cliCanonical)

	ffmpegPath := filepath.Join(filepath.Dir(cliCanonical), ffmpegBinaryName())
	if st, err := os.Stat(ffmpegPath); err == nil && !st.IsDir() {
		s.setUnlocked("forester", "ffmpeg_path", ffmpegPath)
	}

	if apiCanonical != "" {
		s.setUnlocked("api", "installed", "true")
		s.setUnlocked("api", "path", apiCanonical)
	}

	s.setUnlocked("addons", "diffmachine_path", addonCanonical)

	return s.saveUnlocked()
}

// SetForesterPaths updates backend toolchain paths in setup.cfg.
func (s *Store) SetForesterPaths(cliPath, blenderPath, addonPath string) error {
	if strings.TrimSpace(cliPath) == "" {
		return fmt.Errorf("Forester CLI path is required")
	}
	cliResolved, err := paths.ResolveExecutablePath(cliPath)
	if err != nil {
		return fmt.Errorf("Forester CLI not found: %w", err)
	}
	if info, err := os.Stat(cliResolved); err != nil {
		return fmt.Errorf("Forester CLI not found: %w", err)
	} else if info.IsDir() {
		return fmt.Errorf("Forester CLI must be a file")
	}
	cliCanonical := cliResolved

	var blenderCanonical string
	if blenderPath != "" {
		blenderCanonical, err = paths.ResolveExecutablePath(blenderPath)
		if err != nil {
			return fmt.Errorf("Blender executable not found: %w", err)
		}
	}

	var addonCanonical string
	if addonPath != "" {
		addonCanonical, err = paths.CanonicalAbsPath(addonPath)
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
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	s.setUnlocked("forester", "path", cliCanonical)

	if blenderPath != "" {
		s.setUnlocked("blender", "path", blenderCanonical)
	} else if sec := s.data["blender"]; sec != nil {
		delete(sec, "path")
	}

	if addonPath != "" {
		s.setUnlocked("addons", "diffmachine_path", addonCanonical)
	} else if sec := s.data["addons"]; sec != nil {
		delete(sec, "diffmachine_path")
	}

	return s.saveUnlocked()
}

func ffmpegBinaryName() string {
	if runtime.GOOS == "windows" {
		return "ffmpeg.exe"
	}
	return "ffmpeg"
}
