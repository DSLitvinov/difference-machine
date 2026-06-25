package jsonapi_test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/difference-machine/forester/internal/jsonapi"
)

type apiResponse struct {
	OK     bool            `json:"ok"`
	Error  string          `json:"error"`
	Result json.RawMessage `json:"result"`
}

func openRepo(t *testing.T, dir string) jsonapi.Handle {
	t.Helper()
	h := jsonapi.Open(dir)
	t.Cleanup(func() { jsonapi.Close(h) })
	return h
}

func call(t *testing.T, h jsonapi.Handle, method, args string) apiResponse {
	t.Helper()
	var resp apiResponse
	if err := json.Unmarshal(jsonapi.Call(h, method, args), &resp); err != nil {
		t.Fatalf("decode %s response: %v", method, err)
	}
	return resp
}

func mustOK(t *testing.T, h jsonapi.Handle, method, args string) json.RawMessage {
	t.Helper()
	resp := call(t, h, method, args)
	if !resp.OK {
		t.Fatalf("%s failed: %s", method, resp.Error)
	}
	return resp.Result
}

func mustFail(t *testing.T, h jsonapi.Handle, method, args string) {
	t.Helper()
	resp := call(t, h, method, args)
	if resp.OK {
		t.Fatalf("%s expected error, got ok", method)
	}
	if resp.Error == "" {
		t.Fatalf("%s expected error message", method)
	}
}

func initTestRepo(t *testing.T) (string, jsonapi.Handle) {
	t.Helper()
	dir := t.TempDir()
	h := openRepo(t, dir)
	mustOK(t, h, "repo.init", "{}")
	return dir, h
}

func writeFile(t *testing.T, dir, relPath, content string) {
	t.Helper()
	full := filepath.Join(dir, relPath)
	if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	if err := os.WriteFile(full, []byte(content), 0o644); err != nil {
		t.Fatalf("write file: %v", err)
	}
}

func TestInvalidHandle(t *testing.T) {
	resp := call(t, jsonapi.Handle(0), "status.get", "{}")
	if resp.OK {
		t.Fatal("expected error for invalid handle")
	}
}

func TestInvalidArgsJSON(t *testing.T) {
	h := openRepo(t, t.TempDir())
	resp := call(t, h, "status.get", "{not-json")
	if resp.OK {
		t.Fatal("expected error for invalid args JSON")
	}
}

func TestCommitCreateRequiresMessage(t *testing.T) {
	_, h := initTestRepo(t)
	mustFail(t, h, "commit.create", "{}")
}

func TestWorkflowAddCommitLog(t *testing.T) {
	dir, h := initTestRepo(t)
	writeFile(t, dir, "hello.txt", "version 1")

	mustOK(t, h, "index.add", `{"files":["hello.txt"]}`)
	mustOK(t, h, "commit.create", `{"message":"initial commit","author":"tester"}`)

	var logResult struct {
		Commits []struct {
			Hash    string `json:"hash"`
			Message string `json:"message"`
			Author  string `json:"author"`
		} `json:"commits"`
	}
	if err := json.Unmarshal(mustOK(t, h, "log.get", `{"max_count":10}`), &logResult); err != nil {
		t.Fatalf("decode log: %v", err)
	}
	if len(logResult.Commits) != 1 {
		t.Fatalf("commits = %d, want 1", len(logResult.Commits))
	}
	if logResult.Commits[0].Message != "initial commit" {
		t.Fatalf("message = %q", logResult.Commits[0].Message)
	}
	if logResult.Commits[0].Author != "tester" {
		t.Fatalf("author = %q", logResult.Commits[0].Author)
	}
	if len(logResult.Commits[0].Hash) != 64 {
		t.Fatalf("hash length = %d", len(logResult.Commits[0].Hash))
	}

	var commit struct {
		Hash    string `json:"hash"`
		Message string `json:"message"`
	}
	if err := json.Unmarshal(
		mustOK(t, h, "commit.get", `{"hash":"`+logResult.Commits[0].Hash+`"}`),
		&commit,
	); err != nil {
		t.Fatalf("decode commit.get: %v", err)
	}
	if commit.Message != "initial commit" {
		t.Fatalf("commit.get message = %q", commit.Message)
	}
}

func TestBranchOperations(t *testing.T) {
	dir, h := initTestRepo(t)
	writeFile(t, dir, "file.txt", "data")
	mustOK(t, h, "index.add", `{"files":["file.txt"]}`)
	mustOK(t, h, "commit.create", `{"message":"base"}`)

	var logResult struct {
		Commits []struct {
			Hash string `json:"hash"`
		} `json:"commits"`
	}
	if err := json.Unmarshal(mustOK(t, h, "log.get", `{}`), &logResult); err != nil {
		t.Fatalf("decode log: %v", err)
	}
	head := logResult.Commits[0].Hash

	mustOK(t, h, "branch.create", `{"name":"feature","commit_hash":"`+head+`"}`)

	var branches struct {
		Branches []struct {
			Name      string `json:"name"`
			IsCurrent bool   `json:"is_current"`
		} `json:"branches"`
	}
	if err := json.Unmarshal(mustOK(t, h, "branch.list", `{}`), &branches); err != nil {
		t.Fatalf("decode branches: %v", err)
	}
	if len(branches.Branches) != 2 {
		t.Fatalf("branches = %d, want 2", len(branches.Branches))
	}

	mustOK(t, h, "repo.switch", `{"target":"feature","auto_stash":true}`)
	statusRaw := mustOK(t, h, "status.get", `{}`)
	var status struct {
		CurrentBranch string `json:"current_branch"`
	}
	if err := json.Unmarshal(statusRaw, &status); err != nil {
		t.Fatalf("decode status: %v", err)
	}
	if status.CurrentBranch != "feature" {
		t.Fatalf("branch = %q, want feature", status.CurrentBranch)
	}

	mustOK(t, h, "repo.switch", `{"target":"main"}`)
	mustOK(t, h, "branch.rename", `{"old_name":"feature","new_name":"feature-renamed"}`)
	mustOK(t, h, "branch.delete", `{"name":"feature-renamed"}`)
}

func TestObjectOperations(t *testing.T) {
	dir, h := initTestRepo(t)
	writeFile(t, dir, "scene.blend", "blend-data")
	mustOK(t, h, "index.add", `{"files":["scene.blend"]}`)
	mustOK(t, h, "commit.create", `{"message":"with scene"}`)

	var logResult struct {
		Commits []struct {
			Hash string `json:"hash"`
		} `json:"commits"`
	}
	if err := json.Unmarshal(mustOK(t, h, "log.get", `{}`), &logResult); err != nil {
		t.Fatalf("decode log: %v", err)
	}
	commitHash := logResult.Commits[0].Hash

	mustOK(t, h, "object.add", `{
		"editor_type":"blender",
		"file_path":"scene.blend",
		"object_name":"Cube",
		"object_type":"MESH",
		"commit_hash":"`+commitHash+`",
		"object_data":{"v_count":8},
		"tags":["hero"],
		"metadata":{"layer":"1"}
	}`)

	var obj map[string]interface{}
	if err := json.Unmarshal(
		mustOK(t, h, "object.get", `{
			"commit_hash":"`+commitHash+`",
			"file_path":"scene.blend",
			"object_name":"Cube"
		}`),
		&obj,
	); err != nil {
		t.Fatalf("decode object: %v", err)
	}
	if obj["object_name"] != "Cube" {
		t.Fatalf("object_name = %v", obj["object_name"])
	}

	var byCommit struct {
		Objects []map[string]interface{} `json:"objects"`
	}
	if err := json.Unmarshal(
		mustOK(t, h, "object.list_by_commit", `{"commit_hash":"`+commitHash+`"}`),
		&byCommit,
	); err != nil {
		t.Fatalf("decode list_by_commit: %v", err)
	}
	if len(byCommit.Objects) != 1 {
		t.Fatalf("objects = %d, want 1", len(byCommit.Objects))
	}

	mustOK(t, h, "object.tag.add", `{
		"commit_hash":"`+commitHash+`",
		"file_path":"scene.blend",
		"object_name":"Cube",
		"tag":"marked"
	}`)
	mustOK(t, h, "object.metadata.set", `{
		"commit_hash":"`+commitHash+`",
		"file_path":"scene.blend",
		"object_name":"Cube",
		"key":"note",
		"value":"test"
	}`)
	mustOK(t, h, "object.tag.remove", `{
		"commit_hash":"`+commitHash+`",
		"file_path":"scene.blend",
		"object_name":"Cube",
		"tag":"marked"
	}`)
	mustOK(t, h, "object.delete", `{
		"commit_hash":"`+commitHash+`",
		"file_path":"scene.blend",
		"object_name":"Cube"
	}`)
	mustFail(t, h, "object.get", `{
		"commit_hash":"`+commitHash+`",
		"file_path":"scene.blend",
		"object_name":"Cube"
	}`)
}

func TestLockOperations(t *testing.T) {
	dir, h := initTestRepo(t)
	writeFile(t, dir, "asset.txt", "locked")

	var locks struct {
		Locks []map[string]interface{} `json:"locks"`
	}
	if err := json.Unmarshal(mustOK(t, h, "lock.list", `{}`), &locks); err != nil {
		t.Fatalf("decode locks: %v", err)
	}
	if len(locks.Locks) != 0 {
		t.Fatalf("initial locks = %d", len(locks.Locks))
	}

	mustOK(t, h, "lock.acquire", `{
		"file_path":"asset.txt",
		"user":"alice",
		"lock_type":0,
		"expire_hours":1
	}`)
	if err := json.Unmarshal(mustOK(t, h, "lock.list", `{}`), &locks); err != nil {
		t.Fatalf("decode locks: %v", err)
	}
	if len(locks.Locks) != 1 {
		t.Fatalf("locks after acquire = %d", len(locks.Locks))
	}

	mustOK(t, h, "lock.release", `{"file_path":"asset.txt","user":"alice"}`)
	if err := json.Unmarshal(mustOK(t, h, "lock.list", `{}`), &locks); err != nil {
		t.Fatalf("decode locks: %v", err)
	}
	if len(locks.Locks) != 0 {
		t.Fatalf("locks after release = %d", len(locks.Locks))
	}
}

func TestGCAndRebuild(t *testing.T) {
	dir, h := initTestRepo(t)
	writeFile(t, dir, "data.bin", "payload")
	mustOK(t, h, "index.add", `{"files":["data.bin"]}`)
	mustOK(t, h, "commit.create", `{"message":"gc test"}`)

	var gcResult struct {
		CommitsDeleted int  `json:"commits_deleted"`
		DryRun         bool `json:"dry_run"`
	}
	if err := json.Unmarshal(mustOK(t, h, "gc.run", `{"dry_run":true,"reflog_expire_days":90}`), &gcResult); err != nil {
		t.Fatalf("decode gc: %v", err)
	}
	if !gcResult.DryRun {
		t.Fatal("expected dry_run=true")
	}

	var rebuildResult struct {
		CommitsFound int `json:"commits_found"`
		BlobsFound   int `json:"blobs_found"`
	}
	if err := json.Unmarshal(mustOK(t, h, "repo.rebuild", `{}`), &rebuildResult); err != nil {
		t.Fatalf("decode rebuild: %v", err)
	}
	if rebuildResult.CommitsFound < 1 {
		t.Fatalf("commits_found = %d", rebuildResult.CommitsFound)
	}
	if rebuildResult.BlobsFound < 1 {
		t.Fatalf("blobs_found = %d", rebuildResult.BlobsFound)
	}
}

func TestStatusAfterModification(t *testing.T) {
	dir, h := initTestRepo(t)
	writeFile(t, dir, "tracked.txt", "v1")
	mustOK(t, h, "index.add", `{"files":["tracked.txt"]}`)
	mustOK(t, h, "commit.create", `{"message":"first"}`)

	writeFile(t, dir, "tracked.txt", "v2")
	writeFile(t, dir, "new.txt", "new")

	var status struct {
		UnstagedModified []string `json:"unstaged_modified_files"`
		Untracked        []string `json:"untracked_files"`
	}
	if err := json.Unmarshal(mustOK(t, h, "status.get", `{}`), &status); err != nil {
		t.Fatalf("decode status: %v", err)
	}
	if len(status.UnstagedModified) != 1 || status.UnstagedModified[0] != "tracked.txt" {
		t.Fatalf("unstaged_modified = %v", status.UnstagedModified)
	}
	foundNew := false
	for _, f := range status.Untracked {
		if f == "new.txt" {
			foundNew = true
			break
		}
	}
	if !foundNew {
		t.Fatalf("untracked = %v, want new.txt", status.Untracked)
	}
}

func TestDoubleInitFails(t *testing.T) {
	_, h := initTestRepo(t)
	mustFail(t, h, "repo.init", `{}`)
}

func TestWorkdirTreeAndEntries(t *testing.T) {
	dir, h := initTestRepo(t)
	writeFile(t, dir, "readme.txt", "hello")
	writeFile(t, dir, "assets/a.txt", "a")
	if err := os.MkdirAll(filepath.Join(dir, "assets", "nested"), 0o755); err != nil {
		t.Fatal(err)
	}
	writeFile(t, dir, "assets/nested/b.txt", "b")

	var tree folderNodeResult
	if err := json.Unmarshal(mustOK(t, h, "workdir.tree", `{"path":"","depth":1}`), &tree); err != nil {
		t.Fatalf("decode tree: %v", err)
	}
	if tree.Path != "" {
		t.Fatalf("root path = %q, want empty", tree.Path)
	}
	if len(tree.Children) == 0 {
		t.Fatal("expected folder children at repo root")
	}
	foundAssets := false
	for _, child := range tree.Children {
		if child.Path == "assets" {
			foundAssets = true
			if child.ItemCount < 2 {
				t.Fatalf("assets item_count = %d, want >= 2", child.ItemCount)
			}
		}
	}
	if !foundAssets {
		t.Fatalf("children = %+v, want assets", tree.Children)
	}

	var entriesResult struct {
		Entries []struct {
			Path  string `json:"path"`
			IsDir bool   `json:"is_dir"`
		} `json:"entries"`
		Total   int  `json:"total"`
		HasMore bool `json:"has_more"`
	}
	if err := json.Unmarshal(mustOK(t, h, "workdir.entries", `{"path":"","offset":0,"limit":50}`), &entriesResult); err != nil {
		t.Fatalf("decode entries: %v", err)
	}
	if entriesResult.Total < 2 {
		t.Fatalf("total = %d, want >= 2", entriesResult.Total)
	}
	for _, entry := range entriesResult.Entries {
		if entry.Path == ".dfmignore" {
			t.Fatal("workdir.entries must not include .dfmignore")
		}
	}

	var openResult map[string]bool
	if err := json.Unmarshal(mustOK(t, h, "workdir.open", `{"path":"readme.txt"}`), &openResult); err != nil {
		t.Fatalf("decode workdir.open: %v", err)
	}
	if !openResult["success"] {
		t.Fatalf("workdir.open success = %v, want true", openResult["success"])
	}

	var searchResult struct {
		Entries []struct {
			Path  string `json:"path"`
			IsDir bool   `json:"is_dir"`
		} `json:"entries"`
		Total int `json:"total"`
	}
	if err := json.Unmarshal(mustOK(t, h, "workdir.search", `{"query":"readme","limit":50}`), &searchResult); err != nil {
		t.Fatalf("decode workdir.search: %v", err)
	}
	if searchResult.Total < 1 {
		t.Fatalf("search total = %d, want >= 1", searchResult.Total)
	}
	foundReadme := false
	for _, entry := range searchResult.Entries {
		if entry.Path == "readme.txt" {
			foundReadme = true
		}
		if entry.Path == ".dfmignore" {
			t.Fatal("workdir.search must not include .dfmignore")
		}
	}
	if !foundReadme {
		t.Fatalf("search entries = %+v, want readme.txt", searchResult.Entries)
	}

	pngBytes := []byte{0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d}
	writeFile(t, dir, "assets/preview.png", string(pngBytes))

	var thumbResult struct {
		Kind           string `json:"kind"`
		Mime           string `json:"mime"`
		ContentBase64  string `json:"content_base64"`
		TextPreview    string `json:"text_preview"`
	}
	if err := json.Unmarshal(mustOK(t, h, "workdir.thumbnail", `{"path":"assets/preview.png"}`), &thumbResult); err != nil {
		t.Fatalf("decode workdir.thumbnail image: %v", err)
	}
	if thumbResult.Kind != "image" {
		t.Fatalf("thumbnail kind = %q, want image", thumbResult.Kind)
	}
	if thumbResult.ContentBase64 == "" {
		t.Fatal("expected content_base64 for image thumbnail")
	}

	if err := json.Unmarshal(mustOK(t, h, "workdir.thumbnail", `{"path":"readme.txt"}`), &thumbResult); err != nil {
		t.Fatalf("decode workdir.thumbnail text: %v", err)
	}
	if thumbResult.Kind != "text" {
		t.Fatalf("thumbnail kind = %q, want text", thumbResult.Kind)
	}
	if thumbResult.TextPreview != "hello" {
		t.Fatalf("text_preview = %q, want hello", thumbResult.TextPreview)
	}
}

func TestLogGetPathFilterAndRestoreFile(t *testing.T) {
	dir, h := initTestRepo(t)
	writeFile(t, dir, "tracked.txt", "version-one")
	mustOK(t, h, "index.add", `{"files":["tracked.txt"]}`)
	mustOK(t, h, "commit.create", `{"message":"add tracked","author":"tester"}`)
	writeFile(t, dir, "tracked.txt", "version-two")
	mustOK(t, h, "index.add", `{"files":["tracked.txt"]}`)
	mustOK(t, h, "commit.create", `{"message":"update tracked","author":"tester"}`)

	var logResult struct {
		Commits []struct {
			Hash string `json:"hash"`
		} `json:"commits"`
		Filtered bool `json:"filtered"`
	}
	if err := json.Unmarshal(mustOK(t, h, "log.get", `{"path":"tracked.txt","max_count":10}`), &logResult); err != nil {
		t.Fatalf("decode log.get: %v", err)
	}
	if !logResult.Filtered {
		t.Fatal("filtered = false, want true")
	}
	if len(logResult.Commits) < 2 {
		t.Fatalf("commits = %d, want >= 2", len(logResult.Commits))
	}

	oldestHash := logResult.Commits[len(logResult.Commits)-1].Hash
	writeFile(t, dir, "tracked.txt", "corrupted")
	mustOK(t, h, "restore.file", `{"commit_hash":"`+oldestHash+`","paths":["tracked.txt"]}`)

	content, err := os.ReadFile(filepath.Join(dir, "tracked.txt"))
	if err != nil {
		t.Fatal(err)
	}
	if string(content) != "version-one" {
		t.Fatalf("content = %q, want version-one", string(content))
	}
}

func TestDiffHandlers(t *testing.T) {
	dir, h := initTestRepo(t)
	writeFile(t, dir, "tracked.txt", "version-one")
	mustOK(t, h, "index.add", `{"files":["tracked.txt"]}`)
	mustOK(t, h, "commit.create", `{"message":"add tracked","author":"tester"}`)
	writeFile(t, dir, "tracked.txt", "version-two")
	mustOK(t, h, "index.add", `{"files":["tracked.txt"]}`)
	mustOK(t, h, "commit.create", `{"message":"update tracked","author":"tester"}`)

	var logResult struct {
		Commits []struct {
			Hash string `json:"hash"`
		} `json:"commits"`
	}
	if err := json.Unmarshal(mustOK(t, h, "log.get", `{"max_count":10}`), &logResult); err != nil {
		t.Fatalf("decode log.get: %v", err)
	}
	if len(logResult.Commits) < 2 {
		t.Fatalf("commits = %d, want >= 2", len(logResult.Commits))
	}
	latest := logResult.Commits[0].Hash

	var nameStatus struct {
		Files []struct {
			Status string `json:"status"`
			Path   string `json:"path"`
		} `json:"files"`
	}
	if err := json.Unmarshal(mustOK(t, h, "diff.name_status", `{"to":"`+latest+`"}`), &nameStatus); err != nil {
		t.Fatalf("decode diff.name_status: %v", err)
	}
	if len(nameStatus.Files) == 0 {
		t.Fatal("diff.name_status files empty")
	}

	var diffText struct {
		Content  string `json:"content"`
		IsBinary bool   `json:"is_binary"`
	}
	if err := json.Unmarshal(
		mustOK(t, h, "diff.text", `{"to":"`+latest+`","path":"tracked.txt","unified":true}`),
		&diffText,
	); err != nil {
		t.Fatalf("decode diff.text: %v", err)
	}
	if diffText.IsBinary || diffText.Content == "" {
		t.Fatalf("diff.text = %+v, want text content", diffText)
	}
}

type folderNodeResult struct {
	Name      string             `json:"name"`
	Path      string             `json:"path"`
	ItemCount int                `json:"item_count"`
	Children  []folderNodeResult `json:"children"`
}

func TestMergeStatusIdle(t *testing.T) {
	_, h := initTestRepo(t)
	var status struct {
		InProgress bool `json:"in_progress"`
	}
	if err := json.Unmarshal(mustOK(t, h, "merge.status", `{}`), &status); err != nil {
		t.Fatalf("decode merge.status: %v", err)
	}
	if status.InProgress {
		t.Fatal("merge.status in_progress = true, want false")
	}
}

func TestMergeFastForward(t *testing.T) {
	dir, h := initTestRepo(t)
	writeFile(t, dir, "base.txt", "base")
	mustOK(t, h, "index.add", `{"files":["base.txt"]}`)
	mustOK(t, h, "commit.create", `{"message":"base"}`)

	var logResult struct {
		Commits []struct {
			Hash string `json:"hash"`
		} `json:"commits"`
	}
	if err := json.Unmarshal(mustOK(t, h, "log.get", `{}`), &logResult); err != nil {
		t.Fatalf("decode log: %v", err)
	}
	baseHead := logResult.Commits[0].Hash

	mustOK(t, h, "branch.create", `{"name":"feature","commit_hash":"`+baseHead+`"}`)
	mustOK(t, h, "repo.switch", `{"target":"feature","auto_stash":true}`)
	writeFile(t, dir, "feature.txt", "feature")
	mustOK(t, h, "index.add", `{"files":["feature.txt"]}`)
	mustOK(t, h, "commit.create", `{"message":"feature commit"}`)

	mustOK(t, h, "repo.switch", `{"target":"main"}`)
	var mergeResult struct {
		Success bool   `json:"success"`
		Hash    string `json:"hash"`
	}
	if err := json.Unmarshal(
		mustOK(t, h, "merge.start", `{"branch":"feature","no_ff":false}`),
		&mergeResult,
	); err != nil {
		t.Fatalf("decode merge.start: %v", err)
	}
	if !mergeResult.Success || mergeResult.Hash == "" {
		t.Fatalf("merge.start = %+v", mergeResult)
	}

	var after struct {
		InProgress bool `json:"in_progress"`
	}
	if err := json.Unmarshal(mustOK(t, h, "merge.status", `{}`), &after); err != nil {
		t.Fatalf("decode merge.status: %v", err)
	}
	if after.InProgress {
		t.Fatal("merge.status still in progress after fast-forward merge")
	}
}

func TestDetachedHeadAfterRestoreVersion(t *testing.T) {
	dir, h := initTestRepo(t)
	writeFile(t, dir, "a.txt", "v1")
	mustOK(t, h, "index.add", `{"files":["a.txt"]}`)
	mustOK(t, h, "commit.create", `{"message":"first"}`)

	writeFile(t, dir, "a.txt", "v2")
	mustOK(t, h, "index.add", `{"files":["a.txt"]}`)
	mustOK(t, h, "commit.create", `{"message":"second"}`)

	var logResult struct {
		Commits []struct {
			Hash string `json:"hash"`
		} `json:"commits"`
	}
	if err := json.Unmarshal(mustOK(t, h, "log.get", `{}`), &logResult); err != nil {
		t.Fatalf("decode log: %v", err)
	}
	if len(logResult.Commits) < 2 {
		t.Fatalf("expected at least 2 commits, got %d", len(logResult.Commits))
	}
	branchHead := logResult.Commits[0].Hash
	parentCommit := logResult.Commits[1].Hash

	mustOK(t, h, "restore.version", `{"commit_hash":"`+parentCommit+`"}`)

	var status struct {
		IsDetached     bool   `json:"is_detached"`
		DetachedCommit string `json:"detached_commit"`
		HeadCommit     string `json:"head_commit"`
		CurrentBranch  string `json:"current_branch"`
	}
	if err := json.Unmarshal(mustOK(t, h, "status.get", `{}`), &status); err != nil {
		t.Fatalf("decode status: %v", err)
	}
	if !status.IsDetached {
		t.Fatal("expected is_detached=true")
	}
	if status.DetachedCommit != parentCommit || status.HeadCommit != parentCommit {
		t.Fatalf("detached commit = %s head = %s want %s", status.DetachedCommit, status.HeadCommit, parentCommit)
	}
	if status.CurrentBranch != "main" {
		t.Fatalf("current_branch = %q want main", status.CurrentBranch)
	}

	writeFile(t, dir, "a.txt", "detached edit")
	mustOK(t, h, "index.add", `{"files":["a.txt"]}`)
	mustFail(t, h, "commit.create", `{"message":"detached commit"}`)

	mustOK(t, h, "repo.switch", `{"target":"main","auto_stash":true}`)
	if err := json.Unmarshal(mustOK(t, h, "status.get", `{}`), &status); err != nil {
		t.Fatalf("decode status after switch: %v", err)
	}
	if status.IsDetached {
		t.Fatal("expected detached cleared after switching to branch")
	}
	if status.HeadCommit != branchHead {
		t.Fatalf("head after failed detached commit = %s, want %s", status.HeadCommit, branchHead)
	}
}
