//go:build !unix

package utils

import "sync"

var pathLocks sync.Map

func withPathLock(path string, fn func() error) error {
	muIface, _ := pathLocks.LoadOrStore(path, &sync.Mutex{})
	mu := muIface.(*sync.Mutex)
	mu.Lock()
	defer mu.Unlock()
	return fn()
}
