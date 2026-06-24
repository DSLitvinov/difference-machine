package main

import (
	"fmt"

	"github.com/difference-machine/gui/internal/paths"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// SettingsSnapshot is returned to the settings UI.
type SettingsSnapshot struct {
	UserName    string   `json:"userName"`
	Language    string   `json:"language"`
	Repos       []string `json:"repos"`
	CurrentRepo string   `json:"currentRepo"`
	ConfigPath  string   `json:"configPath"`
	ForesterCLI string   `json:"foresterCli"`
	BlenderPath string   `json:"blenderPath"`
	AddonPath   string   `json:"addonPath"`
	Editors     []string `json:"editors"`
	Theme       string   `json:"theme"`
	Font        string   `json:"font"`
}

// GetSettings returns the current GUI configuration snapshot.
func (a *App) GetSettings() (*SettingsSnapshot, error) {
	if a.cfg == nil {
		return nil, fmt.Errorf("config not loaded")
	}
	repos, err := a.cfg.KnownRepos()
	if err != nil {
		return nil, err
	}
	editors, err := a.cfg.GUIEditors()
	if err != nil {
		return nil, err
	}
	return &SettingsSnapshot{
		UserName:    a.cfg.UserName(),
		Language:    a.cfg.Language(),
		Repos:       repos,
		CurrentRepo: a.cfg.CurrentRepoPath(),
		ConfigPath:  a.cfg.Path(),
		ForesterCLI: a.cfg.ForesterBinaryPath(),
		BlenderPath: a.cfg.BlenderPath(),
		AddonPath:   a.cfg.AddonPath(),
		Editors:     editors,
		Theme:       a.cfg.GUITheme(),
		Font:        a.cfg.GUIFont(),
	}, nil
}

// SaveSettingsProfile persists author name and language.
func (a *App) SaveSettingsProfile(userName, language string) error {
	if a.cfg == nil {
		return fmt.Errorf("config not loaded")
	}
	if err := a.cfg.SetUserName(userName); err != nil {
		return err
	}
	if language == "" {
		language = "en"
	}
	return a.cfg.SetLanguage(language)
}

// SaveSettingsRepos persists the repository list after validation.
func (a *App) SaveSettingsRepos(repoPaths []string) error {
	if a.cfg == nil {
		return fmt.Errorf("config not loaded")
	}
	canonical := make([]string, 0, len(repoPaths))
	for _, path := range repoPaths {
		if path == "" {
			continue
		}
		abs, err := paths.CanonicalAbsPath(path)
		if err != nil {
			return err
		}
		if !isForesterRepo(abs) {
			return fmt.Errorf("not a Forester repository: %s", abs)
		}
		canonical = append(canonical, abs)
	}
	if err := a.cfg.SetKnownReposList(canonical); err != nil {
		return err
	}
	current := a.cfg.CurrentRepoPath()
	if current != "" {
		stillKnown := false
		for _, p := range canonical {
			if paths.SamePath(p, current) {
				stillKnown = true
				break
			}
		}
		if !stillKnown {
			if len(canonical) > 0 {
				if err := a.cfg.SetCurrentRepoPath(canonical[0]); err != nil {
					return err
				}
			} else {
				a.cfg.Set("current repo", "path", "")
				if err := a.cfg.Save(); err != nil {
					return err
				}
			}
		}
	}
	return nil
}

// SaveSettingsAppearance persists theme and font in setup.cfg.
func (a *App) SaveSettingsAppearance(theme, font string) error {
	if a.cfg == nil {
		return fmt.Errorf("config not loaded")
	}
	return a.cfg.SetAppearance(theme, font)
}

// SaveSettingsEditors persists the external editor list.
func (a *App) SaveSettingsEditors(editorPaths []string) error {
	if a.cfg == nil {
		return fmt.Errorf("config not loaded")
	}
	canonical := make([]string, 0, len(editorPaths))
	for _, path := range editorPaths {
		if path == "" {
			continue
		}
		abs, err := paths.ResolveExecutablePath(path)
		if err != nil {
			return fmt.Errorf("editor not found: %w", err)
		}
		canonical = append(canonical, abs)
	}
	return a.cfg.SetGUIEditorsList(canonical)
}

// SaveSettingsForester persists backend toolchain paths.
func (a *App) SaveSettingsForester(cliPath, blenderPath, addonPath string) error {
	if a.cfg == nil {
		return fmt.Errorf("config not loaded")
	}
	return a.cfg.SetForesterPaths(cliPath, blenderPath, addonPath)
}

// PickSettingsFile opens a native file picker for executables.
func (a *App) PickSettingsFile() (string, error) {
	if a.ctx == nil {
		return "", fmt.Errorf("application not ready")
	}
	return runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select file",
	})
}

// PickSettingsFolder opens a native folder picker.
func (a *App) PickSettingsFolder() (string, error) {
	if a.ctx == nil {
		return "", fmt.Errorf("application not ready")
	}
	return runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select folder",
	})
}
