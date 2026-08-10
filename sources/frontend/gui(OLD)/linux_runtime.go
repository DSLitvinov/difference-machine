//go:build linux

package main

import "os"

func init() {
	// WebKitGTK DMA-BUF rendering breaks on many Wayland + proprietary GPU setups
	// (Gdk "Error 71 / Protocol error"). Respect an explicit user override.
	if os.Getenv("WEBKIT_DISABLE_DMABUF_RENDERER") == "" {
		_ = os.Setenv("WEBKIT_DISABLE_DMABUF_RENDERER", "1")
	}
}
