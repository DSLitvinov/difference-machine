package core

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/difference-machine/forester/internal/models"
	"github.com/difference-machine/forester/internal/utils"
)

// Reflog manages Git-like reflog files under .DFM/logs/refs/.
type Reflog struct {
	repoPath string
}

// NewReflog creates a Reflog instance.
func NewReflog(repoPath string) *Reflog {
	return &Reflog{repoPath: repoPath}
}

func (r *Reflog) branchLogPath(branch string) (string, error) {
	baseDir := filepath.Join(r.repoPath, ".DFM", "logs", "refs", "heads")
	return utils.ValidateRefPath(baseDir, branch)
}

// Append records a reflog entry for a branch.
func (r *Reflog) Append(branch, commitHash, oldValue, newValue, operation string) error {
	logPath, err := r.branchLogPath(branch)
	if err != nil {
		return err
	}
	if err := utils.EnsureDirectory(filepath.Dir(logPath)); err != nil {
		return err
	}

	line := fmt.Sprintf("%s %s %s %s %s %d\n",
		reflogField(commitHash), reflogField(oldValue), reflogField(newValue), operation, branch, time.Now().Unix())

	f, err := os.OpenFile(logPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return fmt.Errorf("failed to open reflog: %w", err)
	}
	defer f.Close()

	if _, err := f.WriteString(line); err != nil {
		return fmt.Errorf("failed to write reflog: %w", err)
	}
	return nil
}

// GetEntries returns reflog entries for a branch (empty branch = all branches).
func (r *Reflog) GetEntries(branch string, limit int) ([]*models.ReflogEntry, error) {
	if limit <= 0 {
		limit = 100
	}

	var entries []*models.ReflogEntry

	if branch != "" {
		branchEntries, err := r.readLogFile(branch)
		if err != nil {
			return nil, err
		}
		entries = append(entries, branchEntries...)
	} else {
		logsDir := filepath.Join(r.repoPath, ".DFM", "logs", "refs", "heads")
		if utils.Exists(logsDir) {
			files, err := utils.ListFiles(logsDir, true)
			if err != nil {
				return nil, err
			}
			for _, file := range files {
				if !utils.IsFile(file) {
					continue
				}
				name := utils.GetFilename(file)
				branchEntries, err := r.readLogFile(name)
				if err != nil {
					continue
				}
				entries = append(entries, branchEntries...)
			}
		}
	}

	// Sort by timestamp descending (newest first).
	for i := 0; i < len(entries); i++ {
		for j := i + 1; j < len(entries); j++ {
			if entries[j].Timestamp > entries[i].Timestamp {
				entries[i], entries[j] = entries[j], entries[i]
			}
		}
	}

	if len(entries) > limit {
		entries = entries[:limit]
	}
	return entries, nil
}

func (r *Reflog) readLogFile(branch string) ([]*models.ReflogEntry, error) {
	logPath, err := r.branchLogPath(branch)
	if err != nil {
		return nil, err
	}
	if !utils.Exists(logPath) {
		return []*models.ReflogEntry{}, nil
	}

	f, err := os.Open(logPath)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	var entries []*models.ReflogEntry
	scanner := bufio.NewScanner(f)
	id := 0
	for scanner.Scan() {
		entry, ok := parseReflogLine(scanner.Text(), branch)
		if !ok {
			continue
		}
		id++
		entry.ID = id
		entries = append(entries, entry)
	}
	return entries, scanner.Err()
}

func parseReflogLine(line, defaultBranch string) (*models.ReflogEntry, bool) {
	line = strings.TrimSpace(line)
	if line == "" {
		return nil, false
	}
	parts := strings.Fields(line)
	if len(parts) < 6 {
		return nil, false
	}

	ts, err := strconv.ParseInt(parts[len(parts)-1], 10, 64)
	if err != nil {
		return nil, false
	}

	branchName := parts[len(parts)-2]
	operation := parts[len(parts)-3]
	newValue := parts[len(parts)-4]
	if newValue == "-" {
		newValue = ""
	}
	oldValue := parts[len(parts)-5]
	if oldValue == "-" {
		oldValue = ""
	}
	commitHash := parts[0]

	if branchName == "" {
		branchName = defaultBranch
	}

	return &models.ReflogEntry{
		CommitHash: commitHash,
		RefName:    branchName,
		RefType:    "branch",
		OldValue:   oldValue,
		NewValue:   newValue,
		Operation:  operation,
		Timestamp:  ts,
	}, true
}

func reflogField(value string) string {
	if value == "" {
		return "-"
	}
	return value
}

// Expire removes reflog entries older than expireBefore from all branch logs.
func (r *Reflog) Expire(expireBefore int64) error {
	logsDir := filepath.Join(r.repoPath, ".DFM", "logs", "refs", "heads")
	if !utils.Exists(logsDir) {
		return nil
	}

	files, err := utils.ListFiles(logsDir, true)
	if err != nil {
		return err
	}

	for _, file := range files {
		if !utils.IsFile(file) {
			continue
		}
		if err := r.expireFile(file, expireBefore); err != nil {
			return err
		}
	}
	return nil
}

func (r *Reflog) expireFile(path string, expireBefore int64) error {
	content, err := utils.ReadFileString(path)
	if err != nil {
		return err
	}

	var kept []string
	for _, line := range strings.Split(content, "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		parts := strings.Fields(line)
		if len(parts) < 6 {
			continue
		}
		ts, err := strconv.ParseInt(parts[len(parts)-1], 10, 64)
		if err != nil || ts < expireBefore {
			continue
		}
		kept = append(kept, line)
	}

	if len(kept) == 0 {
		return os.Remove(path)
	}
	return utils.WriteFileString(path, strings.Join(kept, "\n")+"\n")
}

// MarkCommitDeleted records a commit deletion in the reflog.
func (r *Reflog) MarkCommitDeleted(commitHash string) error {
	return r.Append("HEAD", commitHash, commitHash, "", "delete")
}

// RestoreCommit removes delete entries for a commit hash.
func (r *Reflog) RestoreCommit(commitHash string) (bool, error) {
	logsDir := filepath.Join(r.repoPath, ".DFM", "logs", "refs", "heads")
	if !utils.Exists(logsDir) {
		return false, nil
	}

	restored := false
	files, err := utils.ListFiles(logsDir, true)
	if err != nil {
		return false, err
	}

	for _, file := range files {
		if !utils.IsFile(file) {
			continue
		}
		changed, err := r.removeDeleteEntries(file, commitHash)
		if err != nil {
			return restored, err
		}
		if changed {
			restored = true
		}
	}
	return restored, nil
}

func (r *Reflog) removeDeleteEntries(path, commitHash string) (bool, error) {
	content, err := utils.ReadFileString(path)
	if err != nil {
		return false, err
	}

	var kept []string
	removed := false
	for _, line := range strings.Split(content, "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		parts := strings.Fields(line)
		if len(parts) >= 6 && parts[0] == commitHash && parts[len(parts)-3] == "delete" {
			removed = true
			continue
		}
		kept = append(kept, line)
	}
	if !removed {
		return false, nil
	}
	if len(kept) == 0 {
		return true, os.Remove(path)
	}
	return true, utils.WriteFileString(path, strings.Join(kept, "\n")+"\n")
}
