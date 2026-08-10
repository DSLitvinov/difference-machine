import { create } from "zustand";

import { loadSelectedCommitHash, saveSelectedCommitHash } from "@/lib/storage";
import type { CommitLogEntry } from "@/wails/forester";

interface HistoryState {
  searchQuery: string;
  selectedCommitHash: string | null;
  selectedChangedFilePath: string | null;
  pendingBranchTarget: string | null;
  branchCommits: CommitLogEntry[];
  branchLogBranch: string | null;
  setSearchQuery: (query: string) => void;
  selectCommit: (repoPath: string | null, hash: string | null) => void;
  setSelectedChangedFilePath: (path: string | null) => void;
  setPendingBranchTarget: (branch: string | null) => void;
  setBranchCommits: (branch: string, commits: CommitLogEntry[]) => void;
  restoreSelection: (repoPath: string, availableHashes: string[]) => void;
  reset: () => void;
}

export const useHistoryStore = create<HistoryState>((set) => ({
  searchQuery: "",
  selectedCommitHash: null,
  selectedChangedFilePath: null,
  pendingBranchTarget: null,
  branchCommits: [],
  branchLogBranch: null,
  setSearchQuery: (query) => set({ searchQuery: query }),
  selectCommit: (repoPath, hash) => {
    if (repoPath) {
      saveSelectedCommitHash(repoPath, hash);
    }
    set({ selectedCommitHash: hash, selectedChangedFilePath: null });
  },
  setSelectedChangedFilePath: (path) => set({ selectedChangedFilePath: path }),
  setPendingBranchTarget: (branch) => set({ pendingBranchTarget: branch }),
  setBranchCommits: (branch, commits) => set({ branchCommits: commits, branchLogBranch: branch }),
  restoreSelection: (repoPath, availableHashes) => {
    const saved = loadSelectedCommitHash(repoPath);
    let hash: string | null = null;
    if (saved && availableHashes.includes(saved)) {
      hash = saved;
    } else if (availableHashes.length > 0) {
      hash = availableHashes[0]!;
    }
    saveSelectedCommitHash(repoPath, hash);
    set({ selectedCommitHash: hash, selectedChangedFilePath: null });
  },
  reset: () =>
    set({
      searchQuery: "",
      selectedCommitHash: null,
      selectedChangedFilePath: null,
      pendingBranchTarget: null,
      branchCommits: [],
      branchLogBranch: null,
    }),
}));
