package commands

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// Config manages global configuration in ~/.dfm/setup.cfg
func Config(args []string) error {
	if len(args) == 0 {
		return fmt.Errorf("usage: config --global <key> <value> or config --list")
	}

	// Get global config path
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return fmt.Errorf("failed to get home directory: %w", err)
	}

	configPath := filepath.Join(homeDir, ".dfm", "setup.cfg")

	// Parse arguments
	if args[0] == "--list" || args[0] == "-l" {
		if len(args) > 1 {
			return fmt.Errorf("usage: config --list")
		}
		return listConfig(configPath)
	}

	if args[0] == "--global" || args[0] == "-g" {
		if len(args) < 3 {
			return fmt.Errorf("usage: config --global <key> <value>")
		}
		if len(args) > 3 {
			return fmt.Errorf("usage: config --global <key> <value>")
		}

		key := args[1]
		value := args[2]

		// Remove quotes if present
		value = strings.Trim(value, `"`)

		// Parse key (can be "user.name", "gc.interval.day", etc.)
		return setConfig(configPath, key, value)
	}

	return fmt.Errorf("unknown option: %s", args[0])
}

// listConfig lists all configuration values
func listConfig(configPath string) error {
	if !fileExists(configPath) {
		fmt.Println("No configuration file found at", configPath)
		return nil
	}

	config, err := loadConfig(configPath)
	if err != nil {
		return fmt.Errorf("failed to load config: %w", err)
	}

	if len(config) == 0 {
		fmt.Println("No configuration found")
		return nil
	}

	// Print all sections and keys
	for section, keys := range config {
		fmt.Printf("[%s]\n", section)
		for key, value := range keys {
			fmt.Printf("  %s = %s\n", key, value)
		}
		fmt.Println()
	}

	return nil
}

// setConfig sets a configuration value
func setConfig(configPath string, key, value string) error {
	// Parse key format: "section.key" or "section.subsection.key"
	// Examples: "user.name", "user.email", "gc.interval.day"
	parts := strings.Split(key, ".")
	if len(parts) < 2 {
		return fmt.Errorf("invalid key format: %s (expected: section.key or section.subsection.key)", key)
	}

	// Determine section and key
	var section string
	var configKey string

	if len(parts) == 2 {
		// Simple format: section.key
		section = parts[0]
		configKey = parts[1]
	} else if len(parts) == 3 {
		// Format: section.subsection.key
		// For gc.interval.day, section is "gc", key is "interval.day"
		section = parts[0]
		configKey = strings.Join(parts[1:], ".")
	} else {
		// More complex: take first as section, rest as key
		section = parts[0]
		configKey = strings.Join(parts[1:], ".")
	}

	// Load existing config
	config, err := loadConfig(configPath)
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to load config: %w", err)
	}

	if config == nil {
		config = make(map[string]map[string]string)
	}

	// Set value
	if config[section] == nil {
		config[section] = make(map[string]string)
	}
	config[section][configKey] = value

	// Save config
	return saveConfig(configPath, config)
}

// loadConfig loads configuration from INI file
func loadConfig(configPath string) (map[string]map[string]string, error) {
	config := make(map[string]map[string]string)

	if !fileExists(configPath) {
		return config, nil
	}

	file, err := os.Open(configPath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	currentSection := ""

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())

		// Remove comments
		if idx := strings.Index(line, "#"); idx >= 0 {
			line = line[:idx]
			line = strings.TrimSpace(line)
		}

		if line == "" {
			continue
		}

		// Check for section [section]
		if strings.HasPrefix(line, "[") && strings.HasSuffix(line, "]") {
			currentSection = line[1 : len(line)-1]
			if config[currentSection] == nil {
				config[currentSection] = make(map[string]string)
			}
			continue
		}

		// Parse key = value
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}

		key := strings.TrimSpace(parts[0])
		value := strings.TrimSpace(parts[1])

		// Remove quotes if present
		value = strings.Trim(value, `"`)

		if currentSection == "" {
			currentSection = "core"
		}

		if config[currentSection] == nil {
			config[currentSection] = make(map[string]string)
		}

		config[currentSection][key] = value
	}

	return config, scanner.Err()
}

// saveConfig saves configuration to INI file
func saveConfig(configPath string, config map[string]map[string]string) error {
	// Ensure directory exists
	dir := filepath.Dir(configPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create config directory: %w", err)
	}

	// Build content
	var content strings.Builder

	// Define section order for better readability
	sectionOrder := []string{"user", "gc", "forester", "python_bindings", "plugins", "difference machine gui"}

	// Write sections in order
	writtenSections := make(map[string]bool)
	for _, section := range sectionOrder {
		if keys, exists := config[section]; exists {
			content.WriteString(fmt.Sprintf("[%s]\n", section))
			for key, value := range keys {
				// Add quotes if value contains spaces
				if strings.Contains(value, " ") {
					content.WriteString(fmt.Sprintf("%s = \"%s\"\n", key, value))
				} else {
					content.WriteString(fmt.Sprintf("%s = %s\n", key, value))
				}
			}
			content.WriteString("\n")
			writtenSections[section] = true
		}
	}

	// Write remaining sections
	for section, keys := range config {
		if !writtenSections[section] {
			content.WriteString(fmt.Sprintf("[%s]\n", section))
			for key, value := range keys {
				if strings.Contains(value, " ") {
					content.WriteString(fmt.Sprintf("%s = \"%s\"\n", key, value))
				} else {
					content.WriteString(fmt.Sprintf("%s = %s\n", key, value))
				}
			}
			content.WriteString("\n")
		}
	}

	// Write to file
	return os.WriteFile(configPath, []byte(content.String()), 0644)
}

// fileExists checks if a file exists
func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}
