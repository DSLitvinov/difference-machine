package utils

import (
	"encoding/json"
	"path/filepath"
	"strings"
)

// FindBlendFiles finds .blend files in a directory
func FindBlendFiles(directory string, recursive bool) ([]string, error) {
	var blendFiles []string

	var files []string
	var err error
	if recursive {
		files, err = ListFiles(directory, true)
	} else {
		files, err = ListFiles(directory, false)
	}

	if err != nil {
		return nil, err
	}

	for _, filePath := range files {
		// ListFiles returns absolute paths, so use them directly
		if IsFile(filePath) {
			ext := strings.ToLower(filepath.Ext(filePath))
			if ext == ".blend" {
				blendFiles = append(blendFiles, filePath)
			}
		}
	}

	return blendFiles, nil
}

// ExtractMetadata extracts metadata from a .blend file
// TODO: Integration with Blender for actual metadata extraction
func ExtractMetadata(blendPath string) string {
	// Return basic structure for now
	metadata := map[string]interface{}{
		"blend_file":    GetFilename(blendPath),
		"path":          blendPath,
		"mesh_json":     "{}",
		"material_json": "{}",
		"textures":      []string{},
	}

	data, err := json.Marshal(metadata)
	if err != nil {
		return "{}"
	}
	return string(data)
}

// FindTextures finds textures for a mesh from metadata JSON
func FindTextures(blendDir, metadataJSON string) ([]string, error) {
	var textures []string

	var metadata map[string]interface{}
	if err := json.Unmarshal([]byte(metadataJSON), &metadata); err != nil {
		return textures, nil
	}

	texturesInterface, ok := metadata["textures"]
	if !ok {
		return textures, nil
	}

	texturesArray, ok := texturesInterface.([]interface{})
	if !ok {
		return textures, nil
	}

	for _, tex := range texturesArray {
		texturePath, ok := tex.(string)
		if !ok {
			continue
		}

		// Make absolute path if needed
		if !filepath.IsAbs(texturePath) {
			texturePath = filepath.Join(blendDir, texturePath)
		}

		if Exists(texturePath) {
			textures = append(textures, texturePath)
		}
	}

	return textures, nil
}

// CreateMeshMetadata creates JSON metadata for a mesh
func CreateMeshMetadata(blendPath string, texturePaths []string) string {
	metadata := map[string]interface{}{
		"blend_file":    GetFilename(blendPath),
		"path":          blendPath,
		"mesh_json":     "{}",
		"material_json": "{}",
		"textures":      texturePaths,
	}

	data, err := json.Marshal(metadata)
	if err != nil {
		return "{}"
	}
	return string(data)
}
