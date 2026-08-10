package jsonapi

import (
	"encoding/json"

	"github.com/difference-machine/forester/internal/core"
	"github.com/difference-machine/forester/internal/models"
)

func handleObjectAdd(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		EditorType  string                 `json:"editor_type"`
		FilePath    string                 `json:"file_path"`
		ObjectName  string                 `json:"object_name"`
		ObjectType  string                 `json:"object_type"`
		CommitHash  string                 `json:"commit_hash"`
		ObjectData  map[string]interface{} `json:"object_data"`
		Tags        []string               `json:"tags"`
		Metadata    map[string]string      `json:"metadata"`
	}
	if err := decodeArgs(args, &params); err != nil {
		return nil, err
	}

	_, err := withRepo(workPath, func(repo *core.Repository, _ string) (interface{}, error) {
		obj := models.NewObject(
			params.EditorType,
			params.FilePath,
			params.ObjectName,
			params.ObjectType,
			params.CommitHash,
		)
		if params.ObjectData != nil {
			obj.ObjectData = params.ObjectData
		}
		if params.Tags != nil {
			obj.Tags = params.Tags
		}
		if params.Metadata != nil {
			obj.Metadata = params.Metadata
		}
		if err := repo.Manifests.AddObject(obj); err != nil {
			return nil, err
		}
		return successResult(), nil
	})
	return successResult(), err
}

func handleObjectGet(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		CommitHash string `json:"commit_hash"`
		FilePath   string `json:"file_path"`
		ObjectName string `json:"object_name"`
	}
	if err := decodeArgs(args, &params); err != nil {
		return nil, err
	}

	return withRepo(workPath, func(repo *core.Repository, _ string) (interface{}, error) {
		obj, err := repo.Manifests.GetObject(params.CommitHash, params.FilePath, params.ObjectName)
		if err != nil {
			return nil, err
		}
		return objectToMap(obj), nil
	})
}

func handleObjectListByCommit(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		CommitHash string `json:"commit_hash"`
	}
	if err := decodeArgs(args, &params); err != nil {
		return nil, err
	}

	return withRepo(workPath, func(repo *core.Repository, _ string) (interface{}, error) {
		objects, err := repo.Manifests.GetObjectsByCommit(params.CommitHash)
		if err != nil {
			return nil, err
		}
		return map[string]interface{}{"objects": objectsToMaps(objects)}, nil
	})
}

func handleObjectListByFile(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		CommitHash string `json:"commit_hash"`
		FilePath   string `json:"file_path"`
	}
	if err := decodeArgs(args, &params); err != nil {
		return nil, err
	}

	return withRepo(workPath, func(repo *core.Repository, _ string) (interface{}, error) {
		objects, err := repo.Manifests.GetObjectsByFile(params.CommitHash, params.FilePath)
		if err != nil {
			return nil, err
		}
		return map[string]interface{}{"objects": objectsToMaps(objects)}, nil
	})
}

func handleObjectDelete(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		CommitHash string `json:"commit_hash"`
		FilePath   string `json:"file_path"`
		ObjectName string `json:"object_name"`
	}
	if err := decodeArgs(args, &params); err != nil {
		return nil, err
	}

	_, err := withRepo(workPath, func(repo *core.Repository, _ string) (interface{}, error) {
		if err := repo.Manifests.DeleteObject(params.CommitHash, params.FilePath, params.ObjectName); err != nil {
			return nil, err
		}
		return successResult(), nil
	})
	return successResult(), err
}

func handleObjectDeleteByFile(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		CommitHash string `json:"commit_hash"`
		FilePath   string `json:"file_path"`
	}
	if err := decodeArgs(args, &params); err != nil {
		return nil, err
	}

	_, err := withRepo(workPath, func(repo *core.Repository, _ string) (interface{}, error) {
		if err := repo.Manifests.DeleteObjectsByFile(params.CommitHash, params.FilePath); err != nil {
			return nil, err
		}
		return successResult(), nil
	})
	return successResult(), err
}

func handleObjectTagAdd(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		CommitHash string `json:"commit_hash"`
		FilePath   string `json:"file_path"`
		ObjectName string `json:"object_name"`
		Tag        string `json:"tag"`
	}
	if err := decodeArgs(args, &params); err != nil {
		return nil, err
	}

	_, err := withRepo(workPath, func(repo *core.Repository, _ string) (interface{}, error) {
		if err := repo.Manifests.AddTagToObject(params.CommitHash, params.FilePath, params.ObjectName, params.Tag); err != nil {
			return nil, err
		}
		return successResult(), nil
	})
	return successResult(), err
}

func handleObjectTagRemove(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		CommitHash string `json:"commit_hash"`
		FilePath   string `json:"file_path"`
		ObjectName string `json:"object_name"`
		Tag        string `json:"tag"`
	}
	if err := decodeArgs(args, &params); err != nil {
		return nil, err
	}

	_, err := withRepo(workPath, func(repo *core.Repository, _ string) (interface{}, error) {
		if err := repo.Manifests.RemoveTagFromObject(params.CommitHash, params.FilePath, params.ObjectName, params.Tag); err != nil {
			return nil, err
		}
		return successResult(), nil
	})
	return successResult(), err
}

func handleObjectMetadataSet(workPath string, args json.RawMessage) (interface{}, error) {
	var params struct {
		CommitHash string `json:"commit_hash"`
		FilePath   string `json:"file_path"`
		ObjectName string `json:"object_name"`
		Key        string `json:"key"`
		Value      string `json:"value"`
	}
	if err := decodeArgs(args, &params); err != nil {
		return nil, err
	}

	_, err := withRepo(workPath, func(repo *core.Repository, _ string) (interface{}, error) {
		if err := repo.Manifests.SetObjectMetadata(params.CommitHash, params.FilePath, params.ObjectName, params.Key, params.Value); err != nil {
			return nil, err
		}
		return successResult(), nil
	})
	return successResult(), err
}

func objectToMap(obj *models.Object) map[string]interface{} {
	return map[string]interface{}{
		"id":           obj.ID,
		"editor_type":  obj.EditorType,
		"file_path":    obj.FilePath,
		"object_name":  obj.ObjectName,
		"object_type":  obj.ObjectType,
		"commit_hash":  obj.CommitHash,
		"object_data":  obj.ObjectData,
		"tags":         obj.Tags,
		"metadata":     obj.Metadata,
		"created_at":   obj.CreatedAt,
		"updated_at":   obj.UpdatedAt,
	}
}

func objectsToMaps(objects []*models.Object) []map[string]interface{} {
	out := make([]map[string]interface{}, 0, len(objects))
	for _, obj := range objects {
		out = append(out, objectToMap(obj))
	}
	return out
}
