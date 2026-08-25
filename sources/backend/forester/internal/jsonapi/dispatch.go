package jsonapi

import (
	"encoding/json"
	"fmt"
	"strings"
)

type handlerFunc func(workPath string, args json.RawMessage) (interface{}, error)

var handlers = map[string]handlerFunc{
	"repo.init":                handleRepoInit,
	"status.get":               handleStatusGet,
	"index.add":                handleIndexAdd,
	"commit.create":            handleCommitCreate,
	"log.get":                  handleLogGet,
	"stash.list":               handleStashList,
	"stash.apply":              handleStashApply,
	"stash.drop":               handleStashDrop,
	"branch.list":              handleBranchList,
	"branch.create":            handleBranchCreate,
	"branch.delete":            handleBranchDelete,
	"branch.rename":            handleBranchRename,
	"repo.switch":              handleRepoSwitch,
	"compare.extract":          handleCompareExtract,
	"restore.version":          handleRestoreVersion,
	"restore.file":             handleRestoreFile,
	"gc.run":                   handleGCRun,
	"repo.rebuild":             handleRepoRebuild,
	"lock.list":                handleLockList,
	"lock.acquire":             handleLockAcquire,
	"lock.release":             handleLockRelease,
	"object.add":               handleObjectAdd,
	"object.get":               handleObjectGet,
	"object.list_by_commit":    handleObjectListByCommit,
	"object.list_by_file":      handleObjectListByFile,
	"objects.by_file":          handleObjectListByFile,
	"merge.status":             handleMergeStatus,
	"merge.start":              handleMergeStart,
	"merge.continue":           handleMergeContinue,
	"merge.abort":              handleMergeAbort,
	"object.delete":            handleObjectDelete,
	"object.delete_by_file":    handleObjectDeleteByFile,
	"object.tag.add":           handleObjectTagAdd,
	"object.tag.remove":        handleObjectTagRemove,
	"object.metadata.set":      handleObjectMetadataSet,
	"commit.get":               handleCommitGet,
	"commit.revert":            handleCommitRevert,
	"commit.reset":             handleCommitReset,
	"workdir.tree":             handleWorkdirTree,
	"workdir.entries":          handleWorkdirEntries,
	"workdir.entries_by_paths": handleWorkdirEntriesByPaths,
	"workdir.metadata":         handleWorkdirMetadata,
	"workdir.thumbnail":        handleWorkdirThumbnail,
	"workdir.file":             handleWorkdirFile,
	"workdir.open":             handleWorkdirOpen,
	"workdir.rename":           handleWorkdirRename,
	"workdir.delete":           handleWorkdirDelete,
	"workdir.search":           handleWorkdirSearch,
	"diff.name_status":         handleDiffNameStatus,
	"diff.stat":                handleDiffStat,
	"diff.text":                handleDiffText,
	"blob.get":                 handleBlobGet,
}

// Call dispatches a JSON API method for the given session handle.
func Call(h Handle, method string, argsJSON string) []byte {
	sess, ok := lookup(h)
	if !ok {
		return marshalErr("invalid session handle")
	}
	return callWorkPath(sess.workPath, method, argsJSON)
}

// CallStateless dispatches a method using repo_path from args or workPath.
func CallStateless(workPath, method, argsJSON string) []byte {
	return callWorkPath(workPath, method, argsJSON)
}

func callWorkPath(workPath, method, argsJSON string) (out []byte) {
	defer func() {
		if rec := recover(); rec != nil {
			out = marshalErr(fmt.Sprintf("internal error: %v", rec))
		}
	}()

	method = strings.TrimSpace(method)
	fn, ok := handlers[method]
	if !ok {
		return marshalErr(fmt.Sprintf("unknown method: %s", method))
	}

	var args json.RawMessage
	if strings.TrimSpace(argsJSON) == "" {
		args = json.RawMessage("{}")
	} else if err := json.Unmarshal([]byte(argsJSON), &args); err != nil {
		return marshalErr(fmt.Sprintf("invalid args JSON: %s", err))
	}

	result, err := withSilencedCLIOutput(func() (interface{}, error) {
		return fn(workPath, args)
	})
	if err != nil {
		return marshalErr(err.Error())
	}
	return marshalOK(result)
}

func decodeArgs(args json.RawMessage, dest interface{}) error {
	if len(args) == 0 {
		args = json.RawMessage("{}")
	}
	return json.Unmarshal(args, dest)
}

func successResult() map[string]bool {
	return map[string]bool{"success": true}
}
