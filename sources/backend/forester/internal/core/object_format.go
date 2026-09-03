package core

import (
	"bytes"
	"fmt"
	"strings"
)

// Object types stored in the unified object store.
const (
	ObjectTypeBlob   = "blob"
	ObjectTypeTree   = "tree"
	ObjectTypeCommit = "commit"
	ObjectTypeTag    = "tag"
)

// encodeObject wraps payload with a type header line for the unified object store.
func encodeObject(objectType string, payload []byte) []byte {
	var buf bytes.Buffer
	buf.WriteString(objectType)
	buf.WriteByte('\n')
	buf.Write(payload)
	return buf.Bytes()
}

// decodeObject splits a stored object file into type and payload.
func decodeObject(data []byte) (objectType string, payload []byte, err error) {
	idx := bytes.IndexByte(data, '\n')
	if idx < 0 {
		return "", nil, fmt.Errorf("invalid object format: missing type header")
	}
	objectType = strings.TrimSpace(string(data[:idx]))
	if objectType == "" {
		return "", nil, fmt.Errorf("invalid object format: empty type")
	}
	payload = data[idx+1:]
	return objectType, payload, nil
}
