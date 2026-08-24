package main

import (
	goruntime "runtime"

	"github.com/wailsapp/wails/v2/pkg/menu"
	"github.com/wailsapp/wails/v2/pkg/menu/keys"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	eventSessionChanged = "session:changed"
	eventMenuSettings   = "menu:settings"
	eventMenuMerge      = "menu:merge"
)

type nativeMenuCopy struct {
	file             string
	openFolder       string
	edit             string
	settings         string
	repository       string
	createRepository string
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
		if a.ctx == nil {
			return
		}
		runtime.EventsEmit(a.ctx, eventMenuSettings)
	})

	repo := appMenu.AddSubmenu(copy.repository)
	repo.AddText(copy.createRepository, nil, func(_ *menu.CallbackData) {
		a.menuCreateRepository()
	})
	repo.AddText(copy.merge, nil, func(_ *menu.CallbackData) {
		if a.ctx == nil {
			return
		}
		runtime.EventsEmit(a.ctx, eventMenuMerge)
	})

	appMenu.Append(menu.WindowMenu())
	return appMenu
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
