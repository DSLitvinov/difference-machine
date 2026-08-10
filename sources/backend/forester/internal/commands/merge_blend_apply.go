package commands

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/models"
	"github.com/difference-machine/forester/internal/utils"
)

type mergeObjectJSON struct {
	ObjectName string            `json:"object_name"`
	ObjectType string            `json:"object_type"`
	Tags       []string          `json:"tags"`
	Metadata   map[string]string `json:"metadata"`
}

func removeConflictByPath(conflicts []ConflictInfo, path string) []ConflictInfo {
	if len(conflicts) == 0 {
		return conflicts
	}
	out := make([]ConflictInfo, 0, len(conflicts))
	for _, conflict := range conflicts {
		if conflict.Path != path {
			out = append(out, conflict)
		}
	}
	return out
}

func containsConflictPath(conflicts []ConflictInfo, path string) bool {
	for _, conflict := range conflicts {
		if conflict.Path == path {
			return true
		}
	}
	return false
}

func blenderConfig() (executable string, mergeScript string) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", ""
	}
	config, err := loadConfig(filepath.Join(home, ".dfm", "setup.cfg"))
	if err != nil {
		return "", ""
	}
	blenderSection := config["blender"]
	foresterSection := config["forester"]
	if blenderSection == nil {
		blenderSection = map[string]string{}
	}
	executable = strings.TrimSpace(blenderSection["path"])
	mergeScript = strings.TrimSpace(blenderSection["merge_apply_script"])
	foresterCLI := ""
	if foresterSection != nil {
		foresterCLI = strings.TrimSpace(foresterSection["path"])
	}
	if mergeScript == "" {
		mergeScript = resolveMergeApplyScript(executable, foresterCLI)
	}
	return executable, mergeScript
}

var mergeApplyScriptCandidates = []string{
	"share/scripts/merge_apply_background.py",
	"../share/scripts/merge_apply_background.py",
	"scripts/merge_apply_background.py",
	"../scripts/merge_apply_background.py",
	"../../scripts/merge_apply_background.py",
	"sources/forester/scripts/merge_apply_background.py",
}

func resolveMergeApplyScriptFromDir(startDir string) string {
	dir := filepath.Clean(startDir)
	for i := 0; i < 8; i++ {
		for _, rel := range mergeApplyScriptCandidates {
			candidate := filepath.Join(dir, rel)
			if utils.Exists(candidate) {
				return candidate
			}
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	return ""
}

func resolveMergeApplyScript(blenderPath, foresterCLI string) string {
	if env := strings.TrimSpace(os.Getenv("DFM_MERGE_APPLY_SCRIPT")); env != "" && utils.Exists(env) {
		return env
	}

	if foresterCLI != "" {
		if script := resolveMergeApplyScriptFromDir(filepath.Dir(foresterCLI)); script != "" {
			return script
		}
	}

	if blenderPath != "" {
		if script := resolveMergeApplyScriptFromDir(filepath.Dir(blenderPath)); script != "" {
			return script
		}
	}

	if exe, err := os.Executable(); err == nil {
		if script := resolveMergeApplyScriptFromDir(filepath.Dir(exe)); script != "" {
			return script
		}
	}

	if cwd, err := os.Getwd(); err == nil {
		if script := resolveMergeApplyScriptFromDir(cwd); script != "" {
			return script
		}
	}

	return ""
}

func taggedObjectsForBlendMerge(repo *core.Repository, currentHead, targetHead, filePath string) ([]*models.Object, error) {
	filePath = filepath.ToSlash(filePath)
	byName := make(map[string]*models.Object)
	mergeTagged := func(objects []*models.Object) {
		for _, obj := range objects {
			if obj == nil || len(obj.Tags) == 0 {
				continue
			}
			if filepath.ToSlash(obj.FilePath) != filePath {
				continue
			}
			existing, ok := byName[obj.ObjectName]
			if !ok || obj.UpdatedAt > existing.UpdatedAt {
				byName[obj.ObjectName] = obj
			}
		}
	}

	for _, commitHash := range []string{currentHead, targetHead} {
		if commitHash == "" {
			continue
		}
		objects, err := repo.Manifests.GetObjectsByFile(commitHash, filePath)
		if err != nil {
			return nil, err
		}
		mergeTagged(objects)
	}

	if len(byName) == 0 {
		objects, err := repo.Manifests.FindObjectsByFileAcrossCommits(filePath)
		if err != nil {
			return nil, err
		}
		mergeTagged(objects)
	}

	tagged := make([]*models.Object, 0, len(byName))
	for _, obj := range byName {
		tagged = append(tagged, obj)
	}
	return tagged, nil
}

func ensureTheirsBlendStaging(repoPath, relPath, theirBlobHash string, storage *core.Storage) error {
	if theirBlobHash == "" {
		return nil
	}
	theirsPath := filepath.Join(repoPath, ".DFM", "merge_theirs", relPath)
	if utils.Exists(theirsPath) {
		return nil
	}
	if err := utils.EnsureDirectory(filepath.Dir(theirsPath)); err != nil {
		return err
	}
	return storage.WriteBlobToFile(theirBlobHash, theirsPath)
}

func hasMergeTag(objects []*models.Object) bool {
	for _, obj := range objects {
		for _, tag := range obj.Tags {
			if strings.EqualFold(tag, "MERGE") {
				return true
			}
		}
	}
	return false
}

func writeMergeObjectsJSON(repoPath string, objects []*models.Object) (string, error) {
	payload := make([]mergeObjectJSON, 0, len(objects))
	for _, obj := range objects {
		if obj == nil {
			continue
		}
		payload = append(payload, mergeObjectJSON{
			ObjectName: obj.ObjectName,
			ObjectType: obj.ObjectType,
			Tags:       obj.Tags,
			Metadata:   obj.Metadata,
		})
	}
	data, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	tempPath := filepath.Join(repoPath, ".DFM", fmt.Sprintf("merge_objects_%d.json", time.Now().UnixNano()))
	if err := os.WriteFile(tempPath, data, 0o644); err != nil {
		return "", err
	}
	return tempPath, nil
}

func applyBlendMergeMarks(
	repoPath, relPath, currentHead, targetHead, theirBlobHash string,
	repo *core.Repository,
	storage *core.Storage,
) (bool, error) {
	if !strings.HasSuffix(strings.ToLower(relPath), ".blend") {
		return false, nil
	}

	tagged, err := taggedObjectsForBlendMerge(repo, currentHead, targetHead, relPath)
	if err != nil {
		return false, err
	}
	if len(tagged) == 0 {
		return false, nil
	}

	blenderExecutable, mergeScript := blenderConfig()
	if blenderExecutable == "" {
		return false, fmt.Errorf("blender.path is not configured in ~/.dfm/setup.cfg")
	}
	if mergeScript == "" {
		return false, fmt.Errorf("merge apply script not found (set blender.merge_apply_script in ~/.dfm/setup.cfg)")
	}
	if !utils.Exists(mergeScript) {
		return false, fmt.Errorf("merge apply script not found: %s", mergeScript)
	}

	blendPath := filepath.Join(repoPath, relPath)
	theirsBlend := filepath.Join(repoPath, ".DFM", "merge_theirs", relPath)
	if hasMergeTag(tagged) {
		if err := ensureTheirsBlendStaging(repoPath, relPath, theirBlobHash, storage); err != nil {
			return false, fmt.Errorf("failed to stage theirs .blend for %s: %w", relPath, err)
		}
		if !utils.Exists(theirsBlend) {
			return false, fmt.Errorf("theirs .blend not found: .DFM/merge_theirs/%s", relPath)
		}
	} else {
		theirsBlend = blendPath
	}

	objectsJSON, err := writeMergeObjectsJSON(repoPath, tagged)
	if err != nil {
		return false, err
	}
	defer os.Remove(objectsJSON)

	cmd := exec.Command(
		blenderExecutable,
		"--background",
		blendPath,
		"--python",
		mergeScript,
		"--",
		"--objects_json",
		objectsJSON,
		"--theirs_blend",
		theirsBlend,
		"--repo_path",
		repoPath,
		"--output_file",
		blendPath,
	)
	output, err := cmd.CombinedOutput()
	if err != nil {
		details := strings.TrimSpace(string(output))
		if details == "" {
			return false, fmt.Errorf("blend merge apply failed for %s: %w", relPath, err)
		}
		lines := strings.Split(details, "\n")
		return false, fmt.Errorf("blend merge apply failed for %s: %s", relPath, lines[len(lines)-1])
	}
	return true, nil
}

// finishBlendFileMerge applies object marks to a .blend on disk and optionally updates the index.
func finishBlendFileMerge(
	repoPath, relPath, currentHead, targetHead, theirBlobHash string,
	repo *core.Repository,
	storage *core.Storage,
	index *core.Index,
) (bool, error) {
	if !strings.HasSuffix(strings.ToLower(relPath), ".blend") {
		return false, nil
	}

	tagged, err := taggedObjectsForBlendMerge(repo, currentHead, targetHead, relPath)
	if err != nil {
		return false, err
	}
	if len(tagged) == 0 {
		return false, nil
	}

	applied, err := applyBlendMergeMarks(repoPath, relPath, currentHead, targetHead, theirBlobHash, repo, storage)
	if err != nil {
		return false, err
	}
	if !applied {
		return false, fmt.Errorf("failed to apply %d object mark(s) for %s", len(tagged), relPath)
	}

	fullPath := filepath.Join(repoPath, relPath)
	hash, err := core.HashFile(fullPath)
	if err != nil {
		return false, fmt.Errorf("failed to hash merged blend %s: %w", relPath, err)
	}
	if _, err := storage.StoreBlobFromFile(fullPath); err != nil {
		return false, fmt.Errorf("failed to store merged blend %s: %w", relPath, err)
	}
	if index != nil {
		if err := index.Add(fullPath, hash); err != nil {
			return false, err
		}
	}
	fmt.Fprintf(os.Stderr, "Applied object merge marks for %s\n", relPath)
	return true, nil
}

func mergeStateConflictPaths(state map[string]interface{}) []string {
	raw, ok := state["conflicts"]
	if !ok || raw == nil {
		return nil
	}
	items, ok := raw.([]interface{})
	if !ok {
		return nil
	}
	paths := make([]string, 0, len(items))
	for _, item := range items {
		entry, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		path := ""
		if value, ok := entry["path"].(string); ok {
			path = value
		} else if value, ok := entry["Path"].(string); ok {
			path = value
		}
		path = strings.TrimSpace(path)
		if path != "" {
			paths = append(paths, path)
		}
	}
	return paths
}

func conflictsFromState(state map[string]interface{}) []ConflictInfo {
	raw, ok := state["conflicts"]
	if !ok || raw == nil {
		return nil
	}
	items, ok := raw.([]interface{})
	if !ok {
		return nil
	}
	conflicts := make([]ConflictInfo, 0, len(items))
	for _, item := range items {
		entry, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		path := ""
		if value, ok := entry["path"].(string); ok {
			path = value
		} else if value, ok := entry["Path"].(string); ok {
			path = value
		}
		if strings.TrimSpace(path) == "" {
			continue
		}
		conflict := ConflictInfo{Path: path}
		if value, ok := entry["base_hash"].(string); ok {
			conflict.BaseHash = value
		} else if value, ok := entry["BaseHash"].(string); ok {
			conflict.BaseHash = value
		}
		if value, ok := entry["our_hash"].(string); ok {
			conflict.OurHash = value
		} else if value, ok := entry["OurHash"].(string); ok {
			conflict.OurHash = value
		}
		if value, ok := entry["their_hash"].(string); ok {
			conflict.TheirHash = value
		} else if value, ok := entry["TheirHash"].(string); ok {
			conflict.TheirHash = value
		}
		conflicts = append(conflicts, conflict)
	}
	return conflicts
}

func tryResolveBlendMergeConflicts(
	repoPath string,
	state map[string]interface{},
	currentHead, targetHead, branchToMerge string,
	repo *core.Repository,
) (bool, error) {
	conflicts := conflictsFromState(state)
	if len(conflicts) == 0 {
		return false, nil
	}

	remaining := make([]ConflictInfo, 0, len(conflicts))
	changed := false
	for _, conflict := range conflicts {
		if !strings.HasSuffix(strings.ToLower(conflict.Path), ".blend") {
			remaining = append(remaining, conflict)
			continue
		}
		applied, applyErr := finishBlendFileMerge(
			repoPath, conflict.Path, currentHead, targetHead, conflict.TheirHash,
			repo, repo.Storage, nil,
		)
		if applyErr != nil {
			fmt.Fprintf(os.Stderr, "Warning: blend merge apply for %s: %v\n", conflict.Path, applyErr)
		}
		if applied {
			changed = true
			continue
		}
		remaining = append(remaining, conflict)
	}
	if !changed {
		return false, nil
	}
	if err := saveMergeState(repoPath, currentHead, targetHead, branchToMerge, remaining); err != nil {
		return true, err
	}
	return true, nil
}
