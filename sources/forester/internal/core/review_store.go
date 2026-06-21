package core

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
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
	return strings.ReplaceAll(assetType, "/", "_") + "__" + strings.ReplaceAll(assetID, "/", "_")
}

func (r *ReviewStore) commentsPath(assetType, assetID string) string {
	return filepath.Join(r.reviewDir, "comments", reviewAssetKey(assetType, assetID)+".json")
}

func (r *ReviewStore) approvalsPath(assetType, assetID string) string {
	return filepath.Join(r.reviewDir, "approvals", reviewAssetKey(assetType, assetID)+".json")
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
	comment.ID = len(comments) + 1
	if comment.CreatedAt == 0 {
		comment.CreatedAt = time.Now().Unix()
	}
	comments = append(comments, *comment)
	if err := utils.EnsureDirectory(filepath.Dir(path)); err != nil {
		return 0, err
	}
	data, err := json.MarshalIndent(comments, "", "  ")
	if err != nil {
		return 0, err
	}
	if err := utils.WriteFile(path, data); err != nil {
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

// ResolveComment marks a comment as resolved.
func (r *ReviewStore) ResolveComment(commentID int) error {
	dir := filepath.Join(r.reviewDir, "comments")
	if !utils.Exists(dir) {
		return fmt.Errorf("comment not found: %d", commentID)
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return err
	}
	for _, entry := range entries {
		path := filepath.Join(dir, entry.Name())
		data, err := os.ReadFile(path)
		if err != nil {
			continue
		}
		var comments []models.Comment
		if err := json.Unmarshal(data, &comments); err != nil {
			continue
		}
		changed := false
		for i := range comments {
			if comments[i].ID == commentID {
				comments[i].Resolved = true
				changed = true
				break
			}
		}
		if changed {
			out, err := json.MarshalIndent(comments, "", "  ")
			if err != nil {
				return err
			}
			return utils.WriteFile(path, out)
		}
	}
	return fmt.Errorf("comment not found: %d", commentID)
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
	data, err := json.MarshalIndent(approvals, "", "  ")
	if err != nil {
		return err
	}
	return utils.WriteFile(path, data)
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
