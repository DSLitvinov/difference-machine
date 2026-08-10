package jsonapi

import (
	"io"
	"os"
)

func withSilencedCLIOutput(fn func() (interface{}, error)) (interface{}, error) {
	stdoutRead, stdoutWrite, err := os.Pipe()
	if err != nil {
		return fn()
	}
	stderrRead, stderrWrite, err := os.Pipe()
	if err != nil {
		_ = stdoutRead.Close()
		_ = stdoutWrite.Close()
		return fn()
	}

	prevStdout := os.Stdout
	prevStderr := os.Stderr
	os.Stdout = stdoutWrite
	os.Stderr = stderrWrite

	result, callErr := fn()

	_ = stdoutWrite.Close()
	_ = stderrWrite.Close()
	os.Stdout = prevStdout
	os.Stderr = prevStderr

	_, _ = io.Copy(io.Discard, stdoutRead)
	_, _ = io.Copy(io.Discard, stderrRead)
	_ = stdoutRead.Close()
	_ = stderrRead.Close()

	return result, callErr
}
