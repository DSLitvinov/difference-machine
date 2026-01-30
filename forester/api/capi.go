//go:build cgo
// +build cgo

package main

/*
#include <stdlib.h>
#include <string.h>

// C Structures (must match forester.h)
typedef struct {
    int success;
    char* error;
} ForesterResult;
*/
import "C"

// All API functions are in capi_structured.go
// This file is kept for potential future use

func main() {
	// This is a library, main is not used
}
