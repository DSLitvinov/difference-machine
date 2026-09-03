#ifndef FORESTER_API_H
#define FORESTER_API_H

#ifdef __cplusplus
extern "C" {
#endif

// ============================================================================
// C Structures for structured data
// ============================================================================

// Result structure for operations
typedef struct {
    int success;        // 1 for success, 0 for error
    char* error;        // Error message if success == 0, NULL otherwise
} ForesterResult;

// Commit structure
typedef struct {
    char* hash;         // Full commit hash (64 chars)
    char* parent_hash;  // Parent commit hash (64 chars), NULL for root commit
    char** parent_hashes; // Array of parent hashes for merge commits
    int parent_count;   // Number of parents
    char* tree_hash;    // Tree hash (64 chars)
    char* author;       // Author name
    char* message;      // Commit message
    long long timestamp; // Unix timestamp
    int type;           // Commit type (0 = project)
    char* screenshot_path;
    char* error;        // Error message, NULL on success
} ForesterCommit;

// Status structure
typedef struct {
    char* current_branch;      // Current branch name
    char* head_commit;         // HEAD commit hash
    int staged_new_count;      // Number of new staged files
    char** staged_new_files;   // Array of new staged file paths
    int staged_modified_count; // Number of modified staged files
    char** staged_modified_files; // Array of modified staged file paths
    int staged_deleted_count;  // Number of deleted staged files
    char** staged_deleted_files; // Array of deleted staged file paths
    int unstaged_modified_count; // Number of unstaged modified files
    char** unstaged_modified_files; // Array of unstaged modified file paths
    int unstaged_deleted_count; // Number of unstaged deleted files
    char** unstaged_deleted_files; // Array of unstaged deleted file paths
    int untracked_count;       // Number of untracked files
    char** untracked_files;    // Array of untracked file paths
    char* error;               // Error message, NULL on success
} ForesterStatus;

// Branch structure
typedef struct {
    char* name;         // Branch name
    char* commit_hash; // Latest commit hash on this branch
    long long created_at; // Creation timestamp
    int is_current;    // 1 if this is the current branch, 0 otherwise
} ForesterBranch;

// Commit list structure
typedef struct {
    int count;          // Number of commits
    ForesterCommit* commits; // Array of commits
    char* error;        // Error message, NULL on success
} ForesterCommitList;

// Branch list structure
typedef struct {
    int count;          // Number of branches
    ForesterBranch* branches; // Array of branches
    char* error;        // Error message, NULL on success
} ForesterBranchList;

// GC stats/result structure
typedef struct {
    int success;        // 1 for success, 0 for error
    char* error;        // Error message if success == 0, NULL otherwise
    int commits_deleted;
    int trees_deleted;
    int blobs_deleted;
    int dry_run;        // 1 if dry-run
} ForesterGcResult;

// Rebuild stats/result structure
typedef struct {
    int success;        // 1 for success, 0 for error
    char* error;        // Error message if success == 0, NULL otherwise
    int commits_found;
    int commits_rebuilt;
    int trees_found;
    int blobs_found;
} ForesterRebuildResult;

// Path result structure
typedef struct {
    int success;        // 1 for success, 0 for error
    char* error;        // Error message if success == 0, NULL otherwise
    char* path;         // Result path if success == 1
} ForesterPathResult;

// Content result structure (binary/text blob)
typedef struct {
    int success;        // 1 for success, 0 for error
    char* error;        // Error message if success == 0, NULL otherwise
    char* data;         // Content bytes
    long long size;     // Size of content in bytes
} ForesterContentResult;

// Lock structure
typedef struct {
    char* file_path;
    char* user;
    char* branch;
    int lock_type;      // 0 = exclusive, 1 = shared
    long long created_at;
    long long expires_at;
} ForesterLock;

// Lock list structure
typedef struct {
    int count;          // Number of locks
    ForesterLock* locks; // Array of locks
} ForesterLockList;

// File entry structure (for commit tree files)
typedef struct {
    char* path;         // File path
    char* hash;         // File blob hash
    char* type_;        // Entry type (blob, tree) - note: type_ to avoid Go reserved word
} ForesterFileEntry;

// File list structure (for commit tree files)
typedef struct {
    int count;          // Number of files
    ForesterFileEntry* files; // Array of files
    char* error;        // Error message, NULL on success
} ForesterFileList;

// Object structure (for metadata storage)
typedef struct {
    long long id;
    char* editor_type;
    char* file_path;
    char* object_name;
    char* object_type;
    char* commit_hash;
    char* object_data;  // JSON
    char* tags;         // JSON array
    char* metadata;     // JSON
    long long created_at;
    long long updated_at;
} ForesterObject;

// Object list structure
typedef struct {
    int count;
    ForesterObject* objects;
} ForesterObjectList;

// ============================================================================
// Structured API Functions
// ============================================================================

// Initialize a Forester repository
ForesterResult* ForesterInit(const char* repoPath);

// Get repository status (structured)
ForesterStatus* ForesterGetStatus(const char* repoPath);

// Get commit log (structured)
// maxCount: maximum number of commits to return (0 = all)
// branch: branch name (NULL = current branch)
ForesterCommitList* ForesterGetLog(const char* repoPath, int maxCount, const char* branch);

// Get list of branches (structured)
ForesterBranchList* ForesterGetBranches(const char* repoPath);

// Create a branch (structured)
// commitHash: optional, NULL or empty to use current HEAD
ForesterResult* ForesterCreateBranch(const char* repoPath, const char* branchName, const char* commitHash);

// Delete a branch (structured)
ForesterResult* ForesterDeleteBranch(const char* repoPath, const char* branchName);

// Rename a branch (structured)
ForesterResult* ForesterRenameBranch(const char* repoPath, const char* oldName, const char* newName);

// Get a single commit by hash (structured)
ForesterCommit* ForesterGetCommit(const char* repoPath, const char* hash);

// Extract a commit to tmp_review or cleanup (structured)
// cleanup: 1 to cleanup tmp_review, 0 to extract
// editorPath: optional path to editor to launch (can be NULL)
ForesterPathResult* ForesterCompareExtract(const char* repoPath, const char* commitHash, int cleanup, const char* editorPath);

// Restore working directory to exactly match a commit (full overwrite, no temp dirs)
ForesterResult* ForesterRestoreVersion(const char* repoPath, const char* commitHash);

// Get file content from a commit (structured)
ForesterContentResult* ForesterGetCommitFileContent(const char* repoPath, const char* commitHash, const char* filePath);

// Run garbage collection (structured)
// dryRun: 1 for dry-run, 0 for actual
// reflogExpireDays: days to keep reflog entries
ForesterGcResult* ForesterGC(const char* repoPath, int dryRun, int reflogExpireDays);

// Scan object store and report statistics (structured)
ForesterRebuildResult* ForesterRebuild(const char* repoPath);

// List locks for current branch (structured)
ForesterLockList* ForesterListLocks(const char* repoPath);

// Acquire a lock (structured)
// lockType: 0 = exclusive, 1 = shared
// expireHours: 0 = no expiration
ForesterResult* ForesterAcquireLock(
    const char* repoPath,
    const char* filePath,
    const char* user,
    int lockType,
    int expireHours
);

// Release a lock (structured)
ForesterResult* ForesterReleaseLock(const char* repoPath, const char* filePath, const char* user);

// ============================================================================
// Object API (metadata)
// ============================================================================

ForesterResult* ForesterAddObject(
    const char* repoPath,
    const char* editorType,
    const char* filePath,
    const char* objectName,
    const char* objectType,
    const char* commitHash,
    const char* objectDataJSON,
    const char* tagsJSON,
    const char* metadataJSON
);

ForesterObject* ForesterGetObject(const char* repoPath, const char* commitHash, const char* filePath, const char* objectName);
ForesterObjectList* ForesterGetObjectsByCommit(const char* repoPath, const char* commitHash);
ForesterObjectList* ForesterGetObjectsByFile(const char* repoPath, const char* filePath, const char* commitHash);

ForesterResult* ForesterAddTagToObject(const char* repoPath, const char* commitHash, const char* filePath, const char* objectName, const char* tag);
ForesterResult* ForesterRemoveTagFromObject(const char* repoPath, const char* commitHash, const char* filePath, const char* objectName, const char* tag);
ForesterResult* ForesterSetObjectMetadata(const char* repoPath, const char* commitHash, const char* filePath, const char* objectName, const char* key, const char* value);
ForesterResult* ForesterDeleteObject(const char* repoPath, const char* commitHash, const char* filePath, const char* objectName);
ForesterResult* ForesterDeleteObjectsByFile(const char* repoPath, const char* commitHash, const char* filePath);

// ============================================================================
// Simple API Functions (for compatibility, but will be deprecated)
// ============================================================================

// Add files to staging area
ForesterResult* ForesterAdd(const char* repoPath, const char* files);

// Create a commit
// amend: 1 to amend the last commit, 0 for normal commit
ForesterResult* ForesterCreateCommit(const char* repoPath, const char* message, const char* author, int amend);

// Revert a commit (structured)
ForesterResult* ForesterRevertCommit(const char* repoPath, const char* commitHash);

// Reset to a commit (structured)
// mode: "soft", "mixed", "hard" (NULL or "mixed" for default)
ForesterResult* ForesterResetCommit(const char* repoPath, const char* commitHash, const char* mode);

// Switch branch or commit
ForesterResult* ForesterSwitch(const char* repoPath, const char* target, int autoStash);

// ============================================================================
// Memory Management
// ============================================================================

// Free result structure
void ForesterFreeResult(ForesterResult* r);

// Free status structure
void ForesterFreeStatus(ForesterStatus* s);

// Free commit structure
void ForesterFreeCommit(ForesterCommit* c);

// Free commit list structure
void ForesterFreeCommitList(ForesterCommitList* list);

// Free branch list structure
void ForesterFreeBranchList(ForesterBranchList* list);

// Free GC result
void ForesterFreeGcResult(ForesterGcResult* r);

// Free rebuild result
void ForesterFreeRebuildResult(ForesterRebuildResult* r);

// Free path result
void ForesterFreePathResult(ForesterPathResult* r);

// Free content result
void ForesterFreeContentResult(ForesterContentResult* r);

// Get files from commit tree (structured)
// Returns list of files (blobs) in the commit tree
ForesterFileList* ForesterGetCommitFiles(const char* repoPath, const char* commitHash);

// Free file list structure
void ForesterFreeFileList(ForesterFileList* list);

// Free lock list
void ForesterFreeLockList(ForesterLockList* list);

// Free object structure
void ForesterFreeObject(ForesterObject* obj);

// Free object list
void ForesterFreeObjectList(ForesterObjectList* list);

// ============================================================================
// JSON API (thin C layer)
// ============================================================================

// Open a session handle for a repository working directory.
void* ForesterOpen(const char* repo_path);

// Call a JSON API method. Returns heap-allocated JSON string; free with ForesterFreeString.
char* ForesterCall(void* handle, const char* method, const char* args_json);

// Free a string returned by ForesterCall.
void ForesterFreeString(void* s);

// Close a session handle opened with ForesterOpen.
void ForesterClose(void* handle);

#ifdef __cplusplus
}
#endif

#endif // FORESTER_API_H
