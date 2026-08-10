//go:build darwin

package jsonapi

import (
	"os"
	"syscall"
	"time"
)

func fileCreatedUnix(info os.FileInfo) (int64, bool) {
	if info == nil {
		return 0, false
	}
	stat, ok := info.Sys().(*syscall.Stat_t)
	if !ok || stat == nil {
		return 0, false
	}
	birth := stat.Birthtimespec
	if birth.Sec == 0 && birth.Nsec == 0 {
		return 0, false
	}
	return time.Unix(birth.Sec, birth.Nsec).Unix(), true
}
