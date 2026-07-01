import { create } from "zustand";

import { DEFAULT_THUMB_SCALE, type ThumbScalePx } from "@/lib/previewScale";
import {
  loadExpandedFolderPaths,
  loadShowChangedOnly,
  loadSortMode,
  loadSelectedFolderPath,
  loadThumbScale,
  saveExpandedFolderPaths,
  saveSelectedFolderPath,
  saveShowChangedOnly,
  saveSortMode,
  saveThumbScale,
  type PreviewSortMode,
} from "@/lib/storage";
import { rangePathsBetween } from "@/lib/fileSelection";
import { useAppStore } from "@/stores/appStore";

import { collectFolderPaths } from "@/lib/flattenFolderTree";
import { ALL_FILES_PATH } from "@/lib/projectViewPaths";
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

export type ProjectPreviewMode = "grid" | "fileViewer" | "fileHistory";

export type FileHistoryReturnMode = "grid" | "fileViewer";

interface ProjectState {
  projectPreviewMode: ProjectPreviewMode;
  fileHistoryPath: string | null;
  fileHistoryReturnMode: FileHistoryReturnMode;
  fileViewerPath: string | null;
  selectedFolderPath: string;
  selectedFilePaths: string[];
  anchorPath: string | null;
  showChangedOnly: boolean;
  expandedPaths: Record<string, boolean>;
  folderTree: FolderNode | null;
  status: StatusPayload | null;
  committable: string[];
  lockedByPath: Record<string, string>;
  workdirGeneration: number;
  sortMode: PreviewSortMode;
  thumbScale: ThumbScalePx;
  navStack: string[];
  navIndex: number;
  previewSearchQuery: string;
  treeLoading: boolean;
  loadedRepoPath: string | null;
  pendingOpenStatus: { repoPath: string; status: StatusPayload } | null;
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
  bumpWorkdirGeneration: () => void;
  setSortMode: (mode: PreviewSortMode) => void;
  setThumbScale: (px: ThumbScalePx) => void;
  setPreviewSearchQuery: (query: string) => void;
  openFileHistory: (path: string) => void;
  closeFileHistory: () => void;
  openFileViewer: (path: string) => void;
  closeFileViewer: () => void;
  exitSubPreviewViews: () => void;
  restoreRepoPrefs: (repoPath: string) => void;
  setTreeLoading: (loading: boolean) => void;
  setPendingOpenStatus: (repoPath: string, status: StatusPayload) => void;
  consumePendingOpenStatus: (repoPath: string | null) => StatusPayload | undefined;
  markProjectDataLoaded: (repoPath: string) => void;
  invalidateProjectDataLoad: () => void;
  reset: () => void;
}

function exitSubPreviewState(): Pick<
  ProjectState,
  "projectPreviewMode" | "fileHistoryPath" | "fileHistoryReturnMode" | "fileViewerPath"
> {
  return {
    projectPreviewMode: "grid",
    fileHistoryPath: null,
    fileHistoryReturnMode: "grid",
    fileViewerPath: null,
  };
}

const initialState = {
  projectPreviewMode: "grid" as ProjectPreviewMode,
  fileHistoryPath: null as string | null,
  fileHistoryReturnMode: "grid" as FileHistoryReturnMode,
  fileViewerPath: null as string | null,
  selectedFolderPath: ALL_FILES_PATH,
  selectedFilePaths: [] as string[],
  anchorPath: null as string | null,
  showChangedOnly: false,
  expandedPaths: {} as Record<string, boolean>,
  folderTree: null as FolderNode | null,
  status: null as StatusPayload | null,
  committable: [] as string[],
  lockedByPath: {} as Record<string, string>,
  workdirGeneration: 0,
  sortMode: "name-en" as PreviewSortMode,
  thumbScale: DEFAULT_THUMB_SCALE,
  navStack: [ALL_FILES_PATH] as string[],
  navIndex: 0,
  previewSearchQuery: "",
  treeLoading: false,
  loadedRepoPath: null as string | null,
  pendingOpenStatus: null as { repoPath: string; status: StatusPayload } | null,
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
      ...exitSubPreviewState(),
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
      ...exitSubPreviewState(),
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
      ...exitSubPreviewState(),
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
      ...exitSubPreviewState(),
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
      const committableChanged = !sameStringArrays(state.committable, committable);
      return {
        status,
        committable,
        workdirGeneration: committableChanged
          ? state.workdirGeneration + 1
          : state.workdirGeneration,
      };
    }),
  setLocks: (lockedByPath) =>
    set((state) => {
      if (JSON.stringify(state.lockedByPath) === JSON.stringify(lockedByPath)) {
        return state;
      }
      return { lockedByPath };
    }),
  bumpWorkdirGeneration: () =>
    set((state) => ({ workdirGeneration: state.workdirGeneration + 1 })),
  setSortMode: (mode) => {
    const repoPath = useAppStore.getState().repoPath;
    if (repoPath) saveSortMode(repoPath, mode);
    set({ sortMode: mode });
  },
  setThumbScale: (px) => {
    const repoPath = useAppStore.getState().repoPath;
    if (repoPath) saveThumbScale(repoPath, px);
    set({ thumbScale: px });
  },
  setPreviewSearchQuery: (query) => set({ previewSearchQuery: query }),
  openFileHistory: (path) => {
    const returnTo: FileHistoryReturnMode =
      get().projectPreviewMode === "fileViewer" ? "fileViewer" : "grid";
    set({
      projectPreviewMode: "fileHistory",
      fileHistoryPath: path,
      fileHistoryReturnMode: returnTo,
    });
  },
  closeFileHistory: () => {
    const { fileHistoryReturnMode, fileViewerPath } = get();
    if (fileHistoryReturnMode === "fileViewer" && fileViewerPath) {
      set({
        projectPreviewMode: "fileViewer",
        fileHistoryPath: null,
        fileHistoryReturnMode: "grid",
      });
      return;
    }
    set({
      projectPreviewMode: "grid",
      fileHistoryPath: null,
      fileHistoryReturnMode: "grid",
      fileViewerPath: null,
    });
  },
  openFileViewer: (path) =>
    set({
      projectPreviewMode: "fileViewer",
      fileViewerPath: path,
      selectedFilePaths: get().selectedFilePaths.includes(path)
        ? get().selectedFilePaths
        : [path],
      anchorPath: path,
    }),
  closeFileViewer: () =>
    set({
      projectPreviewMode: "grid",
      fileViewerPath: null,
    }),
  exitSubPreviewViews: () => set(exitSubPreviewState()),
  restoreRepoPrefs: (repoPath) => {
    const folderPath = loadSelectedFolderPath(repoPath);
    const savedThumb = loadThumbScale(repoPath);
    set({
      selectedFolderPath: folderPath,
      expandedPaths: loadExpandedFolderPaths(repoPath),
      showChangedOnly: loadShowChangedOnly(repoPath),
      sortMode: loadSortMode(repoPath),
      thumbScale: (savedThumb as ThumbScalePx | null) ?? DEFAULT_THUMB_SCALE,
      selectedFilePaths: [],
      anchorPath: null,
      navStack: [folderPath],
      navIndex: 0,
      previewSearchQuery: "",
      ...exitSubPreviewState(),
    });
  },
  setTreeLoading: (treeLoading) => set({ treeLoading }),
  setPendingOpenStatus: (repoPath, status) => set({ pendingOpenStatus: { repoPath, status } }),
  consumePendingOpenStatus: (repoPath) => {
    if (!repoPath) return undefined;
    const pending = get().pendingOpenStatus;
    if (pending?.repoPath === repoPath) {
      set({ pendingOpenStatus: null });
      return pending.status;
    }
    return undefined;
  },
  markProjectDataLoaded: (repoPath) => set({ loadedRepoPath: repoPath }),
  invalidateProjectDataLoad: () => set({ loadedRepoPath: null, pendingOpenStatus: null }),
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
