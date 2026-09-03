package commands

import "sort"

type renamePair struct {
	OldPath string
	NewPath string
}

func pairRenamesByHash(added, deleted []string, hashOf func(path string) (string, bool)) (renamed []renamePair, remainingAdded, remainingDeleted []string) {
	if len(added) == 0 || len(deleted) == 0 {
		return nil, added, deleted
	}

	deletedByHash := make(map[string][]string)
	for _, path := range deleted {
		hash, ok := hashOf(path)
		if !ok || hash == "" {
			continue
		}
		deletedByHash[hash] = append(deletedByHash[hash], path)
	}
	for hash := range deletedByHash {
		sort.Strings(deletedByHash[hash])
	}

	usedOld := make(map[string]bool)
	sortedAdded := append([]string(nil), added...)
	sort.Strings(sortedAdded)
	remainingAdded = make([]string, 0, len(added))

	for _, newPath := range sortedAdded {
		hash, ok := hashOf(newPath)
		if !ok || hash == "" {
			remainingAdded = append(remainingAdded, newPath)
			continue
		}
		matched := ""
		for _, oldPath := range deletedByHash[hash] {
			if !usedOld[oldPath] {
				matched = oldPath
				break
			}
		}
		if matched != "" {
			renamed = append(renamed, renamePair{OldPath: matched, NewPath: newPath})
			usedOld[matched] = true
		} else {
			remainingAdded = append(remainingAdded, newPath)
		}
	}

	remainingDeleted = make([]string, 0, len(deleted))
	for _, path := range deleted {
		if !usedOld[path] {
			remainingDeleted = append(remainingDeleted, path)
		}
	}
	return renamed, remainingAdded, remainingDeleted
}

func droppedOldPaths(renamed []renamePair) map[string]bool {
	drop := make(map[string]bool, len(renamed))
	for _, pair := range renamed {
		drop[pair.OldPath] = true
	}
	return drop
}

func rejectPaths(list []string, drop map[string]bool) []string {
	if len(drop) == 0 {
		return list
	}
	out := make([]string, 0, len(list))
	for _, path := range list {
		if !drop[path] {
			out = append(out, path)
		}
	}
	return out
}

func formatRename(pair renamePair) string {
	return pair.OldPath + " -> " + pair.NewPath
}
