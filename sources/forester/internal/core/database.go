package core

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/difference-machine/forester/internal/models"
	"github.com/mattn/go-sqlite3"
	_ "github.com/mattn/go-sqlite3"
)

// DatabaseException represents a database error
type DatabaseException struct {
	Message string
}

func (e *DatabaseException) Error() string {
	return fmt.Sprintf("Database error: %s", e.Message)
}

// Database manages SQLite database operations for Forester product metadata only:
// locks, reviews, objects, stashes, comments, and approvals.
type Database struct {
	db *sql.DB
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

	database := &Database{db: db}
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
	return d.createIndexes()
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
		"CREATE INDEX IF NOT EXISTS idx_locks_file ON locks(file_path)",
		"CREATE INDEX IF NOT EXISTS idx_locks_branch ON locks(branch)",
		"CREATE INDEX IF NOT EXISTS idx_comments_asset ON comments(asset_type, asset_id)",
		"CREATE INDEX IF NOT EXISTS idx_approvals_asset ON approvals(asset_type, asset_id)",
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

func populateObjectJSONFields(obj *models.Object, objectDataJSON, tagsJSON, metadataJSON string) error {
	if objectDataJSON != "" {
		if err := json.Unmarshal([]byte(objectDataJSON), &obj.ObjectData); err != nil {
			return fmt.Errorf("parse object_data: %w", err)
		}
	} else {
		obj.ObjectData = make(map[string]interface{})
	}

	if tagsJSON != "" {
		if err := json.Unmarshal([]byte(tagsJSON), &obj.Tags); err != nil {
			return fmt.Errorf("parse tags: %w", err)
		}
	} else {
		obj.Tags = []string{}
	}

	if metadataJSON != "" {
		if err := json.Unmarshal([]byte(metadataJSON), &obj.Metadata); err != nil {
			return fmt.Errorf("parse metadata: %w", err)
		}
	} else {
		obj.Metadata = make(map[string]string)
	}

	return nil
}

func scanReviewRow(rows *sql.Rows) (*models.Review, error) {
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
		return nil, fmt.Errorf("scan review row: %w", err)
	}

	if objectName.Valid {
		review.ObjectName = objectName.String
	}

	return &review, nil
}

func scanObjectRow(rows *sql.Rows) (*models.Object, error) {
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
		return nil, fmt.Errorf("scan object row: %w", err)
	}

	if updatedAt.Valid {
		obj.UpdatedAt = updatedAt.Int64
	}

	if err := populateObjectJSONFields(&obj, objectDataJSON, tagsJSON, metadataJSON); err != nil {
		return nil, err
	}

	return &obj, nil
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
			return nil, fmt.Errorf("scan stash row: %w", err)
		}
		stashCopy := stash
		stashes = append(stashes, &stashCopy)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate stashes: %w", err)
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
		var sqliteErr sqlite3.Error
		if errors.As(err, &sqliteErr) && sqliteErr.Code == sqlite3.ErrConstraint {
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
			return nil, fmt.Errorf("scan lock row: %w", err)
		}
		if expiresAt.Valid {
			lock.ExpiresAt = expiresAt.Int64
		}
		lockCopy := lock
		locks = append(locks, &lockCopy)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate locks: %w", err)
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
			return nil, fmt.Errorf("scan comment row: %w", err)
		}
		comment.Resolved = resolved != 0
		commentCopy := comment
		comments = append(comments, &commentCopy)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate comments: %w", err)
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
			return nil, fmt.Errorf("scan approval row: %w", err)
		}
		approval.Status = models.ApprovalStatus(statusStr)
		approvalCopy := approval
		approvals = append(approvals, &approvalCopy)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate approvals: %w", err)
	}

	return approvals, nil
}

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

	if err := populateObjectJSONFields(&obj, objectDataJSON, tagsJSON, metadataJSON); err != nil {
		return nil, &DatabaseException{Message: fmt.Sprintf("Failed to get object: %v", err)}
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
		obj, err := scanObjectRow(rows)
		if err != nil {
			return nil, &DatabaseException{Message: fmt.Sprintf("Failed to get objects: %v", err)}
		}
		objects = append(objects, obj)
	}
	if err := rows.Err(); err != nil {
		return nil, &DatabaseException{Message: fmt.Sprintf("Failed to get objects: %v", err)}
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
		obj, err := scanObjectRow(rows)
		if err != nil {
			return nil, &DatabaseException{Message: fmt.Sprintf("Failed to get objects: %v", err)}
		}
		objects = append(objects, obj)
	}
	if err := rows.Err(); err != nil {
		return nil, &DatabaseException{Message: fmt.Sprintf("Failed to get objects: %v", err)}
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
		obj, err := scanObjectRow(rows)
		if err != nil {
			return nil, &DatabaseException{Message: fmt.Sprintf("Failed to get objects by tag: %v", err)}
		}

		hasTag := false
		for _, t := range obj.Tags {
			if t == tag {
				hasTag = true
				break
			}
		}
		if hasTag {
			objects = append(objects, obj)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, &DatabaseException{Message: fmt.Sprintf("Failed to get objects by tag: %v", err)}
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
		obj, err := scanObjectRow(rows)
		if err != nil {
			return nil, &DatabaseException{Message: fmt.Sprintf("Failed to get objects by tags: %v", err)}
		}

		key := fmt.Sprintf("%s/%s/%s", obj.ObjectName, obj.CommitHash, obj.FilePath)
		if seen[key] {
			continue
		}
		seen[key] = true

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
			objects = append(objects, obj)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, &DatabaseException{Message: fmt.Sprintf("Failed to get objects by tags: %v", err)}
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

func fetchReviews(rows *sql.Rows) ([]*models.Review, error) {
	var reviews []*models.Review
	for rows.Next() {
		review, err := scanReviewRow(rows)
		if err != nil {
			return nil, err
		}
		reviews = append(reviews, review)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate reviews: %w", err)
	}
	return reviews, nil
}

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

	reviews, err := fetchReviews(rows)
	if err != nil {
		return nil, &DatabaseException{Message: fmt.Sprintf("Failed to get reviews: %v", err)}
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

	reviews, err := fetchReviews(rows)
	if err != nil {
		return nil, &DatabaseException{Message: fmt.Sprintf("Failed to get reviews: %v", err)}
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

	reviews, err := fetchReviews(rows)
	if err != nil {
		return nil, &DatabaseException{Message: fmt.Sprintf("Failed to get reviews: %v", err)}
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

	reviews, err := fetchReviews(rows)
	if err != nil {
		return nil, &DatabaseException{Message: fmt.Sprintf("Failed to get reviews: %v", err)}
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
