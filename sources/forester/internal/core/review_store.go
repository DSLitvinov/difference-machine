package core

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/difference-machine/forester/internal/models"
	"github.com/difference-machine/forester/internal/utils"
)

// ReviewStore stores comments and approvals as JSON files under .DFM/reviews/.
type ReviewStore struct {
	repoPath  string
	reviewDir string
}

// NewReviewStore creates a review store.
func NewReviewStore(repoPath string) *ReviewStore {
	return &ReviewStore{
		repoPath:  repoPath,
		reviewDir: filepath.Join(repoPath, ".DFM", "reviews"),
	}
}

func reviewAssetKey(assetType, assetID string) string {
	return EncodeStoragePath(assetType + "\x00" + assetID)
}

func (r *ReviewStore) commentsPath(assetType, assetID string) string {
	return filepath.Join(r.reviewDir, "comments", reviewAssetKey(assetType, assetID)+".json")
}

func (r *ReviewStore) approvalsPath(assetType, assetID string) string {
	return filepath.Join(r.reviewDir, "approvals", reviewAssetKey(assetType, assetID)+".json")
}

func (r *ReviewStore) nextCommentID() (int, error) {
	seqPath := filepath.Join(r.reviewDir, ".comment_seq")
	next := 1
	if utils.Exists(seqPath) {
		data, err := os.ReadFile(seqPath)
		if err != nil {
			return 0, err
		}
		if parsed, err := strconv.Atoi(strings.TrimSpace(string(data))); err == nil && parsed > 0 {
			next = parsed
		}
	}
	if err := utils.EnsureDirectory(r.reviewDir); err != nil {
		return 0, err
	}
	if err := utils.WriteFileAtomic(seqPath, []byte(strconv.Itoa(next+1))); err != nil {
		return 0, err
	}
	return next, nil
}

// CreateComment adds a comment to an asset.
func (r *ReviewStore) CreateComment(comment *models.Comment) (int, error) {
	path := r.commentsPath(comment.AssetType, comment.AssetID)
	var comments []models.Comment
	if utils.Exists(path) {
		data, err := os.ReadFile(path)
		if err != nil {
			return 0, err
		}
		if err := json.Unmarshal(data, &comments); err != nil {
			return 0, err
		}
	}
	id, err := r.nextCommentID()
	if err != nil {
		return 0, err
	}
	comment.ID = id
	if comment.CreatedAt == 0 {
		comment.CreatedAt = time.Now().Unix()
	}
	comments = append(comments, *comment)
	if err := utils.EnsureDirectory(filepath.Dir(path)); err != nil {
		return 0, err
	}
	if err := utils.WriteJSONFileAtomic(path, comments); err != nil {
		return 0, err
	}
	return comment.ID, nil
}

// GetComments returns comments for an asset.
func (r *ReviewStore) GetComments(assetType, assetID string) ([]*models.Comment, error) {
	path := r.commentsPath(assetType, assetID)
	if !utils.Exists(path) {
		return []*models.Comment{}, nil
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var comments []models.Comment
	if err := json.Unmarshal(data, &comments); err != nil {
		return nil, err
	}
	result := make([]*models.Comment, 0, len(comments))
	for i := range comments {
		c := comments[i]
		result = append(result, &c)
	}
	return result, nil
}

// ResolveComment marks a comment as resolved by globally unique ID.
func (r *ReviewStore) ResolveComment(commentID int) error {
	dir := filepath.Join(r.reviewDir, "comments")
	if !utils.Exists(dir) {
		return &ErrCommentNotFound{ID: commentID}
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return err
	}
	var matchedPath string
	var matchedComments []models.Comment
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".json") {
			continue
		}
		path := filepath.Join(dir, entry.Name())
		data, err := os.ReadFile(path)
		if err != nil {
			continue
		}
		var comments []models.Comment
		if err := json.Unmarshal(data, &comments); err != nil {
			continue
		}
		for i := range comments {
			if comments[i].ID == commentID {
				if matchedPath != "" {
					return fmt.Errorf("comment id %d is ambiguous across assets", commentID)
				}
				comments[i].Resolved = true
				matchedPath = path
				matchedComments = comments
			}
		}
	}
	if matchedPath == "" {
		return &ErrCommentNotFound{ID: commentID}
	}
	return utils.WriteJSONFileAtomic(matchedPath, matchedComments)
}

// CreateApproval creates or updates an approval.
func (r *ReviewStore) CreateApproval(approval *models.Approval) error {
	path := r.approvalsPath(approval.AssetType, approval.AssetID)
	var approvals []models.Approval
	if utils.Exists(path) {
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		if err := json.Unmarshal(data, &approvals); err != nil {
			return err
		}
	}
	if approval.CreatedAt == 0 {
		approval.CreatedAt = time.Now().Unix()
	}
	replaced := false
	for i := range approvals {
		if approvals[i].Author == approval.Author {
			approval.ID = approvals[i].ID
			approvals[i] = *approval
			replaced = true
			break
		}
	}
	if !replaced {
		approval.ID = len(approvals) + 1
		approvals = append(approvals, *approval)
	}
	if err := utils.EnsureDirectory(filepath.Dir(path)); err != nil {
		return err
	}
	return utils.WriteJSONFileAtomic(path, approvals)
}

// GetApprovals returns approvals for an asset.
func (r *ReviewStore) GetApprovals(assetType, assetID string) ([]*models.Approval, error) {
	path := r.approvalsPath(assetType, assetID)
	if !utils.Exists(path) {
		return []*models.Approval{}, nil
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var approvals []models.Approval
	if err := json.Unmarshal(data, &approvals); err != nil {
		return nil, err
	}
	result := make([]*models.Approval, 0, len(approvals))
	for i := range approvals {
		a := approvals[i]
		result = append(result, &a)
	}
	return result, nil
}
