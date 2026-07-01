import { useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronDown, ChevronRight, Folder } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { flattenVisibleFolderTree } from "@/lib/flattenFolderTree";
import { ALL_FILES_PATH, isAllFilesPath, isRootFolderPath } from "@/lib/projectViewPaths";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/stores/projectStore";
import type { FolderNode } from "@/wails/forester";
import { fetchWorkdirTree, folderHasCommittable } from "@/wails/forester";

const FOLDER_ROW_HEIGHT = 36;
const ROOT_FOLDER_PATH = "";

interface FolderTreeRowProps {
  node: FolderNode;
  depth: number;
  selectedPath: string;
  expanded: boolean;
  onSelect: (path: string) => void;
  onToggle: (path: string) => void;
}

function FolderTreeRow({
  node,
  depth,
  selectedPath,
  expanded,
  onSelect,
  onToggle,
}: FolderTreeRowProps) {
  const isSelected = selectedPath === node.path;
  const hasChildren = node.children.length > 0 || node.item_count > 0;

  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        "h-9 w-full justify-start gap-1 rounded-md px-3 py-2 text-left text-sm font-normal",
        isSelected ? "bg-accent text-secondary-foreground" : "",
      )}
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
      onClick={() => onSelect(node.path)}
    >
      <span
        className="flex h-4 w-4 shrink-0 items-center justify-center"
        onClick={(e) => {
          e.stopPropagation();
          if (hasChildren) onToggle(node.path);
        }}
        role="presentation"
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )
        ) : null}
      </span>
      <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate" title={node.name}>
        {node.name}
      </span>
      <span className="text-xs font-semibold text-muted-foreground">{node.item_count}</span>
    </Button>
  );
}

interface RootFolderRowProps {
  node: FolderNode;
  count: number;
  selectedPath: string;
  expanded: boolean;
  onSelect: (path: string) => void;
  onToggle: (path: string) => void;
}

function RootFolderRow({
  node,
  count,
  selectedPath,
  expanded,
  onSelect,
  onToggle,
}: RootFolderRowProps) {
  const isSelected = isRootFolderPath(selectedPath);
  const hasChildren = node.children.length > 0 || node.item_count > 0;

  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        "h-9 w-full justify-start gap-2 rounded-md px-3 py-2 text-left text-sm font-normal",
        isSelected ? "bg-accent text-secondary-foreground" : "",
      )}
      onClick={() => onSelect(ROOT_FOLDER_PATH)}
    >
      <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate" title={node.name}>
        {node.name}
      </span>
      <span className="text-xs font-semibold text-muted-foreground">{count}</span>
      {hasChildren ? (
        <span
          className="flex h-4 w-4 shrink-0 items-center justify-center"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(ROOT_FOLDER_PATH);
          }}
          role="presentation"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </span>
      ) : null}
    </Button>
  );
}

function findNode(tree: FolderNode | null, path: string): FolderNode | null {
  if (!tree) return null;
  if (tree.path === path) return tree;
  for (const child of tree.children) {
    const found = findNode(child, path);
    if (found) return found;
  }
  return null;
}

interface FolderTreeProps {
  scrollElement: HTMLElement | null;
  onFolderSelect: (path: string) => void;
}

export function FolderTree({ scrollElement, onFolderSelect }: FolderTreeProps) {
  const t = useT();
  const folderTree = useProjectStore((s) => s.folderTree);
  const selectedFolderPath = useProjectStore((s) => s.selectedFolderPath);
  const showChangedOnly = useProjectStore((s) => s.showChangedOnly);
  const committable = useProjectStore((s) => s.committable);
  const expandedPaths = useProjectStore((s) => s.expandedPaths);
  const toggleExpanded = useProjectStore((s) => s.toggleExpanded);
  const mergeFolderChildren = useProjectStore((s) => s.mergeFolderChildren);
  const treeLoading = useProjectStore((s) => s.treeLoading);

  const allFilesCount = useMemo(() => {
    if (!folderTree) return 0;
    return showChangedOnly ? committable.length : folderTree.item_count;
  }, [folderTree, showChangedOnly, committable]);

  const rootCount = useMemo(() => {
    if (!folderTree) return 0;
    return showChangedOnly
      ? committable.length
      : folderTree.item_count;
  }, [folderTree, showChangedOnly, committable]);

  const rootExpanded = !!expandedPaths[ROOT_FOLDER_PATH];

  const showRoot = useMemo(() => {
    if (!folderTree) return false;
    if (!showChangedOnly) return true;
    return folderHasCommittable(ROOT_FOLDER_PATH, committable);
  }, [folderTree, showChangedOnly, committable]);

  const flatRows = useMemo(() => {
    if (!folderTree || !rootExpanded) return [];
    return flattenVisibleFolderTree(
      folderTree.children,
      expandedPaths,
      1,
      showChangedOnly,
      committable,
    );
  }, [folderTree, expandedPaths, rootExpanded, showChangedOnly, committable]);

  const rowVirtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => FOLDER_ROW_HEIGHT,
    overscan: 8,
    gap: 2,
  });

  const onToggle = async (path: string) => {
    const wasExpanded = !!useProjectStore.getState().expandedPaths[path];
    toggleExpanded(path);
    if (!wasExpanded) {
      const store = useProjectStore.getState();
      const existing = findNode(store.folderTree, path);
      if (existing && existing.children.length === 0) {
        const subtree = await fetchWorkdirTree(path, 1);
        mergeFolderChildren(path, subtree.children);
      }
    }
  };

  if (treeLoading && !folderTree) {
    return <p className="p-4 text-sm text-muted-foreground">{t("folder.loading")}</p>;
  }

  if (!folderTree) {
    return <p className="p-4 text-sm text-muted-foreground">{t("folder.noFolders")}</p>;
  }

  const virtualRows = rowVirtualizer.getVirtualItems();

  return (
    <div className="flex flex-col gap-2 p-2">
      <Button
        type="button"
        variant="ghost"
        className={cn(
          "h-9 w-full justify-start gap-2 rounded-md px-3 py-2 text-left text-sm font-medium",
          isAllFilesPath(selectedFolderPath) ? "bg-sidebar text-secondary-foreground" : "",
        )}
        onClick={() => onFolderSelect(ALL_FILES_PATH)}
      >
        <Folder className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1 truncate">{t("sidebar.allFiles")}</span>
        <span className="text-xs font-semibold text-muted-foreground">{allFilesCount}</span>
      </Button>

      <Separator />

      {showRoot ? (
        <RootFolderRow
          node={folderTree}
          count={rootCount}
          selectedPath={selectedFolderPath}
          expanded={rootExpanded}
          onSelect={onFolderSelect}
          onToggle={(path) => void onToggle(path)}
        />
      ) : null}

      {rootExpanded && flatRows.length > 0 ? (
        <div
          className="relative w-full"
          style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        >
          {virtualRows.map((virtualRow) => {
            const row = flatRows[virtualRow.index];
            if (!row) return null;

            return (
              <div
                key={virtualRow.key}
                className="absolute left-0 top-0 w-full"
                style={{ transform: `translateY(${virtualRow.start}px)` }}
              >
                <FolderTreeRow
                  node={row.node}
                  depth={row.depth}
                  selectedPath={selectedFolderPath}
                  expanded={!!expandedPaths[row.node.path]}
                  onSelect={onFolderSelect}
                  onToggle={(path) => void onToggle(path)}
                />
              </div>
            );
          })}
        </div>
      ) : rootExpanded ? (
        <p className="px-2 py-1 text-xs text-muted-foreground">
          {showChangedOnly ? t("folder.noChangedFolders") : t("folder.noSubfolders")}
        </p>
      ) : null}
    </div>
  );
}
