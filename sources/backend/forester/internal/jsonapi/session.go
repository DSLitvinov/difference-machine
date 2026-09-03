package jsonapi

import (
	"sync"
	"sync/atomic"
)

// Handle identifies an open Forester API session.
type Handle uintptr

type session struct {
	workPath string
}

var (
	nextHandle uintptr = 1
	sessions   sync.Map
)

// Open creates a session bound to a working directory (project root).
func Open(workPath string) Handle {
	if workPath == "" {
		workPath = "."
	}
	h := Handle(atomic.AddUintptr(&nextHandle, 1))
	sessions.Store(h, &session{workPath: workPath})
	return h
}

// Close releases a session handle.
func Close(h Handle) {
	sessions.Delete(h)
}

func lookup(h Handle) (*session, bool) {
	v, ok := sessions.Load(h)
	if !ok {
		return nil, false
	}
	return v.(*session), true
}
