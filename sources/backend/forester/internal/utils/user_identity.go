package utils

import (
	"bufio"
	"os"
	"path/filepath"
	"strings"
)

// GlobalSetupConfigPath returns ~/.dfm/setup.cfg.
func GlobalSetupConfigPath() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	return filepath.Join(home, ".dfm", "setup.cfg")
}

// LoadUserIdentity reads [user].name and [user].email from an INI-style config file.
func LoadUserIdentity(configPath string) (name, email string) {
	if configPath == "" || !Exists(configPath) {
		return "", ""
	}

	file, err := os.Open(configPath)
	if err != nil {
		return "", ""
	}
	defer file.Close()

	inUserSection := false
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if idx := strings.Index(line, "#"); idx >= 0 {
			line = strings.TrimSpace(line[:idx])
		}
		if line == "" {
			continue
		}
		if strings.HasPrefix(line, "[") && strings.HasSuffix(line, "]") {
			inUserSection = line == "[user]"
			continue
		}
		if !inUserSection {
			continue
		}

		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.TrimSpace(parts[0])
		value := sanitizeUserConfigValue(strings.TrimSpace(parts[1]))
		switch key {
		case "name":
			name = value
		case "email":
			email = value
		}
	}
	return name, email
}

func sanitizeUserConfigValue(value string) string {
	for len(value) >= 2 && value[0] == '"' && value[len(value)-1] == '"' {
		value = strings.TrimSpace(value[1 : len(value)-1])
	}
	return value
}
