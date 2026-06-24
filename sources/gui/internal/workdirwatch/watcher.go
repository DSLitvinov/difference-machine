package workdirwatch

import (
	"context"
	"os"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
)

const debounceDelay = 300 * time.Millisecond

// Watcher observes filesystem changes under a repository workdir and invokes onChange after debounce.
type Watcher struct {
	onChange func()

	mu     sync.Mutex
	cancel context.CancelFunc
}

// New creates a watcher that calls onChange when relevant workdir files change.
func New(onChange func()) *Watcher {
	return &Watcher{onChange: onChange}
}

// Start watches repoPath recursively. Previous watches are stopped.
func (w *Watcher) Start(repoPath string) error {
	w.Stop()

	fs, err := fsnotify.NewWatcher()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithCancel(context.Background())
	w.mu.Lock()
	w.cancel = cancel
	w.mu.Unlock()

	if err := addWatchTree(fs, repoPath); err != nil {
		_ = fs.Close()
		cancel()
		return err
	}

	go w.loop(ctx, fs, repoPath)
	return nil
}

// Stop tears down the active watcher, if any.
func (w *Watcher) Stop() {
	w.mu.Lock()
	cancel := w.cancel
	w.cancel = nil
	w.mu.Unlock()
	if cancel != nil {
		cancel()
	}
}

func (w *Watcher) loop(ctx context.Context, fs *fsnotify.Watcher, repoPath string) {
	defer fs.Close()

	var debounceMu sync.Mutex
	var debounceTimer *time.Timer

	schedule := func() {
		debounceMu.Lock()
		defer debounceMu.Unlock()
		if debounceTimer != nil {
			debounceTimer.Stop()
		}
		debounceTimer = time.AfterFunc(debounceDelay, func() {
			select {
			case <-ctx.Done():
				return
			default:
				w.onChange()
			}
		})
	}

	for {
		select {
		case <-ctx.Done():
			debounceMu.Lock()
			if debounceTimer != nil {
				debounceTimer.Stop()
			}
			debounceMu.Unlock()
			return
		case event, ok := <-fs.Events:
			if !ok {
				return
			}
			if event.Op&fsnotify.Chmod == event.Op && event.Op&^(fsnotify.Chmod) == 0 {
				continue
			}
			if shouldSkipEvent(repoPath, event.Name) {
				continue
			}
			if event.Op&fsnotify.Create != 0 {
				if info, err := os.Stat(event.Name); err == nil && info.IsDir() && !shouldSkipEvent(repoPath, event.Name) {
					_ = fs.Add(event.Name)
				}
			}
			schedule()
		case _, ok := <-fs.Errors:
			if !ok {
				return
			}
		}
	}
}
