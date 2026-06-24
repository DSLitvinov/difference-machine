package main

import (
	"runtime"

	"github.com/wailsapp/wails/v2/pkg/menu"
	"github.com/wailsapp/wails/v2/pkg/menu/keys"
	rt "github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	eventOpenSettings   = "gui:open-settings"
	eventSwitchMode     = "gui:switch-mode"
	eventToggleSidebar  = "gui:toggle-sidebar"
	modeProject         = "project"
	modeHistory         = "history"
)

func buildApplicationMenu(app *App) *menu.Menu {
	appMenu := menu.NewMenu()

	if runtime.GOOS == "darwin" {
		appMenu.Append(menu.AppMenu())
	}

	viewMenu := appMenu.AddSubmenu("View")
	viewMenu.AddText("Settings…", keys.CmdOrCtrl(","), func(_ *menu.CallbackData) {
		emitMenuEvent(app, eventOpenSettings)
	})
	viewMenu.AddSeparator()
	viewMenu.AddText("Project View", keys.CmdOrCtrl("1"), func(_ *menu.CallbackData) {
		emitMenuEvent(app, eventSwitchMode, modeProject)
	})
	viewMenu.AddText("History View", keys.CmdOrCtrl("2"), func(_ *menu.CallbackData) {
		emitMenuEvent(app, eventSwitchMode, modeHistory)
	})
	viewMenu.AddSeparator()
	viewMenu.AddText("Toggle Sidebar", keys.CmdOrCtrl("b"), func(_ *menu.CallbackData) {
		emitMenuEvent(app, eventToggleSidebar)
	})

	if runtime.GOOS == "darwin" {
		appMenu.Append(menu.EditMenu())
	}

	windowMenu := appMenu.AddSubmenu("Window")
	windowMenu.AddText("Minimize", keys.CmdOrCtrl("m"), func(_ *menu.CallbackData) {
		if app.ctx != nil {
			rt.WindowMinimise(app.ctx)
		}
	})
	windowMenu.AddText("Zoom", keys.Combo("f", keys.CmdOrCtrlKey, keys.ControlKey), func(_ *menu.CallbackData) {
		if app.ctx != nil {
			rt.WindowToggleMaximise(app.ctx)
		}
	})

	return appMenu
}

func emitMenuEvent(app *App, name string, optionalData ...interface{}) {
	if app.ctx == nil {
		return
	}
	if len(optionalData) > 0 {
		rt.EventsEmit(app.ctx, name, optionalData...)
		return
	}
	rt.EventsEmit(app.ctx, name)
}
