import { create } from "zustand";

import { DEFAULT_THUMB_SCALE, type ThumbScalePx } from "@/lib/previewScale";
import {
  loadExpandedFolderPaths,
  loadShowChangedOnly,
  loadSortLocale,
  loadSelectedFolderPath,
  loadThumbScale,
  saveExpandedFolderPaths,
  saveSelectedFolderPath,
  saveShowChangedOnly,
  saveSortLocale,
  saveThumbScale,
  type SortLocale,
} from "@/lib/storage";
import { rangePathsBetween } from "@/lib/fileSelection";
import { useAppStore } from "@/stores/appStore";

import { collectFolderPaths } from "@/lib/flattenFolderTree";
import type { FolderNode, StatusPayload } from "@/wails/forester";
import { committablePaths, fetchWorkdirTree } from "@/wails/forester";

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

export type ProjectPreviewMode = "grid" | "fileHistory";

interface ProjectState {
  projectPreviewMode: ProjectPreviewMode;
  fileHistoryPath: string | null;
  selectedFolderPath: string;
  selectedFilePaths: string[];
  anchorPath: string | null;
  showChangedOnly: boolean;
  expandedPaths: Record<string, boolean>;
  folderTree: FolderNode | null;
  status: StatusPayload | null;
  committable: string[];
  lockedByPath: Record<string, string>;
  previewGeneration: number;
  workdirGeneration: number;
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
  selectFile: (
    path: string,
    orderedPaths: string[],
    modifiers: { additive: boolean; range: boolean },
  ) => void;
  selectFilePaths: (paths: string[], options?: { additive?: boolean }) => void;
  toggleFileSelection: (path: string, additive: boolean) => void;
  clearFileSelection: () => void;
  setShowChangedOnly: (value: boolean) => void;
  toggleExpanded: (path: string) => void;
  expandAllFolders: () => Promise<void>;
  collapseAllFolders: () => void;
  hydrateExpandedFolders: () => Promise<void>;
  setFolderTree: (tree: FolderNode | null) => void;
  mergeFolderChildren: (path: string, children: FolderNode[]) => void;
  setStatus: (status: StatusPayload | null) => void;
  setLocks: (lockedByPath: Record<string, string>) => void;
  bumpPreviewGeneration: () => void;
  bumpWorkdirGeneration: () => void;
  setSortLocale: (locale: SortLocale) => void;
  setThumbScale: (px: ThumbScalePx) => void;
  setPreviewSearchQuery: (query: string) => void;
  openFileHistory: (path: string) => void;
  closeFileHistory: () => void;
  restoreRepoPrefs: (repoPath: string) => void;
  setTreeLoading: (loading: boolean) => void;
  reset: () => void;
}

function closeFileHistoryState(): Pick<ProjectState, "projectPreviewMode" | "fileHistoryPath"> {
  return { projectPreviewMode: "grid", fileHistoryPath: null };
}

const initialState = {
  projectPreviewMode: "grid" as ProjectPreviewMode,
  fileHistoryPath: null as string | null,
  selectedFolderPath: "",
  selectedFilePaths: [] as string[],
  anchorPath: null as string | null,
  showChangedOnly: false,
  expandedPaths: {} as Record<string, boolean>,
  folderTree: null as FolderNode | null,
  status: null as StatusPayload | null,
  committable: [] as string[],
  lockedByPath: {} as Record<string, string>,
  previewGeneration: 0,
  workdirGeneration: 0,
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

function persistExpandedPaths(expandedPaths: Record<string, boolean>) {
  const repoPath = useAppStore.getState().repoPath;
  if (repoPath) saveExpandedFolderPaths(repoPath, expandedPaths);
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  ...initialState,
  setSelectedFolderPath: (path) => {
    persistFolderPath(path);
    set({
      ...closeFileHistoryState(),
      selectedFolderPath: path,
      selectedFilePaths: [],
      anchorPath: null,
    });
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
      ...closeFileHistoryState(),
      selectedFolderPath: path,
      selectedFilePaths: [],
      anchorPath: null,
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
      ...closeFileHistoryState(),
      navIndex: nextIndex,
      selectedFolderPath: path,
      selectedFilePaths: [],
      anchorPath: null,
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
      ...closeFileHistoryState(),
      navIndex: nextIndex,
      selectedFolderPath: path,
      selectedFilePaths: [],
      anchorPath: null,
      previewSearchQuery: "",
    });
  },
  setSelectedFilePaths: (paths) =>
    set({
      selectedFilePaths: paths,
      anchorPath: paths.length === 1 ? paths[0]! : get().anchorPath,
    }),
  selectFile: (path, orderedPaths, modifiers) =>
    set((state) => {
      const { additive, range } = modifiers;

      if (range) {
        const rangePaths = rangePathsBetween(orderedPaths, state.anchorPath, path);
        if (additive) {
          const merged = new Set([...state.selectedFilePaths, ...rangePaths]);
          return {
            selectedFilePaths: orderedPaths.filter((p) => merged.has(p)),
            anchorPath: state.anchorPath ?? orderedPaths[0] ?? path,
          };
        }
        return {
          selectedFilePaths: rangePaths,
          anchorPath: state.anchorPath ?? orderedPaths[0] ?? path,
        };
      }

      if (additive) {
        const exists = state.selectedFilePaths.includes(path);
        const next = exists
          ? state.selectedFilePaths.filter((p) => p !== path)
          : [...state.selectedFilePaths, path];
        return { selectedFilePaths: next, anchorPath: path };
      }

      return { selectedFilePaths: [path], anchorPath: path };
    }),
  selectFilePaths: (paths, options) =>
    set((state) => {
      const additive = options?.additive ?? false;
      if (additive) {
        const merged = new Set([...state.selectedFilePaths, ...paths]);
        return {
          selectedFilePaths: [...merged],
          anchorPath: paths[0] ?? state.anchorPath,
        };
      }
      return {
        selectedFilePaths: paths,
        anchorPath: paths[0] ?? null,
      };
    }),
  toggleFileSelection: (path, additive) =>
    get().selectFile(path, [path], { additive, range: false }),
  clearFileSelection: () => set({ selectedFilePaths: [], anchorPath: null }),
  setShowChangedOnly: (value) => {
    const repoPath = useAppStore.getState().repoPath;
    if (repoPath) saveShowChangedOnly(repoPath, value);
    set({ showChangedOnly: value });
  },
  toggleExpanded: (path) =>
    set((s) => {
      const expandedPaths = { ...s.expandedPaths, [path]: !s.expandedPaths[path] };
      persistExpandedPaths(expandedPaths);
      return { expandedPaths };
    }),
  expandAllFolders: async () => {
    set({ treeLoading: true });
    try {
      const tree = await fetchWorkdirTree("", 64);
      const expandedPaths: Record<string, boolean> = {};
      for (const path of collectFolderPaths(tree)) {
        expandedPaths[path] = true;
      }
      persistExpandedPaths(expandedPaths);
      set({ folderTree: tree, expandedPaths });
    } finally {
      set({ treeLoading: false });
    }
  },
  collapseAllFolders: () => {
    persistExpandedPaths({});
    set({ expandedPaths: {} });
  },
  hydrateExpandedFolders: async () => {
    const state = get();
    if (!state.folderTree) return;

    const expandedPaths = Object.keys(state.expandedPaths)
      .filter((path) => state.expandedPaths[path])
      .sort((a, b) => a.split("/").length - b.split("/").length);

    for (const path of expandedPaths) {
      const currentTree = get().folderTree;
      const existing = currentTree ? findNode(currentTree, path) : null;
      if (!existing || existing.children.length > 0 || existing.item_count === 0) {
        continue;
      }
      const subtree = await fetchWorkdirTree(path, 1);
      get().mergeFolderChildren(path, subtree.children);
    }
  },
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
  setLocks: (lockedByPath) =>
    set((state) => {
      if (JSON.stringify(state.lockedByPath) === JSON.stringify(lockedByPath)) {
        return state;
      }
      return { lockedByPath };
    }),
  bumpPreviewGeneration: () =>
    set((state) => ({ previewGeneration: state.previewGeneration + 1 })),
  bumpWorkdirGeneration: () =>
    set((state) => ({ workdirGeneration: state.workdirGeneration + 1 })),
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
  openFileHistory: (path) =>
    set({
      projectPreviewMode: "fileHistory",
      fileHistoryPath: path,
    }),
  closeFileHistory: () => set(closeFileHistoryState()),
  restoreRepoPrefs: (repoPath) => {
    const folderPath = loadSelectedFolderPath(repoPath);
    const savedThumb = loadThumbScale(repoPath);
    set({
      selectedFolderPath: folderPath,
      expandedPaths: loadExpandedFolderPaths(repoPath),
      showChangedOnly: loadShowChangedOnly(repoPath),
      sortLocale: loadSortLocale(repoPath),
      thumbScale: (savedThumb as ThumbScalePx | null) ?? DEFAULT_THUMB_SCALE,
      selectedFilePaths: [],
      anchorPath: null,
      navStack: [folderPath],
      navIndex: 0,
      previewSearchQuery: "",
      ...closeFileHistoryState(),
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

function findNode(node: FolderNode, path: string): FolderNode | null {
  if (node.path === path) return node;
  for (const child of node.children) {
    const found = findNode(child, path);
    if (found) return found;
  }
  return null;
}
