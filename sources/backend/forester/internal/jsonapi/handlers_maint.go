package jsonapi

import (
	"encoding/json"
	"time"

	"github.com/difference-machine/forester/internal/core"
)

type gcParams struct {
	DryRun           bool `json:"dry_run"`
	ReflogExpireDays int  `json:"reflog_expire_days"`
}

type gcResult struct {
	CommitsDeleted int  `json:"commits_deleted"`
	TreesDeleted   int  `json:"trees_deleted"`
	BlobsDeleted   int  `json:"blobs_deleted"`
	DryRun         bool `json:"dry_run"`
}

func handleGCRun(workPath string, args json.RawMessage) (interface{}, error) {
	var params gcParams
	_ = decodeArgs(args, &params)
	if params.ReflogExpireDays <= 0 {
		params.ReflogExpireDays = 90
	}

	return withRepo(workPath, func(repo *core.Repository, _ string) (interface{}, error) {
		result, err := runGC(repo, params.DryRun, params.ReflogExpireDays)
		if err != nil {
			return nil, err
		}
		return result, nil
	})
}

func runGC(repo *core.Repository, dryRun bool, reflogExpireDays int) (*gcResult, error) {
	now := time.Now().Unix()
	expireBefore := now - int64(reflogExpireDays*24*60*60)
	storage := repo.Storage

	commitsDeleted := 0
	treesDeleted := 0
	blobsDeleted := 0

	deletedEntries, err := repo.Reflog.GetEntries("", 10000)
	if err != nil {
		return nil, err
	}

	expiredDeletedCommits := make(map[string]bool)
	for _, entry := range deletedEntries {
		if entry.Operation == "delete" && entry.Timestamp < expireBefore {
			expiredDeletedCommits[entry.CommitHash] = true
		}
	}

	referencedCommits, err := repo.CollectReferencedCommits()
	if err != nil {
		return nil, err
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
			allDeleted, err := allChildrenDeleted(repo, commitHash, expiredDeletedCommits, referencedCommits)
			if err != nil || !allDeleted {
				continue
			}
			commitsToDelete[commitHash] = true
		} else {
			commitsToDelete[commitHash] = true
		}
	}

	for commitHash := range commitsToDelete {
		if dryRun {
			commitsDeleted++
			continue
		}
		if _, err := repo.GetCommit(commitHash); err != nil {
			continue
		}
		if err := repo.ForceDeleteCommit(commitHash); err != nil {
			continue
		}
		commitsDeleted++
	}

	usedObjects, err := repo.CollectUsedObjects()
	if err != nil {
		return nil, err
	}

	err = storage.ListObjects(func(hash, objectType string) error {
		if objectType == core.ObjectTypeCommit || usedObjects[hash] {
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
		if !dryRun {
			_ = storage.DeleteObject(hash)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	if !dryRun {
		if err := repo.Reflog.Expire(expireBefore); err != nil {
			return nil, err
		}
	}

	return &gcResult{
		CommitsDeleted: commitsDeleted,
		TreesDeleted:   treesDeleted,
		BlobsDeleted:   blobsDeleted,
		DryRun:         dryRun,
	}, nil
}

func allChildrenDeleted(repo *core.Repository, commitHash string, expiredDeletedCommits, referencedCommits map[string]bool) (bool, error) {
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
		ok, err := allChildrenDeleted(repo, childHash, expiredDeletedCommits, referencedCommits)
		if err != nil || !ok {
			return false, err
		}
	}
	return true, nil
}

func handleRepoRebuild(workPath string, _ json.RawMessage) (interface{}, error) {
	return withRepo(workPath, func(repo *core.Repository, _ string) (interface{}, error) {
		storage := repo.Storage
		commitsFound := 0
		treesFound := 0
		blobsFound := 0

		err := storage.ListObjects(func(_ string, objectType string) error {
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
			return nil, err
		}

		return map[string]interface{}{
			"commits_found":   commitsFound,
			"commits_rebuilt": 0,
			"trees_found":     treesFound,
			"blobs_found":     blobsFound,
		}, nil
	})
}
