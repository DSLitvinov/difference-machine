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

	// Drain pipes while fn runs so writers (fmt / child tools inheriting fds) cannot fill
	// the OS pipe buffer and deadlock the merge.
	done := make(chan struct{}, 2)
	go func() {
		_, _ = io.Copy(io.Discard, stdoutRead)
		done <- struct{}{}
	}()
	go func() {
		_, _ = io.Copy(io.Discard, stderrRead)
		done <- struct{}{}
	}()

	result, callErr := fn()

	_ = stdoutWrite.Close()
	_ = stderrWrite.Close()
	os.Stdout = prevStdout
	os.Stderr = prevStderr

	<-done
	<-done
	_ = stdoutRead.Close()
	_ = stderrRead.Close()

	return result, callErr
}
