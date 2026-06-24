//go:build !darwin

package jsonapi

import "os"

func fileCreatedUnix(info os.FileInfo) (int64, bool) {
	return 0, false
}
