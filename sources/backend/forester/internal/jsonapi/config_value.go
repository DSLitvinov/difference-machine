package jsonapi

import "strings"

func sanitizeConfigValue(value string) string {
	value = strings.TrimSpace(value)
	for len(value) >= 2 && value[0] == '"' && value[len(value)-1] == '"' {
		value = strings.TrimSpace(value[1 : len(value)-1])
	}
	return value
}
