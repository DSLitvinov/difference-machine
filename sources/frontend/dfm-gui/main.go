package main

import (
	"embed"
	"log"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app := NewApp()

	width, height := firstStartWidth, firstStartHeight
	minW, minH := firstStartWidth, firstStartHeight
	if cfg, err := loadSetupCfg(); err == nil && cfg.CurrentRepo != "" && isForesterRepo(cfg.CurrentRepo) {
		width, height = appWidth, appHeight
		minW, minH = appMinWidth, appMinHeight
	}

	err := wails.Run(&options.App{
		Title:            "Difference Machine",
		Width:            width,
		Height:           height,
		MinWidth:         minW,
		MinHeight:        minH,
		Frameless:        false,
		BackgroundColour: &options.RGBA{R: 250, G: 250, B: 250, A: 255},
		Menu:             app.applicationMenu(),
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		OnStartup:  app.startup,
		OnShutdown: app.shutdown,
		Bind: []interface{}{
			app,
		},
		Mac: &mac.Options{
			TitleBar:             mac.TitleBarDefault(),
			WebviewIsTransparent: false,
			WindowIsTranslucent:  false,
			About: &mac.AboutInfo{
				Title:   "Difference Machine",
				Message: "Prototype 0.8.1",
			},
		},
		Windows: &windows.Options{
			DisableWindowIcon: false,
		},
	})
	if err != nil {
		log.Fatal(err)
	}
}
