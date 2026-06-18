package utils

import (
	"os"
	"strings"
)

// Color codes
const (
	ColorReset  = "\033[0m"
	ColorRed    = "\033[31m"
	ColorGreen  = "\033[32m"
	ColorYellow = "\033[33m"
	ColorBlue   = "\033[34m"
	ColorCyan   = "\033[36m"
	ColorBold   = "\033[1m"
)

var (
	colorEnabled = true
	colorChecked = false
)

// IsColorEnabled checks whether color output is enabled
func IsColorEnabled() bool {
	if colorChecked {
		return colorEnabled
	}
	colorChecked = true

	// Check NO_COLOR environment variable
	if os.Getenv("NO_COLOR") != "" {
		colorEnabled = false
		return false
	}

	// Check FORESTER_COLOR environment variable
	if colorEnv := os.Getenv("FORESTER_COLOR"); colorEnv != "" {
		colorEnabled = strings.ToLower(colorEnv) == "always" ||
			(strings.ToLower(colorEnv) == "auto" && isTerminal())
		return colorEnabled
	}

	// Auto-detect (terminal only)
	colorEnabled = isTerminal()
	return colorEnabled
}

// SetColorEnabled forces color output state
func SetColorEnabled(enabled bool) {
	colorEnabled = enabled
	colorChecked = true
}

// isTerminal checks whether stdout is a terminal
func isTerminal() bool {
	fileInfo, err := os.Stdout.Stat()
	if err != nil {
		return false
	}
	return (fileInfo.Mode() & os.ModeCharDevice) != 0
}

// Colorize applies color to text
func Colorize(text string, colorCode string) string {
	if !IsColorEnabled() {
		return text
	}
	return colorCode + text + ColorReset
}

// Red returns red text
func Red(text string) string {
	return Colorize(text, ColorRed)
}

// Green returns green text
func Green(text string) string {
	return Colorize(text, ColorGreen)
}

// Yellow returns yellow text
func Yellow(text string) string {
	return Colorize(text, ColorYellow)
}

// Blue returns blue text
func Blue(text string) string {
	return Colorize(text, ColorBlue)
}

// Cyan returns cyan text
func Cyan(text string) string {
	return Colorize(text, ColorCyan)
}

// Bold returns bold text
func Bold(text string) string {
	return Colorize(text, ColorBold)
}
