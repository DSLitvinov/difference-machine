package main

import (
	"testing"
)

func TestApplicationDialogOptionsDarwin(t *testing.T) {
	opts := applicationDialogOptions("darwin")
	if opts.DefaultDirectory != "/Applications" {
		t.Fatalf("darwin default = %q, want /Applications", opts.DefaultDirectory)
	}
	if len(opts.Filters) != 1 || opts.Filters[0].Pattern != "*.app" {
		t.Fatalf("darwin filters = %+v, want *.app", opts.Filters)
	}
}

func TestApplicationDialogOptionsWindows(t *testing.T) {
	opts := applicationDialogOptions("windows")
	if opts.DefaultDirectory == "" {
		t.Fatal("windows default directory is empty")
	}
	if len(opts.Filters) != 1 || opts.Filters[0].Pattern != "*.exe" {
		t.Fatalf("windows filters = %+v, want *.exe", opts.Filters)
	}
}

func TestApplicationDialogOptionsLinux(t *testing.T) {
	opts := applicationDialogOptions("linux")
	if opts.DefaultDirectory != "/usr/bin" {
		t.Fatalf("linux default = %q, want /usr/bin", opts.DefaultDirectory)
	}
	if len(opts.Filters) != 0 {
		t.Fatalf("linux filters = %+v, want none", opts.Filters)
	}
}

func TestStripNamedGTKModules(t *testing.T) {
	drop := []string{"appmenu-gtk-module", "unity-gtk-module"}
	got := stripNamedGTKModules("canberra-gtk-module:appmenu-gtk-module:unity-gtk-module", drop...)
	if got != "canberra-gtk-module" {
		t.Fatalf("got %q", got)
	}
	if stripNamedGTKModules("appmenu-gtk-module", drop...) != "" {
		t.Fatal("expected empty after dropping the only module")
	}
	if stripNamedGTKModules("", drop...) != "" {
		t.Fatal("empty input should stay empty")
	}
}
