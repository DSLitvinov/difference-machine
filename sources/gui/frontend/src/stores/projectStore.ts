import { create } from "zustand";

import { DEFAULT_THUMB_SCALE, type ThumbScalePx } from "@/lib/previewScale";
import {
  loadShowChangedOnly,
  loadSortLocale,
  loadSelectedFolderPath,
  loadThumbScale,
  saveSelectedFolderPath,
  saveShowChangedOnly,
  saveSortLocale,
  saveThumbScale,
  type SortLocale,
} from "@/lib/storage";
import { useAppStore } from "@/stores/appStore";

import type { FolderNode, StatusPayload } from "@/wails/forester";
import { committablePaths } from "@/wails/forester";

function sameStringArrays(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  for (let i = 0; i < sortedA.length; i += 1) {
    if (sortedA[i] !== sortedB[i]) return false;
  }
  return true;
}

function sameStatusPayload(a: StatusPayload | null, b: StatusPayload | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

interface ProjectState {
  selectedFolderPath: string;
  selectedFilePaths: string[];
  showChangedOnly: boolean;
  expandedPaths: Record<string, boolean>;
  folderTree: FolderNode | null;
  status: StatusPayload | null;
  committable: string[];
  previewGeneration: number;
  sortLocale: SortLocale;
  thumbScale: ThumbScalePx;
  navStack: string[];
  navIndex: number;
  previewSearchQuery: string;
  treeLoading: boolean;
  setSelectedFolderPath: (path: string) => void;
  navigateToFolder: (path: string) => void;
  navigateBack: () => void;
  navigateForward: () => void;
  setSelectedFilePaths: (paths: string[]) => void;
  toggleFileSelection: (path: string, additive: boolean) => void;
  clearFileSelection: () => void;
  setShowChangedOnly: (value: boolean) => void;
  toggleExpanded: (path: string) => void;
  setFolderTree: (tree: FolderNode | null) => void;
  mergeFolderChildren: (path: string, children: FolderNode[]) => void;
  setStatus: (status: StatusPayload | null) => void;
  bumpPreviewGeneration: () => void;
  setSortLocale: (locale: SortLocale) => void;
  setThumbScale: (px: ThumbScalePx) => void;
  setPreviewSearchQuery: (query: string) => void;
  restoreRepoPrefs: (repoPath: string) => void;
  setTreeLoading: (loading: boolean) => void;
  reset: () => void;
}

const initialState = {
  selectedFolderPath: "",
  selectedFilePaths: [] as string[],
  showChangedOnly: false,
  expandedPaths: {} as Record<string, boolean>,
  folderTree: null as FolderNode | null,
  status: null as StatusPayload | null,
  committable: [] as string[],
  previewGeneration: 0,
  sortLocale: "en-US" as SortLocale,
  thumbScale: DEFAULT_THUMB_SCALE,
  navStack: [""] as string[],
  navIndex: 0,
  previewSearchQuery: "",
  treeLoading: false,
};

function persistFolderPath(path: string) {
  const repoPath = useAppStore.getState().repoPath;
  if (repoPath) saveSelectedFolderPath(repoPath, path);
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  ...initialState,
  setSelectedFolderPath: (path) => {
    persistFolderPath(path);
    set({ selectedFolderPath: path, selectedFilePaths: [] });
  },
  navigateToFolder: (path) => {
    const state = get();
    if (state.selectedFolderPath === path && state.previewSearchQuery === "") {
      return;
    }
    const stack = state.navStack.slice(0, state.navIndex + 1);
    if (stack[stack.length - 1] !== path) {
      stack.push(path);
    }
    persistFolderPath(path);
    set({
      selectedFolderPath: path,
      selectedFilePaths: [],
      navStack: stack,
      navIndex: stack.length - 1,
      previewSearchQuery: "",
    });
  },
  navigateBack: () => {
    const state = get();
    if (state.navIndex <= 0) return;
    const nextIndex = state.navIndex - 1;
    const path = state.navStack[nextIndex] ?? "";
    persistFolderPath(path);
    set({
      navIndex: nextIndex,
      selectedFolderPath: path,
      selectedFilePaths: [],
      previewSearchQuery: "",
    });
  },
  navigateForward: () => {
    const state = get();
    if (state.navIndex >= state.navStack.length - 1) return;
    const nextIndex = state.navIndex + 1;
    const path = state.navStack[nextIndex] ?? "";
    persistFolderPath(path);
    set({
      navIndex: nextIndex,
      selectedFolderPath: path,
      selectedFilePaths: [],
      previewSearchQuery: "",
    });
  },
  setSelectedFilePaths: (paths) => set({ selectedFilePaths: paths }),
  toggleFileSelection: (path, additive) =>
    set((state) => {
      if (!additive) {
        return { selectedFilePaths: [path] };
      }
      const exists = state.selectedFilePaths.includes(path);
      if (exists) {
        const next = state.selectedFilePaths.filter((p) => p !== path);
        return { selectedFilePaths: next };
      }
      return { selectedFilePaths: [...state.selectedFilePaths, path] };
    }),
  clearFileSelection: () => set({ selectedFilePaths: [] }),
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
    set((state) => {
      const committable = status ? committablePaths(status) : [];
      if (sameStatusPayload(state.status, status) && sameStringArrays(state.committable, committable)) {
        return state;
      }
      return { status, committable, previewGeneration: state.previewGeneration + 1 };
    }),
  bumpPreviewGeneration: () =>
    set((state) => ({ previewGeneration: state.previewGeneration + 1 })),
  setSortLocale: (locale) => {
    const repoPath = useAppStore.getState().repoPath;
    if (repoPath) saveSortLocale(repoPath, locale);
    set({ sortLocale: locale });
  },
  setThumbScale: (px) => {
    const repoPath = useAppStore.getState().repoPath;
    if (repoPath) saveThumbScale(repoPath, px);
    set({ thumbScale: px });
  },
  setPreviewSearchQuery: (query) => set({ previewSearchQuery: query }),
  restoreRepoPrefs: (repoPath) => {
    const folderPath = loadSelectedFolderPath(repoPath);
    const savedThumb = loadThumbScale(repoPath);
    set({
      selectedFolderPath: folderPath,
      showChangedOnly: loadShowChangedOnly(repoPath),
      sortLocale: loadSortLocale(repoPath),
      thumbScale: (savedThumb as ThumbScalePx | null) ?? DEFAULT_THUMB_SCALE,
      selectedFilePaths: [],
      navStack: [folderPath],
      navIndex: 0,
      previewSearchQuery: "",
    });
  },
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
