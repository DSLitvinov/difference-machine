package main

import (
	"path/filepath"
	goruntime "runtime"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/menu"
	"github.com/wailsapp/wails/v2/pkg/menu/keys"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	eventSessionChanged   = "session:changed"
	eventMenuSettings     = "menu:settings"
	eventMenuMerge        = "menu:merge"
	eventMenuBranchCreate = "menu:branch-create"
	eventMenuBranchRename = "menu:branch-rename"
	eventMenuBranchDelete = "menu:branch-delete"
)

type nativeMenuCopy struct {
	file             string
	openFolder       string
	edit             string
	settings         string
	repository       string
	createRepository string
	addRepository    string
	branches         string
	createBranch     string
	renameBranch     string
	deleteBranch     string
	merge            string
}

func nativeMenuCopyFor(locale string) nativeMenuCopy {
	if locale == "ru" {
		return nativeMenuCopy{
			file:             "Файл",
			openFolder:       "Открыть папку",
			edit:             "Правка",
			settings:         "Настройки",
			repository:       "Репозиторий",
			createRepository: "Создать репозиторий",
			addRepository:    "Добавить репозиторий",
			branches:         "Ветки",
			createBranch:     "Создать",
			renameBranch:     "Переименовать",
			deleteBranch:     "Удалить",
			merge:            "Слияние",
		}
	}
	return nativeMenuCopy{
		file:             "File",
		openFolder:       "Open Folder",
		edit:             "Edit",
		settings:         "Settings",
		repository:       "Repository",
		createRepository: "Create repository",
		addRepository:    "Add repository",
		branches:         "Branches",
		createBranch:     "Create",
		renameBranch:     "Rename",
		deleteBranch:     "Delete",
		merge:            "Merge",
	}
}

func cfgLocale() string {
	cfg, err := loadSetupCfg()
	if err == nil && cfg.Locale == "ru" {
		return "ru"
	}
	return "en"
}

func (a *App) applicationMenu() *menu.Menu {
	copy := nativeMenuCopyFor(cfgLocale())
	appMenu := menu.NewMenu()
	if goruntime.GOOS == "darwin" {
		appMenu.Append(menu.AppMenu())
	}

	file := appMenu.AddSubmenu(copy.file)
	file.AddText(copy.openFolder, keys.CmdOrCtrl("o"), func(_ *menu.CallbackData) {
		a.menuOpenFolder()
	})

	edit := appMenu.AddSubmenu(copy.edit)
	edit.AddText(copy.settings, keys.CmdOrCtrl(","), func(_ *menu.CallbackData) {
		a.emitMenu(eventMenuSettings)
	})

	repo := appMenu.AddSubmenu(copy.repository)
	repo.AddText(copy.createRepository, nil, func(_ *menu.CallbackData) {
		a.menuCreateRepository()
	})
	repo.AddText(copy.addRepository, nil, func(_ *menu.CallbackData) {
		a.menuOpenFolder()
	})

	a.mu.Lock()
	hasSession := a.hasSession
	a.mu.Unlock()

	branches := repo.AddSubmenu(copy.branches)
	mergeItem := branches.AddText(copy.merge, nil, func(_ *menu.CallbackData) {
		a.emitMenu(eventMenuMerge)
	})
	createItem := branches.AddText(copy.createBranch, nil, func(_ *menu.CallbackData) {
		a.emitMenu(eventMenuBranchCreate)
	})
	renameItem := branches.AddText(copy.renameBranch, nil, func(_ *menu.CallbackData) {
		a.emitMenu(eventMenuBranchRename)
	})
	deleteItem := branches.AddText(copy.deleteBranch, nil, func(_ *menu.CallbackData) {
		a.emitMenu(eventMenuBranchDelete)
	})
	mergeItem.Disabled = !hasSession
	createItem.Disabled = !hasSession
	renameItem.Disabled = !hasSession
	deleteItem.Disabled = !hasSession

	a.appendRepoSwitchMenu(repo)

	appMenu.Append(menu.WindowMenu())
	return appMenu
}

func (a *App) emitMenu(event string) {
	if a.ctx == nil {
		return
	}
	runtime.EventsEmit(a.ctx, event)
}

func (a *App) appendRepoSwitchMenu(repo *menu.Menu) {
	state, err := loadRepoState()
	if err != nil {
		return
	}
	repos := knownRepos(state)
	if len(repos) == 0 {
		return
	}
	current := state.Current
	a.mu.Lock()
	if a.workPath != "" {
		current = a.workPath
	}
	a.mu.Unlock()
	repo.AddSeparator()
	for _, entry := range repoMenuEntries(repos, current) {
		path := entry.Path
		item := repo.AddRadio(entry.Label, entry.Checked, nil, func(_ *menu.CallbackData) {
			a.menuSwitchRepository(path)
		})
		if !isForesterRepo(path) {
			item.Disabled = true
		}
	}
}

func (a *App) menuSwitchRepository(path string) {
	if a.ctx == nil {
		return
	}
	a.mu.Lock()
	same := a.hasSession && samePath(a.workPath, path)
	a.mu.Unlock()
	if same {
		return
	}
	info := a.OpenRepository(path)
	runtime.EventsEmit(a.ctx, eventSessionChanged, info)
}

type repoMenuEntry struct {
	Path    string
	Label   string
	Checked bool
}

func repoMenuEntries(repos []string, current string) []repoMenuEntry {
	labels := repoMenuLabels(repos)
	out := make([]repoMenuEntry, 0, len(repos))
	for i, path := range repos {
		path = strings.TrimSpace(path)
		if path == "" {
			continue
		}
		out = append(out, repoMenuEntry{
			Path:    path,
			Label:   labels[i],
			Checked: samePath(path, current),
		})
	}
	return out
}

func repoMenuLabels(paths []string) []string {
	bases := make([]string, len(paths))
	counts := map[string]int{}
	for i, p := range paths {
		base := filepath.Base(filepath.Clean(p))
		if base == "" || base == "." || base == string(filepath.Separator) {
			base = p
		}
		bases[i] = base
		counts[base]++
	}
	out := make([]string, len(paths))
	for i, p := range paths {
		if counts[bases[i]] == 1 {
			out[i] = bases[i]
			continue
		}
		out[i] = filepath.Clean(p)
	}
	return out
}

func (a *App) applyMenuLocale() {
	if a.ctx == nil {
		return
	}
	runtime.MenuSetApplicationMenu(a.ctx, a.applicationMenu())
}

func (a *App) menuOpenFolder() {
	if a.ctx == nil {
		return
	}
	path, err := a.SelectDirectory()
	if err != nil || path == "" {
		return
	}
	info := a.OpenRepository(path)
	runtime.EventsEmit(a.ctx, eventSessionChanged, info)
}

func (a *App) menuCreateRepository() {
	if a.ctx == nil {
		return
	}
	path, err := a.SelectDirectory()
	if err != nil || path == "" {
		return
	}
	info := a.InitRepository(path)
	runtime.EventsEmit(a.ctx, eventSessionChanged, info)
}
