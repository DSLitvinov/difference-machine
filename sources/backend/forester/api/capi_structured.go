//go:build cgo
// +build cgo

// Package main implements the Forester C API (c-shared).
// CGO typedefs and exports live in capi_structured.go.
package main

/*
#include <stdlib.h>
#include <string.h>

// C Structures (must match forester.h)
typedef struct {
    int success;
    char* error;
} ForesterResult;

typedef struct {
    char* hash;
    char* parent_hash;
    char** parent_hashes;
    int parent_count;
    char* tree_hash;
    char* author;
    char* message;
    long long timestamp;
    int type;
    char* screenshot_path;
    char* error;
} ForesterCommit;

typedef struct {
    char* current_branch;
    char* head_commit;
    int staged_new_count;
    char** staged_new_files;
    int staged_modified_count;
    char** staged_modified_files;
    int staged_deleted_count;
    char** staged_deleted_files;
    int unstaged_modified_count;
    char** unstaged_modified_files;
    int unstaged_deleted_count;
    char** unstaged_deleted_files;
    int untracked_count;
    char** untracked_files;
    char* error;
} ForesterStatus;

typedef struct {
    char* name;
    char* commit_hash;
    long long created_at;
    int is_current;
} ForesterBranch;

typedef struct {
    int count;
    ForesterCommit* commits;
    char* error;
} ForesterCommitList;

typedef struct {
    int count;
    ForesterBranch* branches;
    char* error;
} ForesterBranchList;

typedef struct {
    int success;
    char* error;
    int commits_deleted;
    int trees_deleted;
    int blobs_deleted;
    int dry_run;
} ForesterGcResult;

typedef struct {
    int success;
    char* error;
    int commits_found;
    int commits_rebuilt;
    int trees_found;
    int blobs_found;
} ForesterRebuildResult;

typedef struct {
    int success;
    char* error;
    char* path;
} ForesterPathResult;

typedef struct {
    int success;
    char* error;
    char* data;
    long long size;
} ForesterContentResult;

typedef struct {
    char* file_path;
    char* user;
    char* branch;
    int lock_type;
    long long created_at;
    long long expires_at;
} ForesterLock;

typedef struct {
    int count;
    ForesterLock* locks;
} ForesterLockList;

typedef struct {
    long long id;
    char* editor_type;
    char* file_path;
    char* object_name;
    char* object_type;
    char* commit_hash;
    char* object_data;
    char* tags;
    char* metadata;
    long long created_at;
    long long updated_at;
} ForesterObject;

typedef struct {
    int count;
    ForesterObject* objects;
} ForesterObjectList;

typedef struct {
    char* path;
    char* hash;
    char* type_;
} ForesterFileEntry;

typedef struct {
    int count;
    ForesterFileEntry* files;
    char* error;
} ForesterFileList;
*/
import "C"
import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
	"unsafe"

	"github.com/difference-machine/forester/internal/commands"
	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/models"
	"github.com/difference-machine/forester/internal/utils"
)

// Helper function to allocate C string array
func allocateStringArray(strs []string) **C.char {
	if len(strs) == 0 {
		return nil
	}
	
	// Allocate array of char*
	cArray := (**C.char)(C.malloc(C.size_t(len(strs)) * C.size_t(unsafe.Sizeof((*C.char)(nil)))))
	
	// Allocate each string
	for i, s := range strs {
		cStr := C.CString(s)
		*(**C.char)(unsafe.Pointer(uintptr(unsafe.Pointer(cArray)) + uintptr(i)*unsafe.Sizeof((*C.char)(nil)))) = cStr
	}
	
	return cArray
}

// Helper function to free string array
func freeStringArray(arr **C.char, count int) {
	if arr == nil {
		return
	}
	
	for i := 0; i < count; i++ {
		ptr := (**C.char)(unsafe.Pointer(uintptr(unsafe.Pointer(arr)) + uintptr(i)*unsafe.Sizeof((*C.char)(nil))))
		if *ptr != nil {
			C.free(unsafe.Pointer(*ptr))
		}
	}
	C.free(unsafe.Pointer(arr))
}

func contentError(message string) *C.ForesterContentResult {
	result := (*C.ForesterContentResult)(C.calloc(1, C.size_t(unsafe.Sizeof(C.ForesterContentResult{}))))
	result.success = 0
	result.error = C.CString(message)
	result.data = nil
	result.size = 0
	return result
}

func statusError(message string) *C.ForesterStatus {
	status := (*C.ForesterStatus)(C.calloc(1, C.size_t(unsafe.Sizeof(C.ForesterStatus{}))))
	status.error = C.CString(message)
	return status
}

func commitListError(message string) *C.ForesterCommitList {
	list := (*C.ForesterCommitList)(C.calloc(1, C.size_t(unsafe.Sizeof(C.ForesterCommitList{}))))
	list.error = C.CString(message)
	return list
}

func branchListError(message string) *C.ForesterBranchList {
	list := (*C.ForesterBranchList)(C.calloc(1, C.size_t(unsafe.Sizeof(C.ForesterBranchList{}))))
	list.error = C.CString(message)
	return list
}

func commitError(message string) *C.ForesterCommit {
	commit := (*C.ForesterCommit)(C.calloc(1, C.size_t(unsafe.Sizeof(C.ForesterCommit{}))))
	commit.error = C.CString(message)
	return commit
}

func fileListError(message string) *C.ForesterFileList {
	list := (*C.ForesterFileList)(C.calloc(1, C.size_t(unsafe.Sizeof(C.ForesterFileList{}))))
	list.error = C.CString(message)
	return list
}

func getCurrentBranch(repoPath string) string {
	refs := core.NewRefs(repoPath)
	branch, err := refs.GetCurrentBranch()
	if err != nil || branch == "" {
		return "main"
	}
	return branch
}

func checkAllChildrenDeletedAPI(repo *core.Repository, commitHash string, expiredDeletedCommits, referencedCommits map[string]bool) (bool, error) {
	children, err := repo.GetChildCommits(commitHash)
	if err != nil {
		return false, err
	}

	if len(children) == 0 {
		return true, nil
	}

	for _, childHash := range children {
		if referencedCommits[childHash] {
			return false, nil
		}
		if !expiredDeletedCommits[childHash] {
			return false, nil
		}
		allChildrenDeleted, err := checkAllChildrenDeletedAPI(repo, childHash, expiredDeletedCommits, referencedCommits)
		if err != nil || !allChildrenDeleted {
			return false, err
		}
	}

	return true, nil
}

//export ForesterGetStatus
func ForesterGetStatus(repoPath *C.char) *C.ForesterStatus {
	path := C.GoString(repoPath)
	if path == "" {
		path = "."
	}
	
	// Change to repository directory
	oldDir, _ := os.Getwd()
	if path != "." {
		if err := os.Chdir(path); err != nil {
			return statusError(fmt.Sprintf("failed to change directory: %s", err.Error()))
		}
		defer os.Chdir(oldDir)
	}
	
	repoPathGo, err := utils.FindRepositoryRoot(".")
	if err != nil {
		return statusError("not a Forester repository")
	}
	
	repo, err := core.OpenRepository(repoPathGo)
	if err != nil {
		return statusError(fmt.Sprintf("failed to open repository: %s", err.Error()))
	}
	defer repo.Close()

	storage := repo.Storage

	// Get current branch
	currentBranch, err := repo.Refs.GetCurrentBranch()
	if err != nil || currentBranch == "" {
		currentBranch = "main"
	}

	// Get HEAD commit
	headCommit, err := repo.GetBranchHead(currentBranch)
	if err != nil {
		headCommit = ""
	}

	// Get tree of last commit
	var lastTree models.Tree
	if headCommit != "" {
		commit, err := repo.GetCommit(headCommit)
		if err == nil {
			treeContent, err := storage.GetTreeContent(commit.TreeHash)
			if err == nil {
				json.Unmarshal([]byte(treeContent), &lastTree)
			}
		}
	}
	
	// Get index
	index, err := core.NewIndex(repoPathGo)
	if err != nil {
		return statusError(fmt.Sprintf("failed to open index: %s", err.Error()))
	}
	
	// Scan working directory
	allFiles, err := utils.ListFiles(repoPathGo, true)
	if err != nil {
		return statusError(fmt.Sprintf("failed to list files: %s", err.Error()))
	}
	
	var stagedNewFiles []string
	var stagedModifiedFiles []string
	var stagedDeletedFiles []string
	var unstagedModifiedFiles []string
	var unstagedDeletedFiles []string
	var untrackedFiles []string
	
	// Create maps
	trackedMap := make(map[string]string)
	for _, entry := range lastTree.Entries {
		trackedMap[entry.Name] = entry.Hash
	}
	
	indexMap := index.GetEntries()
	
	// Check staged files
	for relPath, indexHash := range indexMap {
		headHash, existsInHead := trackedMap[relPath]
		if !existsInHead {
			stagedNewFiles = append(stagedNewFiles, relPath)
		} else if headHash != indexHash {
			stagedModifiedFiles = append(stagedModifiedFiles, relPath)
		}
	}

	// Check for unstaged deletions (in HEAD but not in index)
	for relPath := range trackedMap {
		if _, existsInIndex := indexMap[relPath]; !existsInIndex {
			fullPath := filepath.Join(repoPathGo, relPath)
			if !utils.Exists(fullPath) {
				unstagedDeletedFiles = append(unstagedDeletedFiles, relPath)
			}
		}
	}
	
	// Load .dfmignore
	patterns := utils.NewPatterns()
	ignorePath := filepath.Join(repoPathGo, ".dfmignore")
	if utils.Exists(ignorePath) {
		patterns.LoadFromFile(ignorePath)
	}
	
	// Check working directory files
	for _, filePath := range allFiles {
		if strings.Contains(filePath, ".DFM") {
			continue
		}
		
		relPath, err := filepath.Rel(repoPathGo, filePath)
		if err != nil {
			continue
		}
		relPath = filepath.ToSlash(relPath)
		
		if patterns.Matches(relPath) {
			continue
		}
		
		if !utils.IsFile(filePath) {
			continue
		}
		
		currentHash, err := core.HashFile(filePath)
		if err != nil {
			continue
		}
		
		indexHash, isStaged := indexMap[relPath]
		headHash, isTracked := trackedMap[relPath]
		
		if !isTracked && !isStaged {
			untrackedFiles = append(untrackedFiles, relPath)
		} else if isStaged {
			if currentHash != indexHash {
				unstagedModifiedFiles = append(unstagedModifiedFiles, relPath)
			}
		} else if isTracked {
			if currentHash != headHash {
				unstagedModifiedFiles = append(unstagedModifiedFiles, relPath)
			}
		}
	}
	
	// Check for staged deletions (files in index but not in working directory)
	for relPath := range indexMap {
		fullPath := filepath.Join(repoPathGo, relPath)
		if !utils.Exists(fullPath) {
			if _, existsInHead := trackedMap[relPath]; existsInHead {
				stagedDeletedFiles = append(stagedDeletedFiles, relPath)
			}
		}
	}
	
	// Allocate C structure
	status := (*C.ForesterStatus)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterStatus{}))))
	
	status.current_branch = C.CString(currentBranch)
	status.head_commit = C.CString(headCommit)
	
	status.staged_new_count = C.int(len(stagedNewFiles))
	status.staged_new_files = allocateStringArray(stagedNewFiles)
	
	status.staged_modified_count = C.int(len(stagedModifiedFiles))
	status.staged_modified_files = allocateStringArray(stagedModifiedFiles)
	
	status.staged_deleted_count = C.int(len(stagedDeletedFiles))
	status.staged_deleted_files = allocateStringArray(stagedDeletedFiles)
	
	status.unstaged_modified_count = C.int(len(unstagedModifiedFiles))
	status.unstaged_modified_files = allocateStringArray(unstagedModifiedFiles)
	
	status.unstaged_deleted_count = C.int(len(unstagedDeletedFiles))
	status.unstaged_deleted_files = allocateStringArray(unstagedDeletedFiles)
	
	status.untracked_count = C.int(len(untrackedFiles))
	status.untracked_files = allocateStringArray(untrackedFiles)
	
	return status
}

//export ForesterFreeStatus
func ForesterFreeStatus(s *C.ForesterStatus) {
	if s == nil {
		return
	}
	
	if s.current_branch != nil {
		C.free(unsafe.Pointer(s.current_branch))
	}
	if s.head_commit != nil {
		C.free(unsafe.Pointer(s.head_commit))
	}
	
	freeStringArray(s.staged_new_files, int(s.staged_new_count))
	freeStringArray(s.staged_modified_files, int(s.staged_modified_count))
	freeStringArray(s.staged_deleted_files, int(s.staged_deleted_count))
	freeStringArray(s.unstaged_modified_files, int(s.unstaged_modified_count))
	freeStringArray(s.unstaged_deleted_files, int(s.unstaged_deleted_count))
	if s.untracked_files != nil {
		freeStringArray(s.untracked_files, int(s.untracked_count))
	}
	if s.error != nil {
		C.free(unsafe.Pointer(s.error))
	}
	
	C.free(unsafe.Pointer(s))
}

//export ForesterGetLog
func ForesterGetLog(repoPath *C.char, maxCount C.int, branch *C.char) *C.ForesterCommitList {
	path := C.GoString(repoPath)
	if path == "" {
		path = "."
	}
	
	// Change to repository directory
	oldDir, _ := os.Getwd()
	if path != "." {
		if err := os.Chdir(path); err != nil {
			return commitListError(fmt.Sprintf("failed to change directory: %s", err.Error()))
		}
		defer os.Chdir(oldDir)
	}
	
	repoPathGo, err := utils.FindRepositoryRoot(".")
	if err != nil {
		return commitListError("not a Forester repository")
	}
	
	repo, err := core.OpenRepository(repoPathGo)
	if err != nil {
		return commitListError(fmt.Sprintf("failed to open repository: %s", err.Error()))
	}
	defer repo.Close()

	branchName := C.GoString(branch)
	if branchName == "" {
		branchName, _ = repo.Refs.GetCurrentBranch()
		if branchName == "" {
			branchName = "main"
		}
	}

	limit := int(maxCount)
	if limit <= 0 {
		limit = 100
	}

	commits, err := repo.GetCommitHistory(branchName, limit)
	if err != nil {
		return commitListError(fmt.Sprintf("failed to get commit history: %s", err.Error()))
	}
	
	// Allocate commit list (zeroed)
	list := (*C.ForesterCommitList)(C.calloc(1, C.size_t(unsafe.Sizeof(C.ForesterCommitList{}))))
	list.count = C.int(len(commits))
	
	if len(commits) > 0 {
		// Allocate array of commits (zeroed)
		cCommits := (*C.ForesterCommit)(C.calloc(C.size_t(len(commits)), C.size_t(unsafe.Sizeof(C.ForesterCommit{}))))
		
		for i, commit := range commits {
			cCommit := (*C.ForesterCommit)(unsafe.Pointer(uintptr(unsafe.Pointer(cCommits)) + uintptr(i)*unsafe.Sizeof(C.ForesterCommit{})))
			
			cCommit.hash = C.CString(commit.Hash)
			if commit.ParentHash != "" {
				cCommit.parent_hash = C.CString(commit.ParentHash)
			} else {
				cCommit.parent_hash = nil
			}
			cCommit.tree_hash = C.CString(commit.TreeHash)
			cCommit.author = C.CString(commit.Author)
			cCommit.message = C.CString(commit.Message)
			cCommit.timestamp = C.longlong(commit.Timestamp)
			cCommit._type = C.int(int(commit.Type))
			
			// Handle screenshot_path
			if commit.ScreenshotPath != "" {
				cCommit.screenshot_path = C.CString(commit.ScreenshotPath)
			} else {
				cCommit.screenshot_path = nil
			}
			
			// Handle multiple parents
			if len(commit.ParentHashes) > 0 {
				cCommit.parent_count = C.int(len(commit.ParentHashes))
				cCommit.parent_hashes = allocateStringArray(commit.ParentHashes)
			} else {
				cCommit.parent_count = 0
				cCommit.parent_hashes = nil
			}
		}
		
		list.commits = cCommits
	} else {
		list.commits = nil
	}
	
	return list
}

//export ForesterFreeCommitList
func ForesterFreeCommitList(list *C.ForesterCommitList) {
	if list == nil {
		return
	}
	
	if list.commits != nil {
		for i := 0; i < int(list.count); i++ {
			cCommit := (*C.ForesterCommit)(unsafe.Pointer(uintptr(unsafe.Pointer(list.commits)) + uintptr(i)*unsafe.Sizeof(C.ForesterCommit{})))
			
			if cCommit.hash != nil {
				C.free(unsafe.Pointer(cCommit.hash))
			}
			if cCommit.parent_hash != nil {
				C.free(unsafe.Pointer(cCommit.parent_hash))
			}
			if cCommit.tree_hash != nil {
				C.free(unsafe.Pointer(cCommit.tree_hash))
			}
			if cCommit.author != nil {
				C.free(unsafe.Pointer(cCommit.author))
			}
			if cCommit.message != nil {
				C.free(unsafe.Pointer(cCommit.message))
			}
			if cCommit.screenshot_path != nil {
				C.free(unsafe.Pointer(cCommit.screenshot_path))
			}
			if cCommit.parent_hashes != nil {
				freeStringArray(cCommit.parent_hashes, int(cCommit.parent_count))
			}
		}
		C.free(unsafe.Pointer(list.commits))
	}
	if list.error != nil {
		C.free(unsafe.Pointer(list.error))
	}
	
	C.free(unsafe.Pointer(list))
}

//export ForesterGetBranches
func ForesterGetBranches(repoPath *C.char) *C.ForesterBranchList {
	path := C.GoString(repoPath)
	if path == "" {
		path = "."
	}
	
	// Change to repository directory
	oldDir, _ := os.Getwd()
	if path != "." {
		if err := os.Chdir(path); err != nil {
			return branchListError(fmt.Sprintf("failed to change directory: %s", err.Error()))
		}
		defer os.Chdir(oldDir)
	}
	
	repoPathGo, err := utils.FindRepositoryRoot(".")
	if err != nil {
		return branchListError("not a Forester repository")
	}
	
	repo, err := core.OpenRepository(repoPathGo)
	if err != nil {
		return branchListError(fmt.Sprintf("failed to open repository: %s", err.Error()))
	}
	defer repo.Close()

	branchNames, err := repo.ListBranches()
	if err != nil {
		return branchListError(fmt.Sprintf("failed to list branches: %s", err.Error()))
	}

	currentBranch, _ := repo.Refs.GetCurrentBranch()

	// Allocate branch list
	list := (*C.ForesterBranchList)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterBranchList{}))))
	list.count = C.int(len(branchNames))

	if len(branchNames) > 0 {
		// Allocate array of branches
		cBranches := (*C.ForesterBranch)(C.malloc(C.size_t(len(branchNames)) * C.size_t(unsafe.Sizeof(C.ForesterBranch{}))))

		for i, branchName := range branchNames {
			cBranch := (*C.ForesterBranch)(unsafe.Pointer(uintptr(unsafe.Pointer(cBranches)) + uintptr(i)*unsafe.Sizeof(C.ForesterBranch{})))

			commitHash, _ := repo.GetBranchHead(branchName)
			cBranch.name = C.CString(branchName)
			cBranch.commit_hash = C.CString(commitHash)
			cBranch.created_at = 0
			if branchName == currentBranch {
				cBranch.is_current = 1
			} else {
				cBranch.is_current = 0
			}
		}
		
		list.branches = cBranches
	} else {
		list.branches = nil
	}
	
	return list
}

//export ForesterFreeBranchList
func ForesterFreeBranchList(list *C.ForesterBranchList) {
	if list == nil {
		return
	}
	
	if list.branches != nil {
		for i := 0; i < int(list.count); i++ {
			cBranch := (*C.ForesterBranch)(unsafe.Pointer(uintptr(unsafe.Pointer(list.branches)) + uintptr(i)*unsafe.Sizeof(C.ForesterBranch{})))
			
			if cBranch.name != nil {
				C.free(unsafe.Pointer(cBranch.name))
			}
			if cBranch.commit_hash != nil {
				C.free(unsafe.Pointer(cBranch.commit_hash))
			}
		}
		C.free(unsafe.Pointer(list.branches))
	}
	if list.error != nil {
		C.free(unsafe.Pointer(list.error))
	}
	
	C.free(unsafe.Pointer(list))
}

//export ForesterGetCommit
func ForesterGetCommit(repoPath *C.char, hash *C.char) *C.ForesterCommit {
	path := C.GoString(repoPath)
	hashStr := C.GoString(hash)
	
	if path == "" {
		path = "."
	}
	
	// Change to repository directory
	oldDir, _ := os.Getwd()
	if path != "." {
		if err := os.Chdir(path); err != nil {
			return commitError(fmt.Sprintf("failed to change directory: %s", err.Error()))
		}
		defer os.Chdir(oldDir)
	}
	
	repoPathGo, err := utils.FindRepositoryRoot(".")
	if err != nil {
		return commitError("not a Forester repository")
	}
	
	repo, err := core.OpenRepository(repoPathGo)
	if err != nil {
		return commitError(fmt.Sprintf("failed to open repository: %s", err.Error()))
	}
	defer repo.Close()

	commit, err := repo.GetCommit(hashStr)
	if err != nil {
		return commitError(fmt.Sprintf("failed to get commit: %s", err.Error()))
	}
	
	// Allocate commit (zeroed)
	cCommit := (*C.ForesterCommit)(C.calloc(1, C.size_t(unsafe.Sizeof(C.ForesterCommit{}))))
	
	cCommit.hash = C.CString(commit.Hash)
	if commit.ParentHash != "" {
		cCommit.parent_hash = C.CString(commit.ParentHash)
	} else {
		cCommit.parent_hash = nil
	}
	cCommit.tree_hash = C.CString(commit.TreeHash)
	cCommit.author = C.CString(commit.Author)
	cCommit.message = C.CString(commit.Message)
	cCommit.timestamp = C.longlong(commit.Timestamp)
	cCommit._type = C.int(int(commit.Type))
	
	// Handle screenshot_path
	if commit.ScreenshotPath != "" {
		cCommit.screenshot_path = C.CString(commit.ScreenshotPath)
	} else {
		cCommit.screenshot_path = nil
	}
	
	// Handle multiple parents
	if len(commit.ParentHashes) > 0 {
		cCommit.parent_count = C.int(len(commit.ParentHashes))
		cCommit.parent_hashes = allocateStringArray(commit.ParentHashes)
	} else {
		cCommit.parent_count = 0
		cCommit.parent_hashes = nil
	}
	
	return cCommit
}

//export ForesterFreeCommit
func ForesterFreeCommit(c *C.ForesterCommit) {
	if c == nil {
		return
	}
	
	if c.hash != nil {
		C.free(unsafe.Pointer(c.hash))
	}
	if c.parent_hash != nil {
		C.free(unsafe.Pointer(c.parent_hash))
	}
	if c.tree_hash != nil {
		C.free(unsafe.Pointer(c.tree_hash))
	}
	if c.author != nil {
		C.free(unsafe.Pointer(c.author))
	}
	if c.message != nil {
		C.free(unsafe.Pointer(c.message))
	}
	if c.screenshot_path != nil {
		C.free(unsafe.Pointer(c.screenshot_path))
	}
	if c.parent_hashes != nil {
		freeStringArray(c.parent_hashes, int(c.parent_count))
	}
	if c.error != nil {
		C.free(unsafe.Pointer(c.error))
	}
	
	C.free(unsafe.Pointer(c))
}

//export ForesterInit
func ForesterInit(repoPath *C.char) *C.ForesterResult {
	path := C.GoString(repoPath)
	if path == "" {
		path = "."
	}
	
	// Change to repository directory
	oldDir, _ := os.Getwd()
	if path != "." {
		if err := os.Chdir(path); err != nil {
			result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
			result.success = 0
			result.error = C.CString(fmt.Sprintf("failed to change directory: %s", err.Error()))
			return result
		}
		defer os.Chdir(oldDir)
	}
	
	err := commands.Init([]string{})
	
	result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
	if err != nil {
		result.success = 0
		result.error = C.CString(err.Error())
	} else {
		result.success = 1
		result.error = nil
	}
	
	return result
}

//export ForesterAdd
func ForesterAdd(repoPath *C.char, files *C.char) *C.ForesterResult {
	path := C.GoString(repoPath)
	fileList := C.GoString(files)
	
	// Change to repository directory
	oldDir, _ := os.Getwd()
	if path != "" && path != "." {
		if err := os.Chdir(path); err != nil {
			result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
			result.success = 0
			result.error = C.CString(fmt.Sprintf("failed to change directory: %s", err.Error()))
			return result
		}
		defer os.Chdir(oldDir)
	}
	
	// Parse file list (JSON array or comma-separated)
	var fileArgs []string
	if fileList != "" {
		// Try to parse as JSON array first
		if err := json.Unmarshal([]byte(fileList), &fileArgs); err != nil {
			// If not JSON, treat as comma-separated or single value
			if fileList == "." {
				fileArgs = []string{"."}
			} else {
				// Split by comma
				fileArgs = strings.Split(fileList, ",")
				// Trim spaces
				for i := range fileArgs {
					fileArgs[i] = strings.TrimSpace(fileArgs[i])
				}
			}
		}
	} else {
		fileArgs = []string{"."}
	}
	
	err := commands.Add(fileArgs)
	
	result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
	if err != nil {
		result.success = 0
		result.error = C.CString(err.Error())
	} else {
		result.success = 1
		result.error = nil
	}
	
	return result
}

//export ForesterCreateCommit
func ForesterCreateCommit(repoPath *C.char, message *C.char, author *C.char, amend C.int) *C.ForesterResult {
	path := C.GoString(repoPath)
	msg := C.GoString(message)
	auth := C.GoString(author)
	
	// Change to repository directory
	oldDir, _ := os.Getwd()
	if path != "" && path != "." {
		if err := os.Chdir(path); err != nil {
			result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
			result.success = 0
			result.error = C.CString(fmt.Sprintf("failed to change directory: %s", err.Error()))
			return result
		}
		defer os.Chdir(oldDir)
	}
	
	args := []string{msg}
	if auth != "" {
		args = append(args, "--author", auth)
	}
	if amend != 0 {
		args = append(args, "--amend")
	}
	
	err := commands.Commit(args)
	
	result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
	if err != nil {
		result.success = 0
		result.error = C.CString(err.Error())
	} else {
		result.success = 1
		result.error = nil
	}
	
	return result
}

//export ForesterCreateBranch
func ForesterCreateBranch(repoPath *C.char, branchName *C.char, commitHash *C.char) *C.ForesterResult {
	path := C.GoString(repoPath)
	name := C.GoString(branchName)
	commitHashStr := ""
	if commitHash != nil {
		commitHashStr = C.GoString(commitHash)
	}

	// Change to repository directory
	oldDir, _ := os.Getwd()
	if path != "" && path != "." {
		if err := os.Chdir(path); err != nil {
			result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
			result.success = 0
			result.error = C.CString(fmt.Sprintf("failed to change directory: %s", err.Error()))
			return result
		}
		defer os.Chdir(oldDir)
	}

	repoPathGo, err := utils.FindRepositoryRoot(".")
	if err != nil {
		result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
		result.success = 0
		result.error = C.CString("not a Forester repository")
		return result
	}

	if name == "" {
		result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
		result.success = 0
		result.error = C.CString("branch name is required")
		return result
	}
	if !utils.IsValidBranchName(name) {
		result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
		result.success = 0
		result.error = C.CString("invalid branch name")
		return result
	}

	repo, err := core.OpenRepository(repoPathGo)
	if err != nil {
		result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
		result.success = 0
		result.error = C.CString(fmt.Sprintf("failed to open repository: %s", err.Error()))
		return result
	}
	defer repo.Close()

	branches, err := repo.ListBranches()
	if err != nil {
		result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
		result.success = 0
		result.error = C.CString(fmt.Sprintf("failed to list branches: %s", err.Error()))
		return result
	}
	for _, branch := range branches {
		if branch == name {
			result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
			result.success = 0
			result.error = C.CString(fmt.Sprintf("branch '%s' already exists", name))
			return result
		}
	}

	if commitHashStr != "" {
		if _, err := repo.GetCommit(commitHashStr); err != nil {
			result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
			result.success = 0
			result.error = C.CString(fmt.Sprintf("commit not found: %s", commitHashStr))
			return result
		}
	} else {
		currentBranch, err := repo.Refs.GetCurrentBranch()
		if err != nil || currentBranch == "" {
			currentBranch = "main"
		}

		commitHashStr, err = repo.GetBranchHead(currentBranch)
		if err != nil {
			result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
			result.success = 0
			result.error = C.CString(fmt.Sprintf("failed to get HEAD: %s", err.Error()))
			return result
		}
	}

	if err := repo.CreateBranch(name, commitHashStr); err != nil {
		result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
		result.success = 0
		result.error = C.CString(fmt.Sprintf("failed to create branch: %s", err.Error()))
		return result
	}

	result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
	result.success = 1
	result.error = nil
	return result
}

//export ForesterDeleteBranch
func ForesterDeleteBranch(repoPath *C.char, branchName *C.char) *C.ForesterResult {
	path := C.GoString(repoPath)
	name := C.GoString(branchName)

	// Change to repository directory
	oldDir, _ := os.Getwd()
	if path != "" && path != "." {
		if err := os.Chdir(path); err != nil {
			result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
			result.success = 0
			result.error = C.CString(fmt.Sprintf("failed to change directory: %s", err.Error()))
			return result
		}
		defer os.Chdir(oldDir)
	}

	repoPathGo, err := utils.FindRepositoryRoot(".")
	if err != nil {
		result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
		result.success = 0
		result.error = C.CString("not a Forester repository")
		return result
	}

	if name == "" {
		result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
		result.success = 0
		result.error = C.CString("branch name is required")
		return result
	}
	if !utils.IsValidBranchName(name) {
		result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
		result.success = 0
		result.error = C.CString("invalid branch name")
		return result
	}

	repo, err := core.OpenRepository(repoPathGo)
	if err != nil {
		result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
		result.success = 0
		result.error = C.CString(fmt.Sprintf("failed to open repository: %s", err.Error()))
		return result
	}
	defer repo.Close()

	currentBranch, err := repo.Refs.GetCurrentBranch()
	if err != nil || currentBranch == "" {
		currentBranch = "main"
	}
	if name == currentBranch {
		result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
		result.success = 0
		result.error = C.CString(fmt.Sprintf("cannot delete current branch '%s'. Switch to another branch first", name))
		return result
	}

	if err := repo.DeleteBranch(name); err != nil {
		result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
		result.success = 0
		result.error = C.CString(fmt.Sprintf("failed to delete branch: %s", err.Error()))
		return result
	}

	result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
	result.success = 1
	result.error = nil
	return result
}

//export ForesterRenameBranch
func ForesterRenameBranch(repoPath *C.char, oldName *C.char, newName *C.char) *C.ForesterResult {
	path := C.GoString(repoPath)
	oldBranch := C.GoString(oldName)
	newBranch := C.GoString(newName)

	// Change to repository directory
	oldDir, _ := os.Getwd()
	if path != "" && path != "." {
		if err := os.Chdir(path); err != nil {
			result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
			result.success = 0
			result.error = C.CString(fmt.Sprintf("failed to change directory: %s", err.Error()))
			return result
		}
		defer os.Chdir(oldDir)
	}

	repoPathGo, err := utils.FindRepositoryRoot(".")
	if err != nil {
		result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
		result.success = 0
		result.error = C.CString("not a Forester repository")
		return result
	}

	if oldBranch == "" || newBranch == "" {
		result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
		result.success = 0
		result.error = C.CString("old and new branch names are required")
		return result
	}
	if !utils.IsValidBranchName(oldBranch) || !utils.IsValidBranchName(newBranch) {
		result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
		result.success = 0
		result.error = C.CString("invalid branch name")
		return result
	}

	repo, err := core.OpenRepository(repoPathGo)
	if err != nil {
		result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
		result.success = 0
		result.error = C.CString(fmt.Sprintf("failed to open repository: %s", err.Error()))
		return result
	}
	defer repo.Close()

	branches, err := repo.ListBranches()
	if err != nil {
		result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
		result.success = 0
		result.error = C.CString(fmt.Sprintf("failed to list branches: %s", err.Error()))
		return result
	}

	oldExists := false
	for _, branch := range branches {
		if branch == oldBranch {
			oldExists = true
		}
		if branch == newBranch {
			result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
			result.success = 0
			result.error = C.CString(fmt.Sprintf("branch '%s' already exists", newBranch))
			return result
		}
	}
	if !oldExists {
		result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
		result.success = 0
		result.error = C.CString(fmt.Sprintf("branch '%s' not found", oldBranch))
		return result
	}

	currentBranch, err := repo.Refs.GetCurrentBranch()
	if err != nil || currentBranch == "" {
		currentBranch = "main"
	}

	commitHash, _ := repo.GetBranchHead(oldBranch)

	if err := repo.DeleteBranch(oldBranch); err != nil {
		result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
		result.success = 0
		result.error = C.CString(fmt.Sprintf("failed to delete old branch: %s", err.Error()))
		return result
	}

	if err := repo.CreateBranch(newBranch, commitHash); err != nil {
		result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
		result.success = 0
		result.error = C.CString(fmt.Sprintf("failed to create new branch: %s", err.Error()))
		return result
	}

	if oldBranch == currentBranch {
		if err := repo.Refs.SetCurrentBranch(newBranch); err != nil {
			result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
			result.success = 0
			result.error = C.CString(fmt.Sprintf("failed to update current branch: %s", err.Error()))
			return result
		}
	}

	result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
	result.success = 1
	result.error = nil
	return result
}

//export ForesterRevertCommit
func ForesterRevertCommit(repoPath *C.char, commitHash *C.char) *C.ForesterResult {
	path := C.GoString(repoPath)
	hashStr := C.GoString(commitHash)

	// Change to repository directory
	oldDir, _ := os.Getwd()
	if path != "" && path != "." {
		if err := os.Chdir(path); err != nil {
			result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
			result.success = 0
			result.error = C.CString(fmt.Sprintf("failed to change directory: %s", err.Error()))
			return result
		}
		defer os.Chdir(oldDir)
	}

	if hashStr == "" {
		result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
		result.success = 0
		result.error = C.CString("commit hash required")
		return result
	}

	err := commands.Revert([]string{hashStr})
	result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
	if err != nil {
		result.success = 0
		result.error = C.CString(err.Error())
	} else {
		result.success = 1
		result.error = nil
	}
	return result
}

//export ForesterResetCommit
func ForesterResetCommit(repoPath *C.char, commitHash *C.char, mode *C.char) *C.ForesterResult {
	path := C.GoString(repoPath)
	hashStr := C.GoString(commitHash)
	modeStr := ""
	if mode != nil {
		modeStr = strings.ToLower(C.GoString(mode))
	}

	// Change to repository directory
	oldDir, _ := os.Getwd()
	if path != "" && path != "." {
		if err := os.Chdir(path); err != nil {
			result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
			result.success = 0
			result.error = C.CString(fmt.Sprintf("failed to change directory: %s", err.Error()))
			return result
		}
		defer os.Chdir(oldDir)
	}

	if hashStr == "" {
		result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
		result.success = 0
		result.error = C.CString("commit hash required")
		return result
	}

	args := []string{hashStr}
	if modeStr != "" && modeStr != "mixed" {
		switch modeStr {
		case "soft":
			args = append([]string{"--soft"}, args...)
		case "hard":
			args = append([]string{"--hard"}, args...)
		default:
			result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
			result.success = 0
			result.error = C.CString("invalid reset mode")
			return result
		}
	}

	err := commands.Reset(args)
	result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
	if err != nil {
		result.success = 0
		result.error = C.CString(err.Error())
	} else {
		result.success = 1
		result.error = nil
	}
	return result
}

//export ForesterSwitch
func ForesterSwitch(repoPath *C.char, target *C.char, autoStash C.int) *C.ForesterResult {
	path := C.GoString(repoPath)
	tgt := C.GoString(target)
	
	// Change to repository directory
	oldDir, _ := os.Getwd()
	if path != "" && path != "." {
		if err := os.Chdir(path); err != nil {
			result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
			result.success = 0
			result.error = C.CString(fmt.Sprintf("failed to change directory: %s", err.Error()))
			return result
		}
		defer os.Chdir(oldDir)
	}
	
	args := []string{tgt}
	if autoStash != 0 {
		args = append(args, "-a")
	}
	
	err := commands.Switch(args)
	
	result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
	if err != nil {
		result.success = 0
		result.error = C.CString(err.Error())
	} else {
		result.success = 1
		result.error = nil
	}
	
	return result
}

//export ForesterCompareExtract
func ForesterCompareExtract(repoPath *C.char, commitHash *C.char, cleanup C.int, editorPath *C.char) *C.ForesterPathResult {
	path := C.GoString(repoPath)
	if path == "" {
		path = "."
	}
	hash := C.GoString(commitHash)
	editor := C.GoString(editorPath)

	oldDir, _ := os.Getwd()
	if path != "." {
		if err := os.Chdir(path); err != nil {
			result := (*C.ForesterPathResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterPathResult{}))))
			result.success = 0
			result.error = C.CString(fmt.Sprintf("failed to change directory: %s", err.Error()))
			result.path = nil
			return result
		}
		defer os.Chdir(oldDir)
	}

	args := []string{hash}
	if cleanup != 0 {
		args = append(args, "--cleanup")
	}
	if editor != "" {
		args = append(args, "--editor", editor)
	}

	err := commands.Compare(args)

	result := (*C.ForesterPathResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterPathResult{}))))
	if err != nil {
		result.success = 0
		result.error = C.CString(err.Error())
		result.path = nil
	} else {
		result.success = 1
		result.error = nil
		if cleanup != 0 {
			result.path = nil
		} else {
			tmpReviewPath := filepath.Join(path, ".DFM", "tmp_review")
			result.path = C.CString(tmpReviewPath)
		}
	}

	return result
}

//export ForesterRestoreVersion
func ForesterRestoreVersion(repoPath *C.char, commitHash *C.char) *C.ForesterResult {
	path := C.GoString(repoPath)
	if path == "" {
		path = "."
	}
	hash := C.GoString(commitHash)

	oldDir, _ := os.Getwd()
	if path != "" && path != "." {
		if err := os.Chdir(path); err != nil {
			result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
			result.success = 0
			result.error = C.CString(fmt.Sprintf("failed to change directory: %s", err.Error()))
			return result
		}
		defer os.Chdir(oldDir)
	}

	err := commands.RestoreVersion([]string{hash})

	result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
	if err != nil {
		result.success = 0
		result.error = C.CString(err.Error())
	} else {
		result.success = 1
		result.error = nil
	}
	return result
}

//export ForesterGC
func ForesterGC(repoPath *C.char, dryRun C.int, reflogExpireDays C.int) *C.ForesterGcResult {
	path := C.GoString(repoPath)
	if path == "" {
		path = "."
	}

	oldDir, _ := os.Getwd()
	if path != "." {
		if err := os.Chdir(path); err != nil {
			result := (*C.ForesterGcResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterGcResult{}))))
			result.success = 0
			result.error = C.CString(fmt.Sprintf("failed to change directory: %s", err.Error()))
			return result
		}
		defer os.Chdir(oldDir)
	}

	repoPathGo, err := utils.FindRepositoryRoot(".")
	if err != nil {
		result := (*C.ForesterGcResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterGcResult{}))))
		result.success = 0
		result.error = C.CString("not a Forester repository")
		return result
	}

	repo, err := core.OpenRepository(repoPathGo)
	if err != nil {
		result := (*C.ForesterGcResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterGcResult{}))))
		result.success = 0
		result.error = C.CString(fmt.Sprintf("failed to open repository: %s", err.Error()))
		return result
	}
	defer repo.Close()

	expireDays := int(reflogExpireDays)
	if expireDays <= 0 {
		expireDays = 90
	}
	now := time.Now().Unix()
	expireBefore := now - int64(expireDays*24*60*60)

	storage := repo.Storage

	commitsDeleted := 0
	treesDeleted := 0
	blobsDeleted := 0

	deletedEntries, err := repo.Reflog.GetEntries("", 10000)
	if err != nil {
		result := (*C.ForesterGcResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterGcResult{}))))
		result.success = 0
		result.error = C.CString(fmt.Sprintf("failed to get reflog: %s", err.Error()))
		return result
	}

	expiredDeletedCommits := make(map[string]bool)
	for _, entry := range deletedEntries {
		if entry.Operation == "delete" {
			if entry.Timestamp < expireBefore {
				expiredDeletedCommits[entry.CommitHash] = true
			}
		}
	}

	referencedCommits, err := repo.CollectReferencedCommits()
	if err != nil {
		result := (*C.ForesterGcResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterGcResult{}))))
		result.success = 0
		result.error = C.CString(fmt.Sprintf("failed to collect referenced commits: %s", err.Error()))
		return result
	}

	commitsToDelete := make(map[string]bool)
	for commitHash := range expiredDeletedCommits {
		if referencedCommits[commitHash] {
			continue
		}
		hasChildren, err := repo.HasChildCommits(commitHash)
		if err != nil {
			continue
		}
		if hasChildren {
			allChildrenDeleted, err := checkAllChildrenDeletedAPI(repo, commitHash, expiredDeletedCommits, referencedCommits)
			if err != nil {
				continue
			}
			if allChildrenDeleted {
				commitsToDelete[commitHash] = true
			}
		} else {
			commitsToDelete[commitHash] = true
		}
	}

	for commitHash := range commitsToDelete {
		if dryRun == 0 {
			if _, err := repo.GetCommit(commitHash); err != nil {
				continue
			}
			if err := repo.ForceDeleteCommit(commitHash); err != nil {
				continue
			}
			commitsDeleted++
		} else {
			commitsDeleted++
		}
	}

	usedObjects, err := repo.CollectUsedObjects()
	if err != nil {
		result := (*C.ForesterGcResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterGcResult{}))))
		result.success = 0
		result.error = C.CString(fmt.Sprintf("failed to collect used objects: %s", err.Error()))
		return result
	}

	err = storage.ListObjects(func(hash, objectType string) error {
		if objectType == core.ObjectTypeCommit {
			return nil
		}
		if usedObjects[hash] {
			return nil
		}
		switch objectType {
		case core.ObjectTypeTree:
			treesDeleted++
		case core.ObjectTypeBlob:
			blobsDeleted++
		default:
			return nil
		}
		if dryRun != 0 {
			return nil
		}
		_ = storage.DeleteObject(hash)
		return nil
	})
	if err != nil {
		result := (*C.ForesterGcResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterGcResult{}))))
		result.success = 0
		result.error = C.CString(fmt.Sprintf("failed to delete unused objects: %s", err.Error()))
		return result
	}

	if dryRun == 0 {
		if err := repo.Reflog.Expire(expireBefore); err != nil {
			result := (*C.ForesterGcResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterGcResult{}))))
			result.success = 0
			result.error = C.CString(fmt.Sprintf("failed to expire reflog: %s", err.Error()))
			return result
		}
	}

	result := (*C.ForesterGcResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterGcResult{}))))
	result.success = 1
	result.error = nil
	result.commits_deleted = C.int(commitsDeleted)
	result.trees_deleted = C.int(treesDeleted)
	result.blobs_deleted = C.int(blobsDeleted)
	result.dry_run = C.int(dryRun)
	return result
}

//export ForesterRebuild
func ForesterRebuild(repoPath *C.char) *C.ForesterRebuildResult {
	path := C.GoString(repoPath)
	if path == "" {
		path = "."
	}

	oldDir, _ := os.Getwd()
	if path != "." {
		if err := os.Chdir(path); err != nil {
			result := (*C.ForesterRebuildResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterRebuildResult{}))))
			result.success = 0
			result.error = C.CString(fmt.Sprintf("failed to change directory: %s", err.Error()))
			return result
		}
		defer os.Chdir(oldDir)
	}

	repoPathGo, err := utils.FindRepositoryRoot(".")
	if err != nil {
		result := (*C.ForesterRebuildResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterRebuildResult{}))))
		result.success = 0
		result.error = C.CString("not a Forester repository")
		return result
	}

	repo, err := core.OpenRepository(repoPathGo)
	if err != nil {
		result := (*C.ForesterRebuildResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterRebuildResult{}))))
		result.success = 0
		result.error = C.CString(fmt.Sprintf("failed to open repository: %s", err.Error()))
		return result
	}
	defer repo.Close()

	storage := repo.Storage

	commitsFound := 0
	treesFound := 0
	blobsFound := 0

	err = storage.ListObjects(func(_ string, objectType string) error {
		switch objectType {
		case core.ObjectTypeCommit:
			commitsFound++
		case core.ObjectTypeTree:
			treesFound++
		case core.ObjectTypeBlob:
			blobsFound++
		}
		return nil
	})
	if err != nil {
		result := (*C.ForesterRebuildResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterRebuildResult{}))))
		result.success = 0
		result.error = C.CString(fmt.Sprintf("failed to scan objects: %s", err.Error()))
		return result
	}


	result := (*C.ForesterRebuildResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterRebuildResult{}))))
	result.success = 1
	result.error = nil
	result.commits_found = C.int(commitsFound)
	result.commits_rebuilt = 0
	result.trees_found = C.int(treesFound)
	result.blobs_found = C.int(blobsFound)
	return result
}

//export ForesterListLocks
func ForesterListLocks(repoPath *C.char) *C.ForesterLockList {
	path := C.GoString(repoPath)
	if path == "" {
		path = "."
	}

	oldDir, _ := os.Getwd()
	if path != "." {
		if err := os.Chdir(path); err != nil {
			return nil
		}
		defer os.Chdir(oldDir)
	}

	repoPathGo, err := utils.FindRepositoryRoot(".")
	if err != nil {
		return nil
	}

	locking := core.NewLocking(repoPathGo)
	branch := getCurrentBranch(repoPathGo)
	locks, err := locking.GetLocks(branch)
	if err != nil {
		return nil
	}

	list := (*C.ForesterLockList)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterLockList{}))))
	list.count = C.int(len(locks))
	if len(locks) == 0 {
		list.locks = nil
		return list
	}

	list.locks = (*C.ForesterLock)(C.malloc(C.size_t(len(locks)) * C.size_t(unsafe.Sizeof(C.ForesterLock{}))))
	for i, lock := range locks {
		lockPtr := (*C.ForesterLock)(unsafe.Pointer(uintptr(unsafe.Pointer(list.locks)) + uintptr(i)*unsafe.Sizeof(C.ForesterLock{})))
		lockPtr.file_path = C.CString(lock.FilePath)
		lockPtr.user = C.CString(lock.User)
		lockPtr.branch = C.CString(lock.Branch)
		lockPtr.lock_type = C.int(int(lock.LockType))
		lockPtr.created_at = C.longlong(lock.CreatedAt)
		lockPtr.expires_at = C.longlong(lock.ExpiresAt)
	}

	return list
}

//export ForesterAcquireLock
func ForesterAcquireLock(repoPath *C.char, filePath *C.char, user *C.char, lockType C.int, expireHours C.int) *C.ForesterResult {
	path := C.GoString(repoPath)
	if path == "" {
		path = "."
	}
	file := C.GoString(filePath)
	usr := C.GoString(user)
	if usr == "" {
		if envUser := os.Getenv("USER"); envUser != "" {
			usr = envUser
		} else {
			usr = "Unknown"
		}
	}

	oldDir, _ := os.Getwd()
	if path != "." {
		if err := os.Chdir(path); err != nil {
			result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
			result.success = 0
			result.error = C.CString(fmt.Sprintf("failed to change directory: %s", err.Error()))
			return result
		}
		defer os.Chdir(oldDir)
	}

	repoPathGo, err := utils.FindRepositoryRoot(".")
	if err != nil {
		result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
		result.success = 0
		result.error = C.CString("not a Forester repository")
		return result
	}

	locking := core.NewLocking(repoPathGo)
	branch := getCurrentBranch(repoPathGo)
	lockTypeVal := models.LockTypeExclusive
	if int(lockType) == int(models.LockTypeShared) {
		lockTypeVal = models.LockTypeShared
	}
	lock := models.NewLock(file, usr, branch, lockTypeVal)
	if expireHours > 0 {
		lock.ExpiresAt = lock.CreatedAt + int64(expireHours*3600)
	}

	acquired, err := locking.AcquireLock(lock)
	result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
	if err != nil {
		result.success = 0
		result.error = C.CString(err.Error())
		return result
	}
	if !acquired {
		result.success = 0
		result.error = C.CString("failed to acquire lock. File may be already locked")
		return result
	}

	result.success = 1
	result.error = nil
	return result
}

//export ForesterReleaseLock
func ForesterReleaseLock(repoPath *C.char, filePath *C.char, user *C.char) *C.ForesterResult {
	path := C.GoString(repoPath)
	if path == "" {
		path = "."
	}
	file := C.GoString(filePath)
	usr := C.GoString(user)
	if usr == "" {
		if envUser := os.Getenv("USER"); envUser != "" {
			usr = envUser
		} else {
			usr = "Unknown"
		}
	}

	oldDir, _ := os.Getwd()
	if path != "." {
		if err := os.Chdir(path); err != nil {
			result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
			result.success = 0
			result.error = C.CString(fmt.Sprintf("failed to change directory: %s", err.Error()))
			return result
		}
		defer os.Chdir(oldDir)
	}

	repoPathGo, err := utils.FindRepositoryRoot(".")
	if err != nil {
		result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
		result.success = 0
		result.error = C.CString("not a Forester repository")
		return result
	}

	locking := core.NewLocking(repoPathGo)
	err = locking.ReleaseLock(file, usr)
	result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
	if err != nil {
		result.success = 0
		result.error = C.CString(err.Error())
	} else {
		result.success = 1
		result.error = nil
	}
	return result
}

//export ForesterFreeResult
func ForesterFreeResult(r *C.ForesterResult) {
	if r == nil {
		return
	}
	if r.error != nil {
		C.free(unsafe.Pointer(r.error))
	}
	C.free(unsafe.Pointer(r))
}

//export ForesterFreeGcResult
func ForesterFreeGcResult(r *C.ForesterGcResult) {
	if r == nil {
		return
	}
	if r.error != nil {
		C.free(unsafe.Pointer(r.error))
	}
	C.free(unsafe.Pointer(r))
}

//export ForesterFreeRebuildResult
func ForesterFreeRebuildResult(r *C.ForesterRebuildResult) {
	if r == nil {
		return
	}
	if r.error != nil {
		C.free(unsafe.Pointer(r.error))
	}
	C.free(unsafe.Pointer(r))
}

//export ForesterFreePathResult
func ForesterFreePathResult(r *C.ForesterPathResult) {
	if r == nil {
		return
	}
	if r.error != nil {
		C.free(unsafe.Pointer(r.error))
	}
	if r.path != nil {
		C.free(unsafe.Pointer(r.path))
	}
	C.free(unsafe.Pointer(r))
}

//export ForesterFreeContentResult
func ForesterFreeContentResult(r *C.ForesterContentResult) {
	if r == nil {
		return
	}
	if r.error != nil {
		C.free(unsafe.Pointer(r.error))
	}
	if r.data != nil {
		C.free(unsafe.Pointer(r.data))
	}
	C.free(unsafe.Pointer(r))
}

//export ForesterFreeLockList
func ForesterFreeLockList(list *C.ForesterLockList) {
	if list == nil {
		return
	}
	if list.locks != nil {
		for i := 0; i < int(list.count); i++ {
			lockPtr := (*C.ForesterLock)(unsafe.Pointer(uintptr(unsafe.Pointer(list.locks)) + uintptr(i)*unsafe.Sizeof(C.ForesterLock{})))
			if lockPtr.file_path != nil {
				C.free(unsafe.Pointer(lockPtr.file_path))
			}
			if lockPtr.user != nil {
				C.free(unsafe.Pointer(lockPtr.user))
			}
			if lockPtr.branch != nil {
				C.free(unsafe.Pointer(lockPtr.branch))
			}
		}
		C.free(unsafe.Pointer(list.locks))
	}
	C.free(unsafe.Pointer(list))
}

// Helper function to convert Go Object to C ForesterObject
func objectToC(obj *models.Object) *C.ForesterObject {
	cObj := (*C.ForesterObject)(C.calloc(1, C.size_t(unsafe.Sizeof(C.ForesterObject{}))))
	
	cObj.id = C.longlong(obj.ID)
	cObj.editor_type = C.CString(obj.EditorType)
	cObj.file_path = C.CString(obj.FilePath)
	cObj.object_name = C.CString(obj.ObjectName)
	cObj.object_type = C.CString(obj.ObjectType)
	cObj.commit_hash = C.CString(obj.CommitHash)
	cObj.created_at = C.longlong(obj.CreatedAt)
	cObj.updated_at = C.longlong(obj.UpdatedAt)
	
	// Marshal JSON fields
	if objectDataJSON, err := json.Marshal(obj.ObjectData); err == nil {
		cObj.object_data = C.CString(string(objectDataJSON))
	}
	if tagsJSON, err := json.Marshal(obj.Tags); err == nil {
		cObj.tags = C.CString(string(tagsJSON))
	}
	if metadataJSON, err := json.Marshal(obj.Metadata); err == nil {
		cObj.metadata = C.CString(string(metadataJSON))
	}
	
	return cObj
}

// Helper function to free C ForesterObject fields (no struct free)
func freeForesterObjectFields(cObj *C.ForesterObject) {
	if cObj == nil {
		return
	}
	if cObj.editor_type != nil {
		C.free(unsafe.Pointer(cObj.editor_type))
	}
	if cObj.file_path != nil {
		C.free(unsafe.Pointer(cObj.file_path))
	}
	if cObj.object_name != nil {
		C.free(unsafe.Pointer(cObj.object_name))
	}
	if cObj.object_type != nil {
		C.free(unsafe.Pointer(cObj.object_type))
	}
	if cObj.commit_hash != nil {
		C.free(unsafe.Pointer(cObj.commit_hash))
	}
	if cObj.object_data != nil {
		C.free(unsafe.Pointer(cObj.object_data))
	}
	if cObj.tags != nil {
		C.free(unsafe.Pointer(cObj.tags))
	}
	if cObj.metadata != nil {
		C.free(unsafe.Pointer(cObj.metadata))
	}
}

// Helper function to free C ForesterObject (struct + fields)
func freeForesterObject(cObj *C.ForesterObject) {
	if cObj == nil {
		return
	}
	freeForesterObjectFields(cObj)
	C.free(unsafe.Pointer(cObj))
}

//export ForesterAddObject
func ForesterAddObject(repoPath *C.char, editorType *C.char, filePath *C.char, objectName *C.char, objectType *C.char, commitHash *C.char, objectDataJSON *C.char, tagsJSON *C.char, metadataJSON *C.char) *C.ForesterResult {
	path := C.GoString(repoPath)
	if path == "" {
		path = "."
	}
	
	oldDir, _ := os.Getwd()
	if path != "." {
		if err := os.Chdir(path); err != nil {
			result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
			result.success = 0
			result.error = C.CString(fmt.Sprintf("failed to change directory: %s", err.Error()))
			return result
		}
		defer os.Chdir(oldDir)
	}
	
	repoPathGo, err := utils.FindRepositoryRoot(".")
	if err != nil {
		result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
		result.success = 0
		result.error = C.CString("not a Forester repository")
		return result
	}
	
	repo, err := core.OpenRepository(repoPathGo)
	if err != nil {
		result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
		result.success = 0
		result.error = C.CString(fmt.Sprintf("failed to open repository: %s", err.Error()))
		return result
	}
	defer repo.Close()

	// Parse JSON fields
	var objectData map[string]interface{}
	if objectDataJSON != nil {
		json.Unmarshal([]byte(C.GoString(objectDataJSON)), &objectData)
	}
	
	var tags []string
	if tagsJSON != nil {
		json.Unmarshal([]byte(C.GoString(tagsJSON)), &tags)
	}
	
	var metadata map[string]string
	if metadataJSON != nil {
		json.Unmarshal([]byte(C.GoString(metadataJSON)), &metadata)
	}
	
	obj := models.NewObject(
		C.GoString(editorType),
		C.GoString(filePath),
		C.GoString(objectName),
		C.GoString(objectType),
		C.GoString(commitHash),
	)
	obj.ObjectData = objectData
	obj.Tags = tags
	obj.Metadata = metadata
	
	err = repo.Manifests.AddObject(obj)
	result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
	if err != nil {
		result.success = 0
		result.error = C.CString(err.Error())
	} else {
		result.success = 1
		result.error = nil
	}
	
	return result
}

//export ForesterGetObject
func ForesterGetObject(repoPath *C.char, commitHash *C.char, filePath *C.char, objectName *C.char) *C.ForesterObject {
	path := C.GoString(repoPath)
	if path == "" {
		path = "."
	}
	
	oldDir, _ := os.Getwd()
	if path != "." {
		if err := os.Chdir(path); err != nil {
			return nil
		}
		defer os.Chdir(oldDir)
	}
	
	repoPathGo, err := utils.FindRepositoryRoot(".")
	if err != nil {
		return nil
	}
	
	repo, err := core.OpenRepository(repoPathGo)
	if err != nil {
		return nil
	}
	defer repo.Close()

	obj, err := repo.Manifests.GetObject(C.GoString(commitHash), C.GoString(filePath), C.GoString(objectName))
	if err != nil {
		return nil
	}
	
	return objectToC(obj)
}

//export ForesterDeleteObject
func ForesterDeleteObject(repoPath *C.char, commitHash *C.char, filePath *C.char, objectName *C.char) *C.ForesterResult {
	path := C.GoString(repoPath)
	if path == "" {
		path = "."
	}

	oldDir, _ := os.Getwd()
	if path != "." {
		if err := os.Chdir(path); err != nil {
			result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
			result.success = 0
			result.error = C.CString(fmt.Sprintf("failed to change directory: %s", err.Error()))
			return result
		}
		defer os.Chdir(oldDir)
	}

	repoPathGo, err := utils.FindRepositoryRoot(".")
	if err != nil {
		result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
		result.success = 0
		result.error = C.CString("not a Forester repository")
		return result
	}

	repo, err := core.OpenRepository(repoPathGo)
	if err != nil {
		result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
		result.success = 0
		result.error = C.CString(fmt.Sprintf("failed to open repository: %s", err.Error()))
		return result
	}
	defer repo.Close()

	err = repo.Manifests.DeleteObject(C.GoString(commitHash), C.GoString(filePath), C.GoString(objectName))
	result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
	if err != nil {
		result.success = 0
		result.error = C.CString(err.Error())
	} else {
		result.success = 1
		result.error = nil
	}
	return result
}

//export ForesterDeleteObjectsByFile
func ForesterDeleteObjectsByFile(repoPath *C.char, commitHash *C.char, filePath *C.char) *C.ForesterResult {
	path := C.GoString(repoPath)
	if path == "" {
		path = "."
	}

	oldDir, _ := os.Getwd()
	if path != "." {
		if err := os.Chdir(path); err != nil {
			result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
			result.success = 0
			result.error = C.CString(fmt.Sprintf("failed to change directory: %s", err.Error()))
			return result
		}
		defer os.Chdir(oldDir)
	}

	repoPathGo, err := utils.FindRepositoryRoot(".")
	if err != nil {
		result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
		result.success = 0
		result.error = C.CString("not a Forester repository")
		return result
	}

	repo, err := core.OpenRepository(repoPathGo)
	if err != nil {
		result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
		result.success = 0
		result.error = C.CString(fmt.Sprintf("failed to open repository: %s", err.Error()))
		return result
	}
	defer repo.Close()

	err = repo.Manifests.DeleteObjectsByFile(C.GoString(commitHash), C.GoString(filePath))
	result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
	if err != nil {
		result.success = 0
		result.error = C.CString(err.Error())
	} else {
		result.success = 1
		result.error = nil
	}
	return result
}

//export ForesterFreeObject
func ForesterFreeObject(obj *C.ForesterObject) {
	freeForesterObject(obj)
}

//export ForesterGetObjectsByCommit
func ForesterGetObjectsByCommit(repoPath *C.char, commitHash *C.char) *C.ForesterObjectList {
	path := C.GoString(repoPath)
	if path == "" {
		path = "."
	}
	
	oldDir, _ := os.Getwd()
	if path != "." {
		if err := os.Chdir(path); err != nil {
			return nil
		}
		defer os.Chdir(oldDir)
	}
	
	repoPathGo, err := utils.FindRepositoryRoot(".")
	if err != nil {
		return nil
	}
	
	repo, err := core.OpenRepository(repoPathGo)
	if err != nil {
		return nil
	}
	defer repo.Close()

	objects, err := repo.Manifests.GetObjectsByCommit(C.GoString(commitHash))
	if err != nil {
		return nil
	}
	
	list := (*C.ForesterObjectList)(C.calloc(1, C.size_t(unsafe.Sizeof(C.ForesterObjectList{}))))
	list.count = C.int(len(objects))
	
	if len(objects) > 0 {
		cObjects := (*C.ForesterObject)(C.calloc(C.size_t(len(objects)), C.size_t(unsafe.Sizeof(C.ForesterObject{}))))
		for i, obj := range objects {
			cObj := objectToC(obj)
			objPtr := (*C.ForesterObject)(unsafe.Pointer(uintptr(unsafe.Pointer(cObjects)) + uintptr(i)*unsafe.Sizeof(C.ForesterObject{})))
			// Copy all fields
			objPtr.id = cObj.id
			objPtr.editor_type = cObj.editor_type
			objPtr.file_path = cObj.file_path
			objPtr.object_name = cObj.object_name
			objPtr.object_type = cObj.object_type
			objPtr.commit_hash = cObj.commit_hash
			objPtr.object_data = cObj.object_data
			objPtr.tags = cObj.tags
			objPtr.metadata = cObj.metadata
			objPtr.created_at = cObj.created_at
			objPtr.updated_at = cObj.updated_at
			// Free only the structure, not the strings (they're now in the array)
			C.free(unsafe.Pointer(cObj))
		}
		list.objects = cObjects
	} else {
			list.objects = nil
	}
	
	return list
}

//export ForesterGetObjectsByFile
func ForesterGetObjectsByFile(repoPath *C.char, filePath *C.char, commitHash *C.char) *C.ForesterObjectList {
	path := C.GoString(repoPath)
	if path == "" {
		path = "."
	}
	
	oldDir, _ := os.Getwd()
	if path != "." {
		if err := os.Chdir(path); err != nil {
			return nil
		}
		defer os.Chdir(oldDir)
	}
	
	repoPathGo, err := utils.FindRepositoryRoot(".")
	if err != nil {
		return nil
	}
	
	repo, err := core.OpenRepository(repoPathGo)
	if err != nil {
		return nil
	}
	defer repo.Close()

	objects, err := repo.Manifests.GetObjectsByFile(C.GoString(commitHash), C.GoString(filePath))
	if err != nil {
		return nil
	}
	
	list := (*C.ForesterObjectList)(C.calloc(1, C.size_t(unsafe.Sizeof(C.ForesterObjectList{}))))
	list.count = C.int(len(objects))
	
	if len(objects) > 0 {
		cObjects := (*C.ForesterObject)(C.calloc(C.size_t(len(objects)), C.size_t(unsafe.Sizeof(C.ForesterObject{}))))
		for i, obj := range objects {
			cObj := objectToC(obj)
			objPtr := (*C.ForesterObject)(unsafe.Pointer(uintptr(unsafe.Pointer(cObjects)) + uintptr(i)*unsafe.Sizeof(C.ForesterObject{})))
			objPtr.id = cObj.id
			objPtr.editor_type = cObj.editor_type
			objPtr.file_path = cObj.file_path
			objPtr.object_name = cObj.object_name
			objPtr.object_type = cObj.object_type
			objPtr.commit_hash = cObj.commit_hash
			objPtr.object_data = cObj.object_data
			objPtr.tags = cObj.tags
			objPtr.metadata = cObj.metadata
			objPtr.created_at = cObj.created_at
			objPtr.updated_at = cObj.updated_at
			C.free(unsafe.Pointer(cObj))
		}
		list.objects = cObjects
	} else {
		list.objects = nil
	}
	
	return list
}

//export ForesterFreeObjectList
func ForesterFreeObjectList(list *C.ForesterObjectList) {
	if list == nil {
		return
	}
	
	if list.objects != nil {
		for i := 0; i < int(list.count); i++ {
			objPtr := (*C.ForesterObject)(unsafe.Pointer(uintptr(unsafe.Pointer(list.objects)) + uintptr(i)*unsafe.Sizeof(C.ForesterObject{})))
			freeForesterObjectFields(objPtr)
		}
		C.free(unsafe.Pointer(list.objects))
	}
	
	C.free(unsafe.Pointer(list))
}

//export ForesterAddTagToObject
func ForesterAddTagToObject(repoPath *C.char, commitHash *C.char, filePath *C.char, objectName *C.char, tag *C.char) *C.ForesterResult {
	path := C.GoString(repoPath)
	if path == "" {
		path = "."
	}
	
	oldDir, _ := os.Getwd()
	if path != "." {
		if err := os.Chdir(path); err != nil {
			result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
			result.success = 0
			result.error = C.CString(fmt.Sprintf("failed to change directory: %s", err.Error()))
			return result
		}
		defer os.Chdir(oldDir)
	}
	
	repoPathGo, err := utils.FindRepositoryRoot(".")
	if err != nil {
		result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
		result.success = 0
		result.error = C.CString("not a Forester repository")
		return result
	}
	
	repo, err := core.OpenRepository(repoPathGo)
	if err != nil {
		result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
		result.success = 0
		result.error = C.CString(fmt.Sprintf("failed to open repository: %s", err.Error()))
		return result
	}
	defer repo.Close()

	err = repo.Manifests.AddTagToObject(C.GoString(commitHash), C.GoString(filePath), C.GoString(objectName), C.GoString(tag))
	result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
	if err != nil {
		result.success = 0
		result.error = C.CString(err.Error())
	} else {
		result.success = 1
		result.error = nil
	}
	
	return result
}

//export ForesterRemoveTagFromObject
func ForesterRemoveTagFromObject(repoPath *C.char, commitHash *C.char, filePath *C.char, objectName *C.char, tag *C.char) *C.ForesterResult {
	path := C.GoString(repoPath)
	if path == "" {
		path = "."
	}
	
	oldDir, _ := os.Getwd()
	if path != "." {
		if err := os.Chdir(path); err != nil {
			result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
			result.success = 0
			result.error = C.CString(fmt.Sprintf("failed to change directory: %s", err.Error()))
			return result
		}
		defer os.Chdir(oldDir)
	}
	
	repoPathGo, err := utils.FindRepositoryRoot(".")
	if err != nil {
		result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
		result.success = 0
		result.error = C.CString("not a Forester repository")
		return result
	}
	
	repo, err := core.OpenRepository(repoPathGo)
	if err != nil {
		result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
		result.success = 0
		result.error = C.CString(fmt.Sprintf("failed to open repository: %s", err.Error()))
		return result
	}
	defer repo.Close()

	err = repo.Manifests.RemoveTagFromObject(C.GoString(commitHash), C.GoString(filePath), C.GoString(objectName), C.GoString(tag))
	result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
	if err != nil {
		result.success = 0
		result.error = C.CString(err.Error())
	} else {
		result.success = 1
		result.error = nil
	}
	
	return result
}

//export ForesterSetObjectMetadata
func ForesterSetObjectMetadata(repoPath *C.char, commitHash *C.char, filePath *C.char, objectName *C.char, key *C.char, value *C.char) *C.ForesterResult {
	path := C.GoString(repoPath)
	if path == "" {
		path = "."
	}
	
	oldDir, _ := os.Getwd()
	if path != "." {
		if err := os.Chdir(path); err != nil {
			result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
			result.success = 0
			result.error = C.CString(fmt.Sprintf("failed to change directory: %s", err.Error()))
			return result
		}
		defer os.Chdir(oldDir)
	}
	
	repoPathGo, err := utils.FindRepositoryRoot(".")
	if err != nil {
		result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
		result.success = 0
		result.error = C.CString("not a Forester repository")
		return result
	}
	
	repo, err := core.OpenRepository(repoPathGo)
	if err != nil {
		result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
		result.success = 0
		result.error = C.CString(fmt.Sprintf("failed to open repository: %s", err.Error()))
		return result
	}
	defer repo.Close()

	err = repo.Manifests.SetObjectMetadata(C.GoString(commitHash), C.GoString(filePath), C.GoString(objectName), C.GoString(key), C.GoString(value))
	result := (*C.ForesterResult)(C.malloc(C.size_t(unsafe.Sizeof(C.ForesterResult{}))))
	if err != nil {
		result.success = 0
		result.error = C.CString(err.Error())
	} else {
		result.success = 1
		result.error = nil
	}
	
	return result
}

//export ForesterGetCommitFileContent
func ForesterGetCommitFileContent(repoPath *C.char, commitHash *C.char, filePath *C.char) *C.ForesterContentResult {
	path := C.GoString(repoPath)
	hashStr := C.GoString(commitHash)
	filePathStr := C.GoString(filePath)

	if path == "" {
		path = "."
	}

	oldDir, _ := os.Getwd()
	if path != "." {
		if err := os.Chdir(path); err != nil {
			return contentError("failed to change directory")
		}
		defer os.Chdir(oldDir)
	}

	repoPathGo, err := utils.FindRepositoryRoot(".")
	if err != nil {
		return contentError("not a Forester repository")
	}

	repo, err := core.OpenRepository(repoPathGo)
	if err != nil {
		return contentError(fmt.Sprintf("failed to open repository: %s", err.Error()))
	}
	defer repo.Close()

	storage := repo.Storage

	commit, err := repo.GetCommit(hashStr)
	if err != nil {
		return contentError(fmt.Sprintf("commit not found: %s", err.Error()))
	}

	treeContent, err := storage.GetTreeContent(commit.TreeHash)
	if err != nil {
		return contentError(fmt.Sprintf("failed to get tree content: %s", err.Error()))
	}

	var tree models.Tree
	if err := json.Unmarshal([]byte(treeContent), &tree); err != nil {
		return contentError(fmt.Sprintf("failed to parse tree: %s", err.Error()))
	}

	treeMap := make(map[string]*models.TreeEntry)
	if err := core.BuildTreeMapRecursive(storage, &tree, "", treeMap); err != nil {
		return contentError(fmt.Sprintf("build tree map: %s", err.Error()))
	}

	normalizedPath := filepath.ToSlash(filePathStr)
	entry, found := treeMap[normalizedPath]
	if !found {
		return contentError(fmt.Sprintf("file '%s' not found in commit", normalizedPath))
	}
	if entry.Type != "blob" {
		return contentError(fmt.Sprintf("'%s' is not a file", normalizedPath))
	}

	content, err := storage.GetBlobContent(entry.Hash)
	if err != nil {
		return contentError(fmt.Sprintf("failed to get file content: %s", err.Error()))
	}

	result := (*C.ForesterContentResult)(C.calloc(1, C.size_t(unsafe.Sizeof(C.ForesterContentResult{}))))
	result.success = 1
	result.error = nil
	result.size = C.longlong(len(content))
	if len(content) > 0 {
		result.data = (*C.char)(C.CBytes(content))
	} else {
		result.data = nil
	}

	return result
}

//export ForesterGetCommitFiles
func ForesterGetCommitFiles(repoPath *C.char, commitHash *C.char) *C.ForesterFileList {
	path := C.GoString(repoPath)
	hashStr := C.GoString(commitHash)
	
	if path == "" {
		path = "."
	}
	
	// Change to repository directory
	oldDir, _ := os.Getwd()
	if path != "." {
		if err := os.Chdir(path); err != nil {
			return fileListError(fmt.Sprintf("failed to change directory: %s", err.Error()))
		}
		defer os.Chdir(oldDir)
	}
	
	repoPathGo, err := utils.FindRepositoryRoot(".")
	if err != nil {
		return fileListError("not a Forester repository")
	}
	
	repo, err := core.OpenRepository(repoPathGo)
	if err != nil {
		return fileListError(fmt.Sprintf("failed to open repository: %s", err.Error()))
	}
	defer repo.Close()

	storage := repo.Storage

	// Get commit
	commit, err := repo.GetCommit(hashStr)
	if err != nil {
		return fileListError(fmt.Sprintf("failed to get commit: %s", err.Error()))
	}
	
	// Get tree
	treeContent, err := storage.GetTreeContent(commit.TreeHash)
	if err != nil {
		return fileListError(fmt.Sprintf("failed to get tree content: %s", err.Error()))
	}
	
	var tree models.Tree
	if err := json.Unmarshal([]byte(treeContent), &tree); err != nil {
		return fileListError(fmt.Sprintf("failed to parse tree: %s", err.Error()))
	}
	
	// Build map of files recursively
	treeMap := make(map[string]*models.TreeEntry)
	if err := core.BuildTreeMapRecursive(storage, &tree, "", treeMap); err != nil {
		return fileListError(fmt.Sprintf("build tree map: %s", err.Error()))
	}
	
	// Convert to list (only blobs, i.e., files)
	var files []*models.TreeEntry
	for path, entry := range treeMap {
		if entry.Type == "blob" {
			// Create a copy with the full path
			entryCopy := *entry
			entryCopy.Name = path
			files = append(files, &entryCopy)
		}
	}
	
	// Allocate file list
	list := (*C.ForesterFileList)(C.calloc(1, C.size_t(unsafe.Sizeof(C.ForesterFileList{}))))
	list.count = C.int(len(files))
	
	if len(files) > 0 {
		// Allocate array of file entries
		cFiles := (*C.ForesterFileEntry)(C.calloc(C.size_t(len(files)), C.size_t(unsafe.Sizeof(C.ForesterFileEntry{}))))
		for i, file := range files {
			filePtr := (*C.ForesterFileEntry)(unsafe.Pointer(uintptr(unsafe.Pointer(cFiles)) + uintptr(i)*unsafe.Sizeof(C.ForesterFileEntry{})))
			filePtr.path = C.CString(file.Name)
			filePtr.hash = C.CString(file.Hash)
			filePtr.type_ = C.CString(file.Type)
		}
		list.files = cFiles
	} else {
		list.files = nil
	}
	
	return list
}

//export ForesterFreeFileList
func ForesterFreeFileList(list *C.ForesterFileList) {
	if list == nil {
		return
	}
	
	if list.files != nil {
		for i := 0; i < int(list.count); i++ {
			filePtr := (*C.ForesterFileEntry)(unsafe.Pointer(uintptr(unsafe.Pointer(list.files)) + uintptr(i)*unsafe.Sizeof(C.ForesterFileEntry{})))
			if filePtr.path != nil {
				C.free(unsafe.Pointer(filePtr.path))
			}
			if filePtr.hash != nil {
				C.free(unsafe.Pointer(filePtr.hash))
			}
			if filePtr.type_ != nil {
				C.free(unsafe.Pointer(filePtr.type_))
			}
		}
		C.free(unsafe.Pointer(list.files))
	}
	if list.error != nil {
		C.free(unsafe.Pointer(list.error))
	}
	
	C.free(unsafe.Pointer(list))
}
