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

func (a *App) applicationMenu() *menu.Menu {
	appMenu := menu.NewMenu()
	if goruntime.GOOS == "darwin" {
		appMenu.Append(menu.AppMenu())
	}

	file := appMenu.AddSubmenu("File")
	file.AddText("Open Folder", keys.CmdOrCtrl("o"), func(_ *menu.CallbackData) {
		a.menuOpenFolder()
	})

	edit := appMenu.AddSubmenu("Edit")
	edit.AddText("Settings", keys.CmdOrCtrl(","), func(_ *menu.CallbackData) {
		if a.ctx == nil {
			return
		}
		runtime.EventsEmit(a.ctx, eventMenuSettings)
	})

	repo := appMenu.AddSubmenu("Repository")
	repo.AddText("Create repository", nil, func(_ *menu.CallbackData) {
		a.menuCreateRepository()
	})
	repo.AddText("Merge", nil, func(_ *menu.CallbackData) {
		if a.ctx == nil {
			return
		}
		runtime.EventsEmit(a.ctx, eventMenuMerge)
	})

	appMenu.Append(menu.WindowMenu())
	return appMenu
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
