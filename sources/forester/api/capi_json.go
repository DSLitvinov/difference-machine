//go:build cgo
// +build cgo

package main

/*
#include <stdlib.h>
*/
import "C"
import (
	"unsafe"

	"github.com/difference-machine/forester/internal/jsonapi"
)

//export ForesterOpen
func ForesterOpen(repoPath *C.char) unsafe.Pointer {
	path := C.GoString(repoPath)
	return unsafe.Pointer(jsonapi.Open(path))
}

//export ForesterCall
func ForesterCall(handle unsafe.Pointer, method *C.char, argsJSON *C.char) *C.char {
	h := jsonapi.Handle(uintptr(handle))
	resp := jsonapi.Call(h, C.GoString(method), C.GoString(argsJSON))
	return C.CString(string(resp))
}

//export ForesterFreeString
func ForesterFreeString(s unsafe.Pointer) {
	if s != nil {
		C.free(s)
	}
}

//export ForesterClose
func ForesterClose(handle unsafe.Pointer) {
	jsonapi.Close(jsonapi.Handle(uintptr(handle)))
}
