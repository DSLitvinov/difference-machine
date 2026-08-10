//go:build !windows

package jsonapi

import "os/exec"

func configureHiddenExec(cmd *exec.Cmd) {}
