import { create } from "zustand";

import {
  loadShowChangedOnly,
  loadSortLocale,
  loadSelectedFolderPath,
  saveSelectedFolderPath,
  saveShowChangedOnly,
  saveSortLocale,
  type SortLocale,
} from "@/lib/storage";
import { useAppStore } from "@/stores/appStore";

import type { FolderNode, StatusPayload } from "@/wails/forester";
import { committablePaths } from "@/wails/forester";

interface ProjectState {
  selectedFolderPath: string;
  selectedFilePath: string | null;
  showChangedOnly: boolean;
  expandedPaths: Record<string, boolean>;
  folderTree: FolderNode | null;
  status: StatusPayload | null;
  committable: string[];
  sortLocale: SortLocale;
  treeLoading: boolean;
  setSelectedFolderPath: (path: string) => void;
  setSelectedFilePath: (path: string | null) => void;
  setShowChangedOnly: (value: boolean) => void;
  toggleExpanded: (path: string) => void;
  setFolderTree: (tree: FolderNode | null) => void;
  mergeFolderChildren: (path: string, children: FolderNode[]) => void;
  setStatus: (status: StatusPayload | null) => void;
  setSortLocale: (locale: SortLocale) => void;
  restoreRepoPrefs: (repoPath: string) => void;
  setTreeLoading: (loading: boolean) => void;
  reset: () => void;
}

const initialState = {
  selectedFolderPath: "",
  selectedFilePath: null as string | null,
  showChangedOnly: false,
  expandedPaths: {} as Record<string, boolean>,
  folderTree: null as FolderNode | null,
  status: null as StatusPayload | null,
  committable: [] as string[],
  sortLocale: "en-US" as SortLocale,
  treeLoading: false,
};

export const useProjectStore = create<ProjectState>((set, get) => ({
  ...initialState,
  setSelectedFolderPath: (path) => {
    const repoPath = useAppStore.getState().repoPath;
    if (repoPath) saveSelectedFolderPath(repoPath, path);
    set({ selectedFolderPath: path, selectedFilePath: null });
  },
  setSelectedFilePath: (path) => set({ selectedFilePath: path }),
  setShowChangedOnly: (value) => {
    const repoPath = useAppStore.getState().repoPath;
    if (repoPath) saveShowChangedOnly(repoPath, value);
    set({ showChangedOnly: value });
  },
  toggleExpanded: (path) =>
    set((s) => ({
      expandedPaths: { ...s.expandedPaths, [path]: !s.expandedPaths[path] },
    })),
  setFolderTree: (tree) => set({ folderTree: tree }),
  mergeFolderChildren: (path, children) => {
    const tree = get().folderTree;
    if (!tree) return;
    const next = mergeChildren(tree, path, children);
    set({ folderTree: next });
  },
  setStatus: (status) =>
    set({
      status,
      committable: status ? committablePaths(status) : [],
    }),
  setSortLocale: (locale) => {
    const repoPath = useAppStore.getState().repoPath;
    if (repoPath) saveSortLocale(repoPath, locale);
    set({ sortLocale: locale });
  },
  restoreRepoPrefs: (repoPath) =>
    set({
      selectedFolderPath: loadSelectedFolderPath(repoPath),
      showChangedOnly: loadShowChangedOnly(repoPath),
      sortLocale: loadSortLocale(repoPath),
      selectedFilePath: null,
    }),
  setTreeLoading: (treeLoading) => set({ treeLoading }),
  reset: () => set({ ...initialState }),
}));

function mergeChildren(node: FolderNode, targetPath: string, children: FolderNode[]): FolderNode {
  if (node.path === targetPath) {
    return { ...node, children };
  }
  return {
    ...node,
    children: node.children.map((child) => mergeChildren(child, targetPath, children)),
  };
}
