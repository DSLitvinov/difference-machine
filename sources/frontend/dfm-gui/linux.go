//go:build linux

package main

import (
	"os"
)

func init() {
	// GNOME / Ubuntu load appmenu-gtk-module, which proxies the GTK menubar over
	// D-Bus. Combined with Wails v2 replacing the packed GtkMenuBar, activate
	// on the original widgets panics. Keep the in-window menu owned by GTK.
	os.Setenv("UBUNTU_MENUPROXY", "0")
	drop := []string{"appmenu-gtk-module", "unity-gtk-module"}
	for _, key := range []string{"GTK_MODULES", "GTK3_MODULES"} {
		cur := os.Getenv(key)
		next := stripNamedGTKModules(cur, drop...)
		if next == cur {
			continue
		}
		if next == "" {
			_ = os.Unsetenv(key)
			continue
		}
		_ = os.Setenv(key, next)
	}
}
