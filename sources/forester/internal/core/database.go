package core

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"path/filepath"
	"strings"
	"time"

	"github.com/difference-machine/forester/internal/models"
	"github.com/difference-machine/forester/internal/utils"
	_ "github.com/mattn/go-sqlite3"
)

// DatabaseException represents a database error
type DatabaseException struct {
	Message string
}

func (e *DatabaseException) Error() string {
	return fmt.Sprintf("Database error: %s", e.Message)
}

// Database manages SQLite database operations for Forester repository.
// It handles storage of commits, branches, tags, locks, comments, and other metadata.
type Database struct {
	db     *sql.DB
	dbPath string
}

// NewDatabase creates a new database connection and initializes the schema.
// WAL mode and foreign keys are enabled automatically for better performance and data integrity.
//
// Example:
//
//	db, err := NewDatabase("/path/to/repo/.DFM/database.db")
func NewDatabase(dbPath string) (*Database, error) {
	db, err := sql.Open("sqlite3", dbPath+"?_foreign_keys=1")
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Enable WAL mode for better performance
	if _, err := db.Exec("PRAGMA journal_mode=WAL;"); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to enable WAL mode: %w", err)
	}

	// Enable foreign keys
	if _, err := db.Exec("PRAGMA foreign_keys=ON;"); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to enable foreign keys: %w", err)
	}

	database := &Database{db: db, dbPath: dbPath}
	if err := database.initialize(); err != nil {
		db.Close()
		return nil, err
	}

	return database, nil
}

// Close closes the database connection
func (d *Database) Close() error {
	return d.db.Close()
}

// initialize creates tables and indexes
func (d *Database) initialize() error {
	if err := d.createTables(); err != nil {
		return err
	}
	if err := d.createIndexes(); err != nil {
		return err
	}
	// Run migrations
	if err := d.migrateScreenshotPath(); err != nil {
		log.Printf("forester: migration migrateScreenshotPath failed (non-fatal): %v", err)
	}
	return nil
}

// migrateScreenshotPath migrates old commits that have screenshot_hash but no screenshot_path
// It checks if screenshot file exists and sets screenshot_path accordingly
func (d *Database) migrateScreenshotPath() error {
	// Get repo path from db path
	// dbPath is like /path/to/repo/.DFM/database.db
	// We need to extract /path/to/repo
	if d.dbPath == "" {
		return nil // Can't determine repo path, skip migration
	}

	repoPath := filepath.Dir(filepath.Dir(d.dbPath)) // Go up from .DFM/database.db to repo root
	if !utils.Exists(repoPath) {
		return nil // Repo doesn't exist, skip migration
	}

	// Find commits without screenshot_path
	rows, err := d.db.Query("SELECT hash FROM commits WHERE screenshot_path IS NULL OR screenshot_path = ''")
	if err != nil {
		return err // Return error but don't fail initialization
	}
	defer rows.Close()

	screenshotsDir := filepath.Join(repoPath, ".DFM", "screenshots")
	updated := 0

	for rows.Next() {
		var commitHash string
		if err := rows.Scan(&commitHash); err != nil {
			continue
		}

		// Check if screenshot file exists
		screenshotPath := filepath.Join(screenshotsDir, commitHash+".png")
		if utils.Exists(screenshotPath) {
			// Set screenshot_path in format .DFM/screenshots/{commit_hash}.png
			screenshotPathRel := fmt.Sprintf(".DFM/screenshots/%s.png", commitHash)
			_, err := d.db.Exec("UPDATE commits SET screenshot_path = ? WHERE hash = ?", screenshotPathRel, commitHash)
			if err == nil {
				updated++
			}
		} else {
			// Try to load commit from storage to check for screenshot_hash in JSON
			storage, err := NewStorage(repoPath)
			if err == nil {
				commitContent, err := storage.GetCommitContent(commitHash)
				if err == nil {
					// Parse JSON to check for screenshot_hash
					var commitJSON map[string]interface{}
					if json.Unmarshal([]byte(commitContent), &commitJSON) == nil {
						if screenshotHash, ok := commitJSON["screenshot_hash"].(string); ok && screenshotHash != "" {
							// If screenshot_hash exists, set screenshot_path (file might exist with different name)
							// But we'll use standard format
							screenshotPathRel := fmt.Sprintf(".DFM/screenshots/%s.png", commitHash)
							_, err := d.db.Exec("UPDATE commits SET screenshot_path = ? WHERE hash = ?", screenshotPathRel, commitHash)
							if err == nil {
								updated++
							}
						}
					}
				}
			}
		}
	}

	return nil
}


// executeSQL executes a SQL statement
func (d *Database) executeSQL(sql string) error {
	_, err := d.db.Exec(sql)
	if err != nil {
		return &DatabaseException{Message: fmt.Sprintf("SQL execution failed: %v", err)}
	}
	return nil
}

// createTables creates all necessary tables
func (d *Database) createTables() error {
	tables := []string{
		`CREATE TABLE IF NOT EXISTS commits (
			hash TEXT PRIMARY KEY,
			parent_hash TEXT,
			tree_hash TEXT NOT NULL,
			author TEXT NOT NULL,
			message TEXT NOT NULL,
			timestamp INTEGER NOT NULL,
			type INTEGER NOT NULL,
			screenshot_path TEXT,
			FOREIGN KEY (parent_hash) REFERENCES commits(hash)
		)`,
		`CREATE TABLE IF NOT EXISTS branches (
			name TEXT PRIMARY KEY,
			commit_hash TEXT,
			created_at INTEGER NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS tags (
			name TEXT PRIMARY KEY,
			commit_hash TEXT NOT NULL,
			author TEXT NOT NULL,
			message TEXT,
			created_at INTEGER NOT NULL,
			FOREIGN KEY (commit_hash) REFERENCES commits(hash)
		)`,
		`CREATE TABLE IF NOT EXISTS stashes (
			hash TEXT PRIMARY KEY,
			message TEXT NOT NULL,
			tree_hash TEXT NOT NULL,
			created_at INTEGER NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS locks (
			file_path TEXT NOT NULL,
			user TEXT NOT NULL,
			branch TEXT NOT NULL,
			lock_type INTEGER NOT NULL,
			created_at INTEGER NOT NULL,
			expires_at INTEGER,
			PRIMARY KEY (file_path, user, branch)
		)`,
		`CREATE TABLE IF NOT EXISTS comments (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			asset_type TEXT NOT NULL,
			asset_id TEXT NOT NULL,
			author TEXT NOT NULL,
			content TEXT NOT NULL,
			x REAL DEFAULT 0.0,
			y REAL DEFAULT 0.0,
			created_at INTEGER NOT NULL,
			resolved INTEGER DEFAULT 0
		)`,
		`CREATE TABLE IF NOT EXISTS approvals (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			asset_type TEXT NOT NULL,
			asset_id TEXT NOT NULL,
			author TEXT NOT NULL,
			status TEXT NOT NULL,
			comment TEXT,
			created_at INTEGER NOT NULL,
			UNIQUE(asset_type, asset_id, author)
		)`,
		`CREATE TABLE IF NOT EXISTS blobs (
			hash TEXT PRIMARY KEY,
			path TEXT NOT NULL,
			stored_at INTEGER NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS reflog (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			commit_hash TEXT NOT NULL,
			ref_name TEXT NOT NULL,
			ref_type TEXT NOT NULL,
			old_value TEXT,
			new_value TEXT,
			operation TEXT NOT NULL,
			timestamp INTEGER NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS commit_parents (
			commit_hash TEXT NOT NULL,
			parent_hash TEXT NOT NULL,
			parent_order INTEGER NOT NULL,
			PRIMARY KEY (commit_hash, parent_order),
			FOREIGN KEY (commit_hash) REFERENCES commits(hash),
			FOREIGN KEY (parent_hash) REFERENCES commits(hash)
		)`,
		`CREATE TABLE IF NOT EXISTS objects (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			editor_type TEXT NOT NULL,
			file_path TEXT NOT NULL,
			object_name TEXT NOT NULL,
			object_type TEXT NOT NULL,
			commit_hash TEXT NOT NULL,
			object_data TEXT,
			tags TEXT,
			metadata TEXT,
			created_at INTEGER NOT NULL,
			updated_at INTEGER,
			UNIQUE (object_name, commit_hash, file_path)
		)`,
		`CREATE TABLE IF NOT EXISTS reviews (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			commit_hash TEXT NOT NULL,
			file_path TEXT NOT NULL,
			object_name TEXT,
			comment TEXT NOT NULL,
			author TEXT NOT NULL,
			created_at INTEGER NOT NULL
		)`,
	}

	for _, table := range tables {
		if err := d.executeSQL(table); err != nil {
			return err
		}
	}

	return nil
}

// createIndexes creates indexes for better performance
func (d *Database) createIndexes() error {
	indexes := []string{
		"CREATE INDEX IF NOT EXISTS idx_commits_parent ON commits(parent_hash)",
		"CREATE INDEX IF NOT EXISTS idx_commits_tree ON commits(tree_hash)",
		"CREATE INDEX IF NOT EXISTS idx_branches_commit ON branches(commit_hash)",
		"CREATE INDEX IF NOT EXISTS idx_tags_commit ON tags(commit_hash)",
		"CREATE INDEX IF NOT EXISTS idx_locks_file ON locks(file_path)",
		"CREATE INDEX IF NOT EXISTS idx_locks_branch ON locks(branch)",
		"CREATE INDEX IF NOT EXISTS idx_comments_asset ON comments(asset_type, asset_id)",
		"CREATE INDEX IF NOT EXISTS idx_approvals_asset ON approvals(asset_type, asset_id)",
		"CREATE INDEX IF NOT EXISTS idx_reflog_commit ON reflog(commit_hash)",
		"CREATE INDEX IF NOT EXISTS idx_reflog_ref ON reflog(ref_name, ref_type)",
		"CREATE INDEX IF NOT EXISTS idx_reflog_timestamp ON reflog(timestamp)",
		"CREATE INDEX IF NOT EXISTS idx_commit_parents_commit ON commit_parents(commit_hash)",
		"CREATE INDEX IF NOT EXISTS idx_commit_parents_parent ON commit_parents(parent_hash)",
		"CREATE INDEX IF NOT EXISTS idx_objects_commit_hash ON objects(commit_hash)",
		"CREATE INDEX IF NOT EXISTS idx_objects_file_path ON objects(file_path)",
		"CREATE INDEX IF NOT EXISTS idx_objects_tags ON objects(tags)",
		"CREATE INDEX IF NOT EXISTS idx_reviews_commit_hash ON reviews(commit_hash)",
		"CREATE INDEX IF NOT EXISTS idx_reviews_file_path ON reviews(file_path)",
		"CREATE INDEX IF NOT EXISTS idx_reviews_object ON reviews(commit_hash, file_path, object_name)",
	}

	for _, index := range indexes {
		if err := d.executeSQL(index); err != nil {
			return err
		}
	}

	return nil
}

// CreateCommit creates a new commit
func (d *Database) CreateCommit(commit *models.Commit) (string, error) {
	query := `INSERT INTO commits (hash, parent_hash, tree_hash, author, message, timestamp, type, screenshot_path) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`

	var parentHash sql.NullString
	if commit.ParentHash != "" {
		parentHash = sql.NullString{String: commit.ParentHash, Valid: true}
	}

	var screenshotPath sql.NullString
	if commit.ScreenshotPath != "" {
		screenshotPath = sql.NullString{String: commit.ScreenshotPath, Valid: true}
	}

	_, err := d.db.Exec(query,
		commit.Hash,
		parentHash,
		commit.TreeHash,
		commit.Author,
		commit.Message,
		commit.Timestamp,
		int(commit.Type),
		screenshotPath,
	)
	if err != nil {
		return "", &DatabaseException{Message: fmt.Sprintf("Failed to create commit: %v", err)}
	}

	// Store multiple parents if provided
	if len(commit.ParentHashes) > 0 {
		for i, parentHash := range commit.ParentHashes {
			if parentHash != "" {
				_, err := d.db.Exec("INSERT INTO commit_parents (commit_hash, parent_hash, parent_order) VALUES (?, ?, ?)",
					commit.Hash, parentHash, i)
				if err != nil {
					return "", &DatabaseException{Message: fmt.Sprintf("Failed to store parent: %v", err)}
				}
			}
		}
		// Set first parent as ParentHash for backward compatibility
		if commit.ParentHash == "" && len(commit.ParentHashes) > 0 {
			commit.ParentHash = commit.ParentHashes[0]
			_, _ = d.db.Exec("UPDATE commits SET parent_hash = ? WHERE hash = ?", commit.ParentHashes[0], commit.Hash)
		}
	}

	return commit.Hash, nil
}

// GetCommit retrieves a commit by hash
func (d *Database) GetCommit(hash string) (*models.Commit, error) {
	query := `SELECT hash, parent_hash, tree_hash, author, message, timestamp, type, screenshot_path 
		FROM commits WHERE hash = ?`

	var commit models.Commit
	var parentHash sql.NullString
	var screenshotPath sql.NullString

	err := d.db.QueryRow(query, hash).Scan(
		&commit.Hash,
		&parentHash,
		&commit.TreeHash,
		&commit.Author,
		&commit.Message,
		&commit.Timestamp,
		&commit.Type,
		&screenshotPath,
	)
	if err == sql.ErrNoRows {
		return nil, &DatabaseException{Message: fmt.Sprintf("Commit not found: %s", hash)}
	}
	if err != nil {
		return nil, &DatabaseException{Message: fmt.Sprintf("Failed to get commit: %v", err)}
	}

	if parentHash.Valid {
		commit.ParentHash = parentHash.String
	}
	if screenshotPath.Valid {
		commit.ScreenshotPath = screenshotPath.String
	}

	// Load all parents from commit_parents table
	rows, err := d.db.Query("SELECT parent_hash FROM commit_parents WHERE commit_hash = ? ORDER BY parent_order", hash)
	if err == nil {
		defer rows.Close()
		var parentHashes []string
		for rows.Next() {
			var ph string
			if err := rows.Scan(&ph); err == nil {
				parentHashes = append(parentHashes, ph)
			}
		}
		if len(parentHashes) > 0 {
			commit.ParentHashes = parentHashes
			// Ensure ParentHash is set for backward compatibility
			if commit.ParentHash == "" && len(parentHashes) > 0 {
				commit.ParentHash = parentHashes[0]
			}
		} else if commit.ParentHash != "" {
			// If no parents in commit_parents but ParentHash is set, use it
			commit.ParentHashes = []string{commit.ParentHash}
		}
	}

	return &commit, nil
}

// FindCommitByPrefix is deprecated - use GetCommit with full hash instead
// This function now simply calls GetCommit to maintain backward compatibility
// but requires full 64-character hash
func (d *Database) FindCommitByPrefix(prefix string) (*models.Commit, error) {
	if len(prefix) != 64 {
		return nil, &DatabaseException{Message: fmt.Sprintf("Full commit hash required (64 characters), got %d: %s", len(prefix), prefix)}
	}
	return d.GetCommit(prefix)
}

// GetCommitHistory retrieves commit history for a branch
func (d *Database) GetCommitHistory(branch string, limit int) ([]*models.Commit, error) {
	branchHead, err := d.GetBranchHead(branch)
	if err != nil || branchHead == "" {
		return []*models.Commit{}, nil
	}

	// Get deleted commits from reflog
	deletedCommits := make(map[string]bool)
	rows, err := d.db.Query("SELECT DISTINCT commit_hash FROM reflog WHERE operation = 'delete'")
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var hash string
			if err := rows.Scan(&hash); err == nil {
				deletedCommits[hash] = true
			}
		}
	}

	// Recursively get commits from HEAD to root
	var commits []*models.Commit
	currentHash := branchHead
	count := 0

	for currentHash != "" && count < limit {
		// Skip deleted commits
		if deletedCommits[currentHash] {
			commit, err := d.GetCommit(currentHash)
			if err != nil {
				break
			}
			currentHash = commit.ParentHash
			continue
		}

		commit, err := d.GetCommit(currentHash)
		if err != nil {
			break
		}
		commits = append(commits, commit)
		currentHash = commit.ParentHash
		count++
	}

	return commits, nil
}

// DeleteCommit marks a commit for deletion (adds to reflog)
func (d *Database) DeleteCommit(hash string) error {
	return d.AddReflogEntry(hash, "HEAD", "commit", hash, "", "delete")
}

// ForceDeleteCommit forcefully deletes a commit (used by GC)
func (d *Database) ForceDeleteCommit(hash string) error {
	tx, err := d.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec("DELETE FROM commits WHERE hash = ?", hash); err != nil {
		return err
	}
	if _, err := tx.Exec("DELETE FROM reflog WHERE commit_hash = ?", hash); err != nil {
		return err
	}

	return tx.Commit()
}

// HasChildCommits checks if a commit has child commits.
// It considers both the legacy parent_hash column and the commit_parents table (merge commits).
func (d *Database) HasChildCommits(hash string) (bool, error) {
	var count int
	err := d.db.QueryRow(`
		SELECT COUNT(*) FROM (
			SELECT hash FROM commits WHERE parent_hash = ?
			UNION
			SELECT commit_hash FROM commit_parents WHERE parent_hash = ?
		)`, hash, hash).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// GetChildCommits returns all child commit hashes for a given commit.
// It considers both the legacy parent_hash column and the commit_parents table (merge commits).
func (d *Database) GetChildCommits(hash string) ([]string, error) {
	rows, err := d.db.Query(`
		SELECT hash FROM commits WHERE parent_hash = ?
		UNION
		SELECT commit_hash FROM commit_parents WHERE parent_hash = ?`, hash, hash)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var children []string
	for rows.Next() {
		var childHash string
		if err := rows.Scan(&childHash); err != nil {
			continue
		}
		children = append(children, childHash)
	}

	return children, nil
}

// CreateBranch creates a new branch
func (d *Database) CreateBranch(name, commitHash string) error {
	query := `INSERT INTO branches (name, commit_hash, created_at) VALUES (?, ?, ?)`
	var commitHashNull sql.NullString
	if commitHash != "" {
		commitHashNull = sql.NullString{String: commitHash, Valid: true}
	}

	_, err := d.db.Exec(query, name, commitHashNull, time.Now().Unix())
	if err != nil {
		return &DatabaseException{Message: fmt.Sprintf("Failed to create branch: %v", err)}
	}
	return nil
}

// DeleteBranch deletes a branch
func (d *Database) DeleteBranch(name string) error {
	_, err := d.db.Exec("DELETE FROM branches WHERE name = ?", name)
	return err
}

// SetBranchHead sets the HEAD commit of a branch
func (d *Database) SetBranchHead(name, commitHash string) error {
	var exists bool
	err := d.db.QueryRow("SELECT COUNT(*) > 0 FROM branches WHERE name = ?", name).Scan(&exists)
	if err != nil {
		return err
	}

	// Handle empty commitHash as NULL (for orphan branches)
	var commitHashNull sql.NullString
	if commitHash != "" {
		commitHashNull = sql.NullString{String: commitHash, Valid: true}
	}

	if exists {
		result, err := d.db.Exec("UPDATE branches SET commit_hash = ? WHERE name = ?", commitHashNull, name)
		if err != nil {
			return err
		}
		rowsAffected, _ := result.RowsAffected()
		if rowsAffected == 0 {
			return d.CreateBranch(name, commitHash)
		}
		return nil
	}

	return d.CreateBranch(name, commitHash)
}

// UpdateBranchHeadAtomic atomically updates branch HEAD and adds reflog entry
func (d *Database) UpdateBranchHeadAtomic(branchName, newCommitHash, oldCommitHash string) error {
	tx, err := d.db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Update branch HEAD
	var commitHashNull sql.NullString
	if newCommitHash != "" {
		commitHashNull = sql.NullString{String: newCommitHash, Valid: true}
	}

	// Check if branch exists
	var exists bool
	err = tx.QueryRow("SELECT COUNT(*) > 0 FROM branches WHERE name = ?", branchName).Scan(&exists)
	if err != nil {
		return fmt.Errorf("failed to check branch existence: %w", err)
	}

	if exists {
		if _, err := tx.Exec("UPDATE branches SET commit_hash = ? WHERE name = ?", commitHashNull, branchName); err != nil {
			return fmt.Errorf("failed to update branch head: %w", err)
		}
	} else {
		// Create branch if it doesn't exist
		if _, err := tx.Exec("INSERT INTO branches (name, commit_hash, created_at) VALUES (?, ?, ?)",
			branchName, commitHashNull, time.Now().Unix()); err != nil {
			return fmt.Errorf("failed to create branch: %w", err)
		}
	}

	// Add reflog entry
	var oldValueNull, newValueNull sql.NullString
	if oldCommitHash != "" {
		oldValueNull = sql.NullString{String: oldCommitHash, Valid: true}
	}
	if newCommitHash != "" {
		newValueNull = sql.NullString{String: newCommitHash, Valid: true}
	}

	if _, err := tx.Exec(`INSERT INTO reflog (commit_hash, ref_name, ref_type, old_value, new_value, operation, timestamp) 
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		newValueNull, branchName, "branch", oldValueNull, newValueNull, "update", time.Now().Unix()); err != nil {
		return fmt.Errorf("failed to add reflog entry: %w", err)
	}

	return tx.Commit()
}

// GetBranchHead gets the HEAD commit of a branch
func (d *Database) GetBranchHead(name string) (string, error) {
	var commitHash sql.NullString
	err := d.db.QueryRow("SELECT commit_hash FROM branches WHERE name = ?", name).Scan(&commitHash)
	if err == sql.ErrNoRows {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	if commitHash.Valid {
		return commitHash.String, nil
	}
	return "", nil
}

// ListBranches lists all branches
func (d *Database) ListBranches() ([]*models.Branch, error) {
	rows, err := d.db.Query("SELECT name, commit_hash, created_at FROM branches ORDER BY name")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var branches []*models.Branch
	for rows.Next() {
		var branch models.Branch
		var commitHash sql.NullString
		if err := rows.Scan(&branch.Name, &commitHash, &branch.CreatedAt); err != nil {
			continue
		}
		if commitHash.Valid {
			branch.CommitHash = commitHash.String
		}
		branches = append(branches, &branch)
	}

	return branches, nil
}

// CreateTag creates a new tag
func (d *Database) CreateTag(tag *models.Tag) error {
	query := `INSERT INTO tags (name, commit_hash, author, message, created_at) 
		VALUES (?, ?, ?, ?, ?)`
	_, err := d.db.Exec(query, tag.Name, tag.CommitHash, tag.Author, tag.Message, tag.CreatedAt)
	if err != nil {
		return &DatabaseException{Message: fmt.Sprintf("Failed to create tag: %v", err)}
	}
	return nil
}

// DeleteTag deletes a tag
func (d *Database) DeleteTag(name string) error {
	_, err := d.db.Exec("DELETE FROM tags WHERE name = ?", name)
	return err
}

// GetTag retrieves a tag by name
func (d *Database) GetTag(name string) (*models.Tag, error) {
	var tag models.Tag
	err := d.db.QueryRow(
		"SELECT name, commit_hash, author, message, created_at FROM tags WHERE name = ?",
		name,
	).Scan(&tag.Name, &tag.CommitHash, &tag.Author, &tag.Message, &tag.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, &DatabaseException{Message: fmt.Sprintf("Tag not found: %s", name)}
	}
	if err != nil {
		return nil, err
	}
	return &tag, nil
}

// ListTags lists all tags
func (d *Database) ListTags() ([]*models.Tag, error) {
	rows, err := d.db.Query("SELECT name, commit_hash, author, message, created_at FROM tags ORDER BY name")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tags []*models.Tag
	for rows.Next() {
		var tag models.Tag
		if err := rows.Scan(&tag.Name, &tag.CommitHash, &tag.Author, &tag.Message, &tag.CreatedAt); err != nil {
			continue
		}
		tags = append(tags, &tag)
	}

	return tags, nil
}

// GetTagByCommitHash gets a tag by commit hash
func (d *Database) GetTagByCommitHash(commitHash string) (string, error) {
	var name string
	err := d.db.QueryRow("SELECT name FROM tags WHERE commit_hash = ? LIMIT 1", commitHash).Scan(&name)
	if err == sql.ErrNoRows {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return name, nil
}

// CreateStash creates a new stash
func (d *Database) CreateStash(stash *models.Stash) (string, error) {
	query := `INSERT INTO stashes (hash, message, tree_hash, created_at) VALUES (?, ?, ?, ?)`
	_, err := d.db.Exec(query, stash.Hash, stash.Message, stash.TreeHash, stash.CreatedAt)
	if err != nil {
		return "", &DatabaseException{Message: fmt.Sprintf("Failed to create stash: %v", err)}
	}
	return stash.Hash, nil
}

// GetStash retrieves a stash by hash
func (d *Database) GetStash(hash string) (*models.Stash, error) {
	var stash models.Stash
	err := d.db.QueryRow(
		"SELECT hash, message, tree_hash, created_at FROM stashes WHERE hash = ?",
		hash,
	).Scan(&stash.Hash, &stash.Message, &stash.TreeHash, &stash.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, &DatabaseException{Message: fmt.Sprintf("Stash not found: %s", hash)}
	}
	if err != nil {
		return nil, err
	}
	return &stash, nil
}

// ListStashes lists all stashes
func (d *Database) ListStashes() ([]*models.Stash, error) {
	rows, err := d.db.Query("SELECT hash, message, tree_hash, created_at FROM stashes ORDER BY created_at DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stashes []*models.Stash
	for rows.Next() {
		var stash models.Stash
		if err := rows.Scan(&stash.Hash, &stash.Message, &stash.TreeHash, &stash.CreatedAt); err != nil {
			continue
		}
		stashes = append(stashes, &stash)
	}

	return stashes, nil
}

// DeleteStash deletes a stash
func (d *Database) DeleteStash(hash string) error {
	var exists bool
	err := d.db.QueryRow("SELECT COUNT(*) > 0 FROM stashes WHERE hash = ?", hash).Scan(&exists)
	if err != nil {
		return err
	}
	if !exists {
		return &DatabaseException{Message: fmt.Sprintf("Stash not found: %s", hash)}
	}

	_, err = d.db.Exec("DELETE FROM stashes WHERE hash = ?", hash)
	return err
}

// AcquireLock acquires a file lock
func (d *Database) AcquireLock(lock *models.Lock) (bool, error) {
	// Remove pre-check to avoid race condition - rely on UNIQUE constraint (PRIMARY KEY)
	var expiresAt sql.NullInt64
	if lock.ExpiresAt > 0 {
		expiresAt = sql.NullInt64{Int64: lock.ExpiresAt, Valid: true}
	}

	query := `INSERT INTO locks (file_path, user, branch, lock_type, created_at, expires_at) 
		VALUES (?, ?, ?, ?, ?, ?)`
	_, err := d.db.Exec(query, lock.FilePath, lock.User, lock.Branch, int(lock.LockType), lock.CreatedAt, expiresAt)
	if err != nil {
		// Check if this is a UNIQUE constraint violation (lock conflict)
		errStr := err.Error()
		if strings.Contains(errStr, "UNIQUE constraint") ||
			strings.Contains(errStr, "constraint failed") ||
			strings.Contains(errStr, "PRIMARY KEY") {
			return false, nil // Lock conflict
		}
		return false, fmt.Errorf("failed to acquire lock: %w", err)
	}
	return true, nil
}

// ReleaseLock releases a file lock
func (d *Database) ReleaseLock(filePath, user string) error {
	_, err := d.db.Exec("DELETE FROM locks WHERE file_path = ? AND user = ?", filePath, user)
	return err
}

// GetLocks gets locks for a branch
func (d *Database) GetLocks(branch string) ([]*models.Lock, error) {
	now := time.Now().Unix()
	rows, err := d.db.Query(
		"SELECT file_path, user, branch, lock_type, created_at, expires_at FROM locks WHERE branch = ? AND (expires_at IS NULL OR expires_at > ?)",
		branch, now,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var locks []*models.Lock
	for rows.Next() {
		var lock models.Lock
		var expiresAt sql.NullInt64
		if err := rows.Scan(&lock.FilePath, &lock.User, &lock.Branch, &lock.LockType, &lock.CreatedAt, &expiresAt); err != nil {
			continue
		}
		if expiresAt.Valid {
			lock.ExpiresAt = expiresAt.Int64
		}
		locks = append(locks, &lock)
	}

	return locks, nil
}

// IsLocked checks if a file is locked
func (d *Database) IsLocked(filePath string) (bool, error) {
	now := time.Now().Unix()
	var count int
	err := d.db.QueryRow(
		"SELECT COUNT(*) FROM locks WHERE file_path = ? AND (expires_at IS NULL OR expires_at > ?)",
		filePath, now,
	).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// CreateComment creates a new comment
func (d *Database) CreateComment(comment *models.Comment) (int, error) {
	query := `INSERT INTO comments (asset_type, asset_id, author, content, x, y, created_at, resolved) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
	result, err := d.db.Exec(query,
		comment.AssetType,
		comment.AssetID,
		comment.Author,
		comment.Content,
		comment.X,
		comment.Y,
		comment.CreatedAt,
		comment.Resolved,
	)
	if err != nil {
		return 0, &DatabaseException{Message: fmt.Sprintf("Failed to create comment: %v", err)}
	}

	id, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}
	return int(id), nil
}

// GetComments gets comments for an asset
func (d *Database) GetComments(assetType, assetID string) ([]*models.Comment, error) {
	rows, err := d.db.Query(
		"SELECT id, asset_type, asset_id, author, content, x, y, created_at, resolved FROM comments WHERE asset_type = ? AND asset_id = ? ORDER BY created_at",
		assetType, assetID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var comments []*models.Comment
	for rows.Next() {
		var comment models.Comment
		var resolved int
		if err := rows.Scan(&comment.ID, &comment.AssetType, &comment.AssetID, &comment.Author, &comment.Content, &comment.X, &comment.Y, &comment.CreatedAt, &resolved); err != nil {
			continue
		}
		comment.Resolved = resolved != 0
		comments = append(comments, &comment)
	}

	return comments, nil
}

// ResolveComment marks a comment as resolved
func (d *Database) ResolveComment(commentID int) error {
	_, err := d.db.Exec("UPDATE comments SET resolved = 1 WHERE id = ?", commentID)
	return err
}

// CreateApproval creates or updates an approval
func (d *Database) CreateApproval(approval *models.Approval) error {
	statusStr := string(approval.Status)
	query := `INSERT OR REPLACE INTO approvals (asset_type, asset_id, author, status, comment, created_at) 
		VALUES (?, ?, ?, ?, ?, ?)`
	_, err := d.db.Exec(query,
		approval.AssetType,
		approval.AssetID,
		approval.Author,
		statusStr,
		approval.Comment,
		approval.CreatedAt,
	)
	if err != nil {
		return &DatabaseException{Message: fmt.Sprintf("Failed to create approval: %v", err)}
	}
	return nil
}

// GetApprovals gets approvals for an asset
func (d *Database) GetApprovals(assetType, assetID string) ([]*models.Approval, error) {
	rows, err := d.db.Query(
		"SELECT id, asset_type, asset_id, author, status, comment, created_at FROM approvals WHERE asset_type = ? AND asset_id = ? ORDER BY created_at",
		assetType, assetID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var approvals []*models.Approval
	for rows.Next() {
		var approval models.Approval
		var statusStr string
		if err := rows.Scan(&approval.ID, &approval.AssetType, &approval.AssetID, &approval.Author, &statusStr, &approval.Comment, &approval.CreatedAt); err != nil {
			continue
		}
		approval.Status = models.ApprovalStatus(statusStr)
		approvals = append(approvals, &approval)
	}

	return approvals, nil
}

// StoreBlob stores blob metadata
func (d *Database) StoreBlob(hash, path string) error {
	query := `INSERT INTO blobs (hash, path, stored_at) VALUES (?, ?, ?)`
	_, err := d.db.Exec(query, hash, path, time.Now().Unix())
	return err
}

// GetBlobPath gets the path for a blob
func (d *Database) GetBlobPath(hash string) (string, error) {
	var path string
	err := d.db.QueryRow("SELECT path FROM blobs WHERE hash = ?", hash).Scan(&path)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return path, err
}

// AddReflogEntry adds an entry to the reflog
func (d *Database) AddReflogEntry(commitHash, refName, refType, oldValue, newValue, operation string) error {
	query := `INSERT INTO reflog (commit_hash, ref_name, ref_type, old_value, new_value, operation, timestamp) 
		VALUES (?, ?, ?, ?, ?, ?, ?)`

	var oldValueNull sql.NullString
	if oldValue != "" {
		oldValueNull = sql.NullString{String: oldValue, Valid: true}
	}

	var newValueNull sql.NullString
	if newValue != "" {
		newValueNull = sql.NullString{String: newValue, Valid: true}
	}

	_, err := d.db.Exec(query, commitHash, refName, refType, oldValueNull, newValueNull, operation, time.Now().Unix())
	return err
}

// GetReflog gets reflog entries
func (d *Database) GetReflog(refName string, limit int) ([]*models.ReflogEntry, error) {
	var rows *sql.Rows
	var err error

	if refName == "" {
		rows, err = d.db.Query(
			"SELECT id, commit_hash, ref_name, ref_type, old_value, new_value, operation, timestamp FROM reflog ORDER BY timestamp DESC LIMIT ?",
			limit,
		)
	} else {
		rows, err = d.db.Query(
			"SELECT id, commit_hash, ref_name, ref_type, old_value, new_value, operation, timestamp FROM reflog WHERE ref_name = ? ORDER BY timestamp DESC LIMIT ?",
			refName, limit,
		)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []*models.ReflogEntry
	for rows.Next() {
		var entry models.ReflogEntry
		var oldValue sql.NullString
		var newValue sql.NullString
		if err := rows.Scan(&entry.ID, &entry.CommitHash, &entry.RefName, &entry.RefType, &oldValue, &newValue, &entry.Operation, &entry.Timestamp); err != nil {
			continue
		}
		if oldValue.Valid {
			entry.OldValue = oldValue.String
		}
		if newValue.Valid {
			entry.NewValue = newValue.String
		}
		entries = append(entries, &entry)
	}

	return entries, nil
}

// ExpireReflog removes old reflog entries
func (d *Database) ExpireReflog(expireBefore int64) error {
	_, err := d.db.Exec("DELETE FROM reflog WHERE timestamp < ?", expireBefore)
	return err
}

// IsCommitInReflog checks if a commit is in reflog
func (d *Database) IsCommitInReflog(commitHash string) (bool, error) {
	var count int
	err := d.db.QueryRow("SELECT COUNT(*) FROM reflog WHERE commit_hash = ?", commitHash).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// GetCommitsInReflog gets all commit hashes in reflog
func (d *Database) GetCommitsInReflog() ([]string, error) {
	rows, err := d.db.Query("SELECT DISTINCT commit_hash FROM reflog")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var commits []string
	for rows.Next() {
		var hash string
		if err := rows.Scan(&hash); err != nil {
			continue
		}
		commits = append(commits, hash)
	}

	return commits, nil
}

// RestoreCommitFromReflog restores a commit from reflog (marks as not deleted)
func (d *Database) RestoreCommitFromReflog(commitHash string) (bool, error) {
	// Remove delete entries from reflog
	result, err := d.db.Exec("DELETE FROM reflog WHERE commit_hash = ? AND operation = 'delete'", commitHash)
	if err != nil {
		return false, err
	}
	rowsAffected, _ := result.RowsAffected()
	return rowsAffected > 0, nil
}

// ========== Object Methods ==========

// AddObject adds a new object to the database
func (d *Database) AddObject(obj *models.Object) error {
	objectDataJSON, err := json.Marshal(obj.ObjectData)
	if err != nil {
		return &DatabaseException{Message: fmt.Sprintf("Failed to marshal object_data: %v", err)}
	}

	tagsJSON, err := json.Marshal(obj.Tags)
	if err != nil {
		return &DatabaseException{Message: fmt.Sprintf("Failed to marshal tags: %v", err)}
	}

	metadataJSON, err := json.Marshal(obj.Metadata)
	if err != nil {
		return &DatabaseException{Message: fmt.Sprintf("Failed to marshal metadata: %v", err)}
	}

	query := `INSERT OR REPLACE INTO objects 
		(editor_type, file_path, object_name, object_type, commit_hash, object_data, tags, metadata, created_at, updated_at) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	now := time.Now().Unix()
	if obj.CreatedAt == 0 {
		obj.CreatedAt = now
	}
	obj.UpdatedAt = now

	_, err = d.db.Exec(query,
		obj.EditorType,
		obj.FilePath,
		obj.ObjectName,
		obj.ObjectType,
		obj.CommitHash,
		string(objectDataJSON),
		string(tagsJSON),
		string(metadataJSON),
		obj.CreatedAt,
		obj.UpdatedAt,
	)
	if err != nil {
		return &DatabaseException{Message: fmt.Sprintf("Failed to add object: %v", err)}
	}

	// Get the ID of the inserted/updated object
	err = d.db.QueryRow("SELECT id FROM objects WHERE object_name = ? AND commit_hash = ? AND file_path = ?",
		obj.ObjectName, obj.CommitHash, obj.FilePath).Scan(&obj.ID)
	if err != nil {
		return &DatabaseException{Message: fmt.Sprintf("Failed to get object ID: %v", err)}
	}

	return nil
}

// UpdateObject updates an existing object
func (d *Database) UpdateObject(obj *models.Object) error {
	objectDataJSON, err := json.Marshal(obj.ObjectData)
	if err != nil {
		return &DatabaseException{Message: fmt.Sprintf("Failed to marshal object_data: %v", err)}
	}

	tagsJSON, err := json.Marshal(obj.Tags)
	if err != nil {
		return &DatabaseException{Message: fmt.Sprintf("Failed to marshal tags: %v", err)}
	}

	metadataJSON, err := json.Marshal(obj.Metadata)
	if err != nil {
		return &DatabaseException{Message: fmt.Sprintf("Failed to marshal metadata: %v", err)}
	}

	query := `UPDATE objects SET 
		editor_type = ?, object_type = ?, object_data = ?, tags = ?, metadata = ?, updated_at = ?
		WHERE object_name = ? AND commit_hash = ? AND file_path = ?`

	obj.UpdatedAt = time.Now().Unix()
	result, err := d.db.Exec(query,
		obj.EditorType,
		obj.ObjectType,
		string(objectDataJSON),
		string(tagsJSON),
		string(metadataJSON),
		obj.UpdatedAt,
		obj.ObjectName,
		obj.CommitHash,
		obj.FilePath,
	)
	if err != nil {
		return &DatabaseException{Message: fmt.Sprintf("Failed to update object: %v", err)}
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return &DatabaseException{Message: fmt.Sprintf("Object not found: %s/%s/%s", obj.ObjectName, obj.CommitHash, obj.FilePath)}
	}

	return nil
}

// GetObject retrieves an object by name, commit hash, and file path
func (d *Database) GetObject(commitHash, filePath, objectName string) (*models.Object, error) {
	query := `SELECT id, editor_type, file_path, object_name, object_type, commit_hash, 
		object_data, tags, metadata, created_at, updated_at 
		FROM objects WHERE object_name = ? AND commit_hash = ? AND file_path = ?`

	var obj models.Object
	var objectDataJSON, tagsJSON, metadataJSON string
	var updatedAt sql.NullInt64

	err := d.db.QueryRow(query, objectName, commitHash, filePath).Scan(
		&obj.ID,
		&obj.EditorType,
		&obj.FilePath,
		&obj.ObjectName,
		&obj.ObjectType,
		&obj.CommitHash,
		&objectDataJSON,
		&tagsJSON,
		&metadataJSON,
		&obj.CreatedAt,
		&updatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, &DatabaseException{Message: fmt.Sprintf("Object not found: %s/%s/%s", objectName, commitHash, filePath)}
	}
	if err != nil {
		return nil, &DatabaseException{Message: fmt.Sprintf("Failed to get object: %v", err)}
	}

	if updatedAt.Valid {
		obj.UpdatedAt = updatedAt.Int64
	}

	// Parse JSON fields
	if objectDataJSON != "" {
		if err := json.Unmarshal([]byte(objectDataJSON), &obj.ObjectData); err != nil {
			obj.ObjectData = make(map[string]interface{})
		}
	} else {
		obj.ObjectData = make(map[string]interface{})
	}

	if tagsJSON != "" {
		if err := json.Unmarshal([]byte(tagsJSON), &obj.Tags); err != nil {
			obj.Tags = []string{}
		}
	} else {
		obj.Tags = []string{}
	}

	if metadataJSON != "" {
		if err := json.Unmarshal([]byte(metadataJSON), &obj.Metadata); err != nil {
			obj.Metadata = make(map[string]string)
		}
	} else {
		obj.Metadata = make(map[string]string)
	}

	return &obj, nil
}

// DeleteObject deletes an object
func (d *Database) DeleteObject(commitHash, filePath, objectName string) error {
	result, err := d.db.Exec("DELETE FROM objects WHERE object_name = ? AND commit_hash = ? AND file_path = ?",
		objectName, commitHash, filePath)
	if err != nil {
		return &DatabaseException{Message: fmt.Sprintf("Failed to delete object: %v", err)}
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return &DatabaseException{Message: fmt.Sprintf("Object not found: %s/%s/%s", objectName, commitHash, filePath)}
	}

	return nil
}

// DeleteObjectsByFile deletes all objects for a file in a commit
func (d *Database) DeleteObjectsByFile(commitHash, filePath string) error {
	result, err := d.db.Exec("DELETE FROM objects WHERE commit_hash = ? AND file_path = ?",
		commitHash, filePath)
	if err != nil {
		return &DatabaseException{Message: fmt.Sprintf("Failed to delete objects for file: %v", err)}
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return &DatabaseException{Message: fmt.Sprintf("No objects found for file: %s/%s", commitHash, filePath)}
	}

	return nil
}

// GetObjectsByCommit retrieves all objects for a commit
func (d *Database) GetObjectsByCommit(commitHash string) ([]*models.Object, error) {
	query := `SELECT id, editor_type, file_path, object_name, object_type, commit_hash, 
		object_data, tags, metadata, created_at, updated_at 
		FROM objects WHERE commit_hash = ? ORDER BY file_path, object_name`

	rows, err := d.db.Query(query, commitHash)
	if err != nil {
		return nil, &DatabaseException{Message: fmt.Sprintf("Failed to get objects: %v", err)}
	}
	defer rows.Close()

	var objects []*models.Object
	for rows.Next() {
		var obj models.Object
		var objectDataJSON, tagsJSON, metadataJSON string
		var updatedAt sql.NullInt64

		if err := rows.Scan(
			&obj.ID,
			&obj.EditorType,
			&obj.FilePath,
			&obj.ObjectName,
			&obj.ObjectType,
			&obj.CommitHash,
			&objectDataJSON,
			&tagsJSON,
			&metadataJSON,
			&obj.CreatedAt,
			&updatedAt,
		); err != nil {
			continue
		}

		if updatedAt.Valid {
			obj.UpdatedAt = updatedAt.Int64
		}

		// Parse JSON fields
		if objectDataJSON != "" {
			if err := json.Unmarshal([]byte(objectDataJSON), &obj.ObjectData); err != nil {
				obj.ObjectData = make(map[string]interface{})
			}
		} else {
			obj.ObjectData = make(map[string]interface{})
		}

		if tagsJSON != "" {
			if err := json.Unmarshal([]byte(tagsJSON), &obj.Tags); err != nil {
				obj.Tags = []string{}
			}
		} else {
			obj.Tags = []string{}
		}

		if metadataJSON != "" {
			if err := json.Unmarshal([]byte(metadataJSON), &obj.Metadata); err != nil {
				obj.Metadata = make(map[string]string)
			}
		} else {
			obj.Metadata = make(map[string]string)
		}

		objects = append(objects, &obj)
	}

	return objects, nil
}

// GetObjectsByFile retrieves all objects for a file in a commit
func (d *Database) GetObjectsByFile(filePath, commitHash string) ([]*models.Object, error) {
	query := `SELECT id, editor_type, file_path, object_name, object_type, commit_hash, 
		object_data, tags, metadata, created_at, updated_at 
		FROM objects WHERE file_path = ? AND commit_hash = ? ORDER BY object_name`

	rows, err := d.db.Query(query, filePath, commitHash)
	if err != nil {
		return nil, &DatabaseException{Message: fmt.Sprintf("Failed to get objects: %v", err)}
	}
	defer rows.Close()

	var objects []*models.Object
	for rows.Next() {
		var obj models.Object
		var objectDataJSON, tagsJSON, metadataJSON string
		var updatedAt sql.NullInt64

		if err := rows.Scan(
			&obj.ID,
			&obj.EditorType,
			&obj.FilePath,
			&obj.ObjectName,
			&obj.ObjectType,
			&obj.CommitHash,
			&objectDataJSON,
			&tagsJSON,
			&metadataJSON,
			&obj.CreatedAt,
			&updatedAt,
		); err != nil {
			continue
		}

		if updatedAt.Valid {
			obj.UpdatedAt = updatedAt.Int64
		}

		// Parse JSON fields
		if objectDataJSON != "" {
			if err := json.Unmarshal([]byte(objectDataJSON), &obj.ObjectData); err != nil {
				obj.ObjectData = make(map[string]interface{})
			}
		} else {
			obj.ObjectData = make(map[string]interface{})
		}

		if tagsJSON != "" {
			if err := json.Unmarshal([]byte(tagsJSON), &obj.Tags); err != nil {
				obj.Tags = []string{}
			}
		} else {
			obj.Tags = []string{}
		}

		if metadataJSON != "" {
			if err := json.Unmarshal([]byte(metadataJSON), &obj.Metadata); err != nil {
				obj.Metadata = make(map[string]string)
			}
		} else {
			obj.Metadata = make(map[string]string)
		}

		objects = append(objects, &obj)
	}

	return objects, nil
}

// GetObjectsByTag retrieves all objects with a specific tag for a commit
func (d *Database) GetObjectsByTag(tag, commitHash string) ([]*models.Object, error) {
	// Use LIKE to search for tag in JSON array
	query := `SELECT id, editor_type, file_path, object_name, object_type, commit_hash, 
		object_data, tags, metadata, created_at, updated_at 
		FROM objects WHERE commit_hash = ? AND tags LIKE ? ORDER BY file_path, object_name`

	searchPattern := "%\"" + tag + "\"%"
	rows, err := d.db.Query(query, commitHash, searchPattern)
	if err != nil {
		return nil, &DatabaseException{Message: fmt.Sprintf("Failed to get objects by tag: %v", err)}
	}
	defer rows.Close()

	var objects []*models.Object
	for rows.Next() {
		var obj models.Object
		var objectDataJSON, tagsJSON, metadataJSON string
		var updatedAt sql.NullInt64

		if err := rows.Scan(
			&obj.ID,
			&obj.EditorType,
			&obj.FilePath,
			&obj.ObjectName,
			&obj.ObjectType,
			&obj.CommitHash,
			&objectDataJSON,
			&tagsJSON,
			&metadataJSON,
			&obj.CreatedAt,
			&updatedAt,
		); err != nil {
			continue
		}

		if updatedAt.Valid {
			obj.UpdatedAt = updatedAt.Int64
		}

		// Parse JSON fields
		if objectDataJSON != "" {
			if err := json.Unmarshal([]byte(objectDataJSON), &obj.ObjectData); err != nil {
				obj.ObjectData = make(map[string]interface{})
			}
		} else {
			obj.ObjectData = make(map[string]interface{})
		}

		if tagsJSON != "" {
			if err := json.Unmarshal([]byte(tagsJSON), &obj.Tags); err != nil {
				obj.Tags = []string{}
			}
		} else {
			obj.Tags = []string{}
		}

		if metadataJSON != "" {
			if err := json.Unmarshal([]byte(metadataJSON), &obj.Metadata); err != nil {
				obj.Metadata = make(map[string]string)
			}
		} else {
			obj.Metadata = make(map[string]string)
		}

		// Filter to ensure tag is actually in the array
		hasTag := false
		for _, t := range obj.Tags {
			if t == tag {
				hasTag = true
				break
			}
		}
		if hasTag {
			objects = append(objects, &obj)
		}
	}

	return objects, nil
}

// GetObjectsByTags retrieves all objects with any of the specified tags for a commit
func (d *Database) GetObjectsByTags(tags []string, commitHash string) ([]*models.Object, error) {
	if len(tags) == 0 {
		return []*models.Object{}, nil
	}

	// Build LIKE conditions for each tag
	var conditions []string
	var args []interface{}
	args = append(args, commitHash)

	for _, tag := range tags {
		conditions = append(conditions, "tags LIKE ?")
		args = append(args, "%\""+tag+"\"%")
	}

	query := fmt.Sprintf(`SELECT id, editor_type, file_path, object_name, object_type, commit_hash, 
		object_data, tags, metadata, created_at, updated_at 
		FROM objects WHERE commit_hash = ? AND (%s) ORDER BY file_path, object_name`,
		strings.Join(conditions, " OR "))

	rows, err := d.db.Query(query, args...)
	if err != nil {
		return nil, &DatabaseException{Message: fmt.Sprintf("Failed to get objects by tags: %v", err)}
	}
	defer rows.Close()

	var objects []*models.Object
	seen := make(map[string]bool) // To avoid duplicates

	for rows.Next() {
		var obj models.Object
		var objectDataJSON, tagsJSON, metadataJSON string
		var updatedAt sql.NullInt64

		if err := rows.Scan(
			&obj.ID,
			&obj.EditorType,
			&obj.FilePath,
			&obj.ObjectName,
			&obj.ObjectType,
			&obj.CommitHash,
			&objectDataJSON,
			&tagsJSON,
			&metadataJSON,
			&obj.CreatedAt,
			&updatedAt,
		); err != nil {
			continue
		}

		// Check for duplicates
		key := fmt.Sprintf("%s/%s/%s", obj.ObjectName, obj.CommitHash, obj.FilePath)
		if seen[key] {
			continue
		}
		seen[key] = true

		if updatedAt.Valid {
			obj.UpdatedAt = updatedAt.Int64
		}

		// Parse JSON fields
		if objectDataJSON != "" {
			if err := json.Unmarshal([]byte(objectDataJSON), &obj.ObjectData); err != nil {
				obj.ObjectData = make(map[string]interface{})
			}
		} else {
			obj.ObjectData = make(map[string]interface{})
		}

		if tagsJSON != "" {
			if err := json.Unmarshal([]byte(tagsJSON), &obj.Tags); err != nil {
				obj.Tags = []string{}
			}
		} else {
			obj.Tags = []string{}
		}

		if metadataJSON != "" {
			if err := json.Unmarshal([]byte(metadataJSON), &obj.Metadata); err != nil {
				obj.Metadata = make(map[string]string)
			}
		} else {
			obj.Metadata = make(map[string]string)
		}

		// Filter to ensure at least one tag is in the array
		hasTag := false
		for _, t := range obj.Tags {
			for _, searchTag := range tags {
				if t == searchTag {
					hasTag = true
					break
				}
			}
			if hasTag {
				break
			}
		}
		if hasTag {
			objects = append(objects, &obj)
		}
	}

	return objects, nil
}

// AddTagToObject adds a tag to an object
func (d *Database) AddTagToObject(commitHash, filePath, objectName, tag string) error {
	obj, err := d.GetObject(commitHash, filePath, objectName)
	if err != nil {
		return err
	}

	// Check if tag already exists
	for _, t := range obj.Tags {
		if t == tag {
			return nil // Tag already exists
		}
	}

	obj.Tags = append(obj.Tags, tag)
	return d.UpdateObject(obj)
}

// RemoveTagFromObject removes a tag from an object
func (d *Database) RemoveTagFromObject(commitHash, filePath, objectName, tag string) error {
	obj, err := d.GetObject(commitHash, filePath, objectName)
	if err != nil {
		return err
	}

	// Remove tag from array
	newTags := []string{}
	for _, t := range obj.Tags {
		if t != tag {
			newTags = append(newTags, t)
		}
	}

	obj.Tags = newTags
	return d.UpdateObject(obj)
}

// SetObjectTags sets all tags for an object
func (d *Database) SetObjectTags(commitHash, filePath, objectName string, tags []string) error {
	obj, err := d.GetObject(commitHash, filePath, objectName)
	if err != nil {
		return err
	}

	obj.Tags = tags
	return d.UpdateObject(obj)
}

// SetObjectMetadata sets a metadata key-value pair for an object
func (d *Database) SetObjectMetadata(commitHash, filePath, objectName, key, value string) error {
	obj, err := d.GetObject(commitHash, filePath, objectName)
	if err != nil {
		return err
	}

	if obj.Metadata == nil {
		obj.Metadata = make(map[string]string)
	}
	obj.Metadata[key] = value
	return d.UpdateObject(obj)
}

// GetObjectMetadata retrieves all metadata for an object
func (d *Database) GetObjectMetadata(commitHash, filePath, objectName string) (map[string]string, error) {
	obj, err := d.GetObject(commitHash, filePath, objectName)
	if err != nil {
		return nil, err
	}

	return obj.Metadata, nil
}

// ========== Review Methods ==========

// AddReview adds a new review
func (d *Database) AddReview(review *models.Review) (int64, error) {
	query := `INSERT INTO reviews (commit_hash, file_path, object_name, comment, author, created_at) 
		VALUES (?, ?, ?, ?, ?, ?)`

	var objectName sql.NullString
	if review.ObjectName != "" {
		objectName = sql.NullString{String: review.ObjectName, Valid: true}
	}

	result, err := d.db.Exec(query,
		review.CommitHash,
		review.FilePath,
		objectName,
		review.Comment,
		review.Author,
		review.CreatedAt,
	)
	if err != nil {
		return 0, &DatabaseException{Message: fmt.Sprintf("Failed to add review: %v", err)}
	}

	id, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}
	review.ID = id

	return id, nil
}

// GetReviews retrieves all reviews
func (d *Database) GetReviews() ([]*models.Review, error) {
	query := `SELECT id, commit_hash, file_path, object_name, comment, author, created_at 
		FROM reviews ORDER BY created_at DESC`

	rows, err := d.db.Query(query)
	if err != nil {
		return nil, &DatabaseException{Message: fmt.Sprintf("Failed to get reviews: %v", err)}
	}
	defer rows.Close()

	var reviews []*models.Review
	for rows.Next() {
		var review models.Review
		var objectName sql.NullString

		if err := rows.Scan(
			&review.ID,
			&review.CommitHash,
			&review.FilePath,
			&objectName,
			&review.Comment,
			&review.Author,
			&review.CreatedAt,
		); err != nil {
			continue
		}

		if objectName.Valid {
			review.ObjectName = objectName.String
		}

		reviews = append(reviews, &review)
	}

	return reviews, nil
}

// GetReviewsByCommit retrieves all reviews for a commit
func (d *Database) GetReviewsByCommit(commitHash string) ([]*models.Review, error) {
	query := `SELECT id, commit_hash, file_path, object_name, comment, author, created_at 
		FROM reviews WHERE commit_hash = ? ORDER BY created_at DESC`

	rows, err := d.db.Query(query, commitHash)
	if err != nil {
		return nil, &DatabaseException{Message: fmt.Sprintf("Failed to get reviews: %v", err)}
	}
	defer rows.Close()

	var reviews []*models.Review
	for rows.Next() {
		var review models.Review
		var objectName sql.NullString

		if err := rows.Scan(
			&review.ID,
			&review.CommitHash,
			&review.FilePath,
			&objectName,
			&review.Comment,
			&review.Author,
			&review.CreatedAt,
		); err != nil {
			continue
		}

		if objectName.Valid {
			review.ObjectName = objectName.String
		}

		reviews = append(reviews, &review)
	}

	return reviews, nil
}

// GetReviewsByObject retrieves all reviews for a specific object
func (d *Database) GetReviewsByObject(commitHash, filePath, objectName string) ([]*models.Review, error) {
	query := `SELECT id, commit_hash, file_path, object_name, comment, author, created_at 
		FROM reviews WHERE commit_hash = ? AND file_path = ? AND object_name = ? ORDER BY created_at DESC`

	rows, err := d.db.Query(query, commitHash, filePath, objectName)
	if err != nil {
		return nil, &DatabaseException{Message: fmt.Sprintf("Failed to get reviews: %v", err)}
	}
	defer rows.Close()

	var reviews []*models.Review
	for rows.Next() {
		var review models.Review
		var objName sql.NullString

		if err := rows.Scan(
			&review.ID,
			&review.CommitHash,
			&review.FilePath,
			&objName,
			&review.Comment,
			&review.Author,
			&review.CreatedAt,
		); err != nil {
			continue
		}

		if objName.Valid {
			review.ObjectName = objName.String
		}

		reviews = append(reviews, &review)
	}

	return reviews, nil
}

// GetReviewsByFile retrieves all reviews for a file in a commit
func (d *Database) GetReviewsByFile(commitHash, filePath string) ([]*models.Review, error) {
	query := `SELECT id, commit_hash, file_path, object_name, comment, author, created_at 
		FROM reviews WHERE commit_hash = ? AND file_path = ? ORDER BY created_at DESC`

	rows, err := d.db.Query(query, commitHash, filePath)
	if err != nil {
		return nil, &DatabaseException{Message: fmt.Sprintf("Failed to get reviews: %v", err)}
	}
	defer rows.Close()

	var reviews []*models.Review
	for rows.Next() {
		var review models.Review
		var objectName sql.NullString

		if err := rows.Scan(
			&review.ID,
			&review.CommitHash,
			&review.FilePath,
			&objectName,
			&review.Comment,
			&review.Author,
			&review.CreatedAt,
		); err != nil {
			continue
		}

		if objectName.Valid {
			review.ObjectName = objectName.String
		}

		reviews = append(reviews, &review)
	}

	return reviews, nil
}

// DeleteReview deletes a review by ID
func (d *Database) DeleteReview(id int64) error {
	result, err := d.db.Exec("DELETE FROM reviews WHERE id = ?", id)
	if err != nil {
		return &DatabaseException{Message: fmt.Sprintf("Failed to delete review: %v", err)}
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return &DatabaseException{Message: fmt.Sprintf("Review not found: %d", id)}
	}

	return nil
}
