import { create } from "zustand";

import { loadSelectedCommitHash, saveSelectedCommitHash } from "@/lib/storage";

interface HistoryState {
  searchQuery: string;
  selectedCommitHash: string | null;
  selectedChangedFilePath: string | null;
  pendingBranchTarget: string | null;
  setSearchQuery: (query: string) => void;
  selectCommit: (repoPath: string | null, hash: string | null) => void;
  setSelectedChangedFilePath: (path: string | null) => void;
  setPendingBranchTarget: (branch: string | null) => void;
  restoreSelection: (repoPath: string, availableHashes: string[]) => void;
  reset: () => void;
}

export const useHistoryStore = create<HistoryState>((set) => ({
  searchQuery: "",
  selectedCommitHash: null,
  selectedChangedFilePath: null,
  pendingBranchTarget: null,
  setSearchQuery: (query) => set({ searchQuery: query }),
  selectCommit: (repoPath, hash) => {
    if (repoPath) {
      saveSelectedCommitHash(repoPath, hash);
    }
    set({ selectedCommitHash: hash, selectedChangedFilePath: null });
  },
  setSelectedChangedFilePath: (path) => set({ selectedChangedFilePath: path }),
  setPendingBranchTarget: (branch) => set({ pendingBranchTarget: branch }),
  restoreSelection: (repoPath, availableHashes) => {
    const saved = loadSelectedCommitHash(repoPath);
    if (saved && availableHashes.includes(saved)) {
      set({ selectedCommitHash: saved, selectedChangedFilePath: null });
    } else {
      saveSelectedCommitHash(repoPath, null);
      set({ selectedCommitHash: null, selectedChangedFilePath: null });
    }
  },
  reset: () =>
    set({
      searchQuery: "",
      selectedCommitHash: null,
      selectedChangedFilePath: null,
      pendingBranchTarget: null,
    }),
}));
