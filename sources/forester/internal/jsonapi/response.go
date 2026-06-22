package jsonapi

import "encoding/json"

// Response is the JSON envelope returned by every API call.
type Response struct {
	OK     bool            `json:"ok"`
	Error  string          `json:"error,omitempty"`
	Result json.RawMessage `json:"result,omitempty"`
}

func marshalOK(result interface{}) []byte {
	data, err := json.Marshal(Response{OK: true, Result: mustRaw(result)})
	if err != nil {
		return marshalErr(err.Error())
	}
	return data
}

func marshalErr(msg string) []byte {
	data, _ := json.Marshal(Response{OK: false, Error: msg})
	return data
}

func mustRaw(v interface{}) json.RawMessage {
	if v == nil {
		return json.RawMessage("null")
	}
	data, err := json.Marshal(v)
	if err != nil {
		panic(err)
	}
	return data
}
