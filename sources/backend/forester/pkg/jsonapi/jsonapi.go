// Package jsonapi exposes the Forester JSON API to external Go consumers (e.g. GUI).
package jsonapi

import internal "github.com/difference-machine/forester/internal/jsonapi"

// Handle identifies an open Forester API session.
type Handle = internal.Handle

// Open creates a session bound to a repository working directory.
func Open(workPath string) Handle {
	return internal.Open(workPath)
}

// Close releases a session handle.
func Close(h Handle) {
	internal.Close(h)
}

// Call dispatches a JSON API method for the given session handle.
func Call(h Handle, method, argsJSON string) []byte {
	return internal.Call(h, method, argsJSON)
}

// CallStateless dispatches a method using repo_path from args or workPath.
func CallStateless(workPath, method, argsJSON string) []byte {
	return internal.CallStateless(workPath, method, argsJSON)
}
