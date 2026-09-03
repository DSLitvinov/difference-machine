package commands

import "testing"

func TestPairRenamesByHash(t *testing.T) {
	hashes := map[string]string{
		"dir/old.txt": "abc",
		"dir/new.txt": "abc",
		"keep.txt":    "zzz",
		"gone.txt":    "yyy",
	}
	hashOf := func(path string) (string, bool) {
		h, ok := hashes[path]
		return h, ok
	}

	renamed, added, deleted := pairRenamesByHash(
		[]string{"dir/new.txt", "keep.txt"},
		[]string{"dir/old.txt", "gone.txt"},
		hashOf,
	)
	if len(renamed) != 1 || renamed[0].OldPath != "dir/old.txt" || renamed[0].NewPath != "dir/new.txt" {
		t.Fatalf("renamed = %+v", renamed)
	}
	if len(added) != 1 || added[0] != "keep.txt" {
		t.Fatalf("added = %v", added)
	}
	if len(deleted) != 1 || deleted[0] != "gone.txt" {
		t.Fatalf("deleted = %v", deleted)
	}
}
