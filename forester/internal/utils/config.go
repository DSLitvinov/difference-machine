package utils

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// Config manages repository configuration
type Config struct {
	repoPath   string
	configPath string
	config     map[string]map[string]string
}

// NewConfig creates a new Config instance
func NewConfig(repoPath string) *Config {
	configPath := filepath.Join(repoPath, ".DFM", "config")
	cfg := &Config{
		repoPath:   repoPath,
		configPath: configPath,
		config:     make(map[string]map[string]string),
	}
	cfg.Load()
	return cfg
}

// Load loads configuration from file
func (c *Config) Load() {
	c.config = make(map[string]map[string]string)

	if !Exists(c.configPath) {
		return
	}

	file, err := os.Open(c.configPath)
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	currentSection := ""

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		c.parseLine(line, &currentSection)
	}
}

// parseLine parses a configuration line
func (c *Config) parseLine(line string, currentSection *string) {
	// Remove comments
	if idx := strings.Index(line, "#"); idx >= 0 {
		line = line[:idx]
	}
	line = strings.TrimSpace(line)

	if line == "" {
		return
	}

	// Check for section [section]
	if strings.HasPrefix(line, "[") && strings.HasSuffix(line, "]") {
		*currentSection = line[1 : len(line)-1]
		return
	}

	// Parse key = value
	parts := strings.SplitN(line, "=", 2)
	if len(parts) != 2 {
		return
	}

	key := strings.TrimSpace(parts[0])
	value := strings.TrimSpace(parts[1])

	if *currentSection == "" {
		*currentSection = "core"
	}

	if c.config[*currentSection] == nil {
		c.config[*currentSection] = make(map[string]string)
	}

	c.config[*currentSection][key] = value
}

// Get gets a configuration value
func (c *Config) Get(section, key, defaultValue string) string {
	sectionMap, ok := c.config[section]
	if !ok {
		return defaultValue
	}

	value, ok := sectionMap[key]
	if !ok {
		return defaultValue
	}

	return value
}

// Set sets a configuration value
func (c *Config) Set(section, key, value string) {
	if c.config[section] == nil {
		c.config[section] = make(map[string]string)
	}
	c.config[section][key] = value
}

// GetUserName gets the user name from config or environment
func (c *Config) GetUserName() string {
	name := c.Get("user", "name", "")
	if name == "" {
		if envName := os.Getenv("FORESTER_AUTHOR"); envName != "" {
			return envName
		}
	}
	return name
}

// GetUserEmail gets the user email
func (c *Config) GetUserEmail() string {
	return c.Get("user", "email", "")
}

// SetUserName sets the user name
func (c *Config) SetUserName(name string) {
	c.Set("user", "name", name)
}

// SetUserEmail sets the user email
func (c *Config) SetUserEmail(email string) {
	c.Set("user", "email", email)
}

// Save saves configuration to file
func (c *Config) Save() error {
	var content strings.Builder

	for section, keys := range c.config {
		content.WriteString(fmt.Sprintf("[%s]\n", section))
		for key, value := range keys {
			content.WriteString(fmt.Sprintf("    %s = %s\n", key, value))
		}
		content.WriteString("\n")
	}

	return WriteFileString(c.configPath, content.String())
}

