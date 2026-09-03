package main

import (
	"context"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/fsnotify/fsnotify"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	eventWorkdirChanged = "workdir:changed"
	watchDebounce       = 400 * time.Millisecond
)

func watchIgnored(repoRoot, abs string) bool {
	rel, err := filepath.Rel(repoRoot, abs)
	if err != nil {
		return true
	}
	rel = filepath.ToSlash(rel)
	if rel == "." {
		return false
	}
	if rel == ".." || strings.HasPrefix(rel, "../") {
		return true
	}
	if rel == ".DFM" || strings.HasPrefix(rel, ".DFM/") {
		return true
	}
	return false
}

func addWatchTree(w *fsnotify.Watcher, repoRoot, dir string) {
	_ = filepath.WalkDir(dir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if !d.IsDir() {
			return nil
		}
		if watchIgnored(repoRoot, path) {
			return fs.SkipDir
		}
		_ = w.Add(path)
		return nil
	})
}

func (a *App) startWatchLocked() {
	a.stopWatchLocked()
	if a.workPath == "" {
		return
	}
	w, err := fsnotify.NewWatcher()
	if err != nil {
		return
	}
	stop := make(chan struct{})
	a.watcher = w
	a.watchStop = stop
	addWatchTree(w, a.workPath, a.workPath)
	go watchLoop(a.ctx, w, stop, a.workPath)
}

func (a *App) stopWatchLocked() {
	if a.watchStop != nil {
		close(a.watchStop)
		a.watchStop = nil
	}
	if a.watcher != nil {
		_ = a.watcher.Close()
		a.watcher = nil
	}
}

func watchLoop(ctx context.Context, w *fsnotify.Watcher, stop <-chan struct{}, repoRoot string) {
	timer := time.NewTimer(time.Hour)
	timer.Stop()
	armed := false
	defer timer.Stop()

	for {
		select {
		case <-stop:
			return
		case ev, ok := <-w.Events:
			if !ok {
				return
			}
			if watchIgnored(repoRoot, ev.Name) {
				continue
			}
			if ev.Has(fsnotify.Create) {
				if info, err := os.Stat(ev.Name); err == nil && info.IsDir() {
					addWatchTree(w, repoRoot, ev.Name)
				}
			}
			if !armed {
				timer.Reset(watchDebounce)
				armed = true
			} else {
				if !timer.Stop() {
					select {
					case <-timer.C:
					default:
					}
				}
				timer.Reset(watchDebounce)
			}
		case <-timer.C:
			armed = false
			if ctx != nil {
				runtime.EventsEmit(ctx, eventWorkdirChanged)
			}
		case _, ok := <-w.Errors:
			if !ok {
				return
			}
		}
	}
}
