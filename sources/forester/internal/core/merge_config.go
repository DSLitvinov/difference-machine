package core

import (
	"path/filepath"
	"strings"

	"github.com/difference-machine/forester/internal/utils"
)

// StructuredMergeDriver describes optional object-level merge for binary DCC files.
// Invocation is handled by the DCC addon (e.g. Blender merge_apply_background.py),
// not by the Forester CLI, because each Blender version ships its own Python API.
type StructuredMergeDriver struct {
	Pattern        string
	Driver         string
	ManifestSuffix string
}

// MergeConfig resolves merge strategies from repository config.
type MergeConfig struct {
	binaryPatterns     []string
	structuredByPattern []StructuredMergeDriver
}

// NewMergeConfig loads merge settings from .DFM/config.
func NewMergeConfig(repoPath string) *MergeConfig {
	cfg := utils.NewConfig(repoPath)
	mc := &MergeConfig{
		binaryPatterns: parsePatternList(cfg.Get("merge", "binary", defaultBinaryPatterns())),
	}
	if pattern := cfg.Get("merge \"blend\"", "pattern", "*.blend"); pattern != "" {
		mc.structuredByPattern = append(mc.structuredByPattern, StructuredMergeDriver{
			Pattern:        pattern,
			Driver:         cfg.Get("merge \"blend\"", "structured", "blender-objects"),
			ManifestSuffix: cfg.Get("merge \"blend\"", "manifest_suffix", ".manifest.json"),
		})
	}
	return mc
}

func defaultBinaryPatterns() string {
	return "*.blend,*.fbx,*.png,*.jpg,*.jpeg,*.gif,*.webp,*.wav,*.mp3,*.exr,*.psd,*.tif,*.tiff,*.zip,*.dll,*.so,*.dylib"
}

func parsePatternList(raw string) []string {
	parts := strings.Split(raw, ",")
	var patterns []string
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			patterns = append(patterns, part)
		}
	}
	return patterns
}

func matchPattern(pattern, path string) bool {
	matched, err := filepath.Match(strings.ToLower(pattern), strings.ToLower(filepath.Base(path)))
	return err == nil && matched
}

// IsBinaryMergePath reports whether a path should use whole-file binary merge.
func (mc *MergeConfig) IsBinaryMergePath(path string) bool {
	for _, pattern := range mc.binaryPatterns {
		if matchPattern(pattern, path) {
			return true
		}
	}
	return false
}

// StructuredDriver returns optional structured merge settings for a path.
func (mc *MergeConfig) StructuredDriver(path string) (*StructuredMergeDriver, bool) {
	for i := range mc.structuredByPattern {
		driver := mc.structuredByPattern[i]
		if matchPattern(driver.Pattern, path) {
			copy := driver
			return &copy, true
		}
	}
	return nil, false
}

// IsTextMergePath reports whether a path should use line-based text merge.
func (mc *MergeConfig) IsTextMergePath(path string) bool {
	if mc.IsBinaryMergePath(path) {
		return false
	}
	ext := strings.ToLower(filepath.Ext(path))
	switch ext {
	case ".py", ".go", ".js", ".ts", ".tsx", ".jsx", ".json", ".md", ".txt", ".yaml", ".yml", ".toml", ".ini", ".cfg", ".sh", ".bat", ".cs", ".cpp", ".h", ".hpp", ".c", ".rs", ".java", ".xml", ".html", ".css", ".scss", ".qml":
		return true
	default:
		return false
	}
}
