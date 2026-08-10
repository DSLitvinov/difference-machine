package jsonapi

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"strings"
)

// RunCLI executes a JSON API method from the forester CLI.
//
// Usage:
//
//	forester api <method> [--args '{}'] [-C path]
//	forester api -C path <method> [--args '{}']
//	echo '{"method":"status.get","args":{}}' | forester api
func RunCLI(args []string) error {
	workDir := "."
	argsJSON := "{}"
	var positional []string

	for i := 0; i < len(args); i++ {
		arg := args[i]
		switch arg {
		case "-C":
			if i+1 >= len(args) {
				return fmt.Errorf("flag -C requires a value")
			}
			workDir = args[i+1]
			i++
		case "--args":
			if i+1 >= len(args) {
				return fmt.Errorf("flag --args requires a value")
			}
			argsJSON = args[i+1]
			i++
		default:
			if strings.HasPrefix(arg, "-") {
				return fmt.Errorf("unknown flag: %s", arg)
			}
			positional = append(positional, arg)
		}
	}

	var method string
	if len(positional) > 0 {
		method = positional[0]
	}

	if method == "" {
		var req struct {
			Method string          `json:"method"`
			Args   json.RawMessage `json:"args"`
		}
		data, err := io.ReadAll(os.Stdin)
		if err != nil {
			return err
		}
		if len(strings.TrimSpace(string(data))) == 0 {
			return fmt.Errorf("usage: forester api <method> [--args '{}'] [-C path]")
		}
		if err := json.Unmarshal(data, &req); err != nil {
			return fmt.Errorf("invalid stdin JSON: %w", err)
		}
		method = req.Method
		if len(req.Args) > 0 {
			argsJSON = string(req.Args)
		}
	}

	if method == "" {
		return fmt.Errorf("method is required")
	}

	h := Open(workDir)
	defer Close(h)
	resp := Call(h, method, argsJSON)
	_, err := os.Stdout.Write(resp)
	return err
}
