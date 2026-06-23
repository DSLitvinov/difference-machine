import { ChevronDown, ChevronRight, Folder } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/stores/projectStore";
import type { FolderNode } from "@/wails/forester";
import { fetchWorkdirTree, folderHasCommittable } from "@/wails/forester";

interface FolderTreeRowProps {
  node: FolderNode;
  depth: number;
  selectedPath: string;
  expanded: boolean;
  showChangedOnly: boolean;
  committable: string[];
  onSelect: (path: string) => void;
  onToggle: (path: string) => void;
}

export function FolderTreeRow({
  node,
  depth,
  selectedPath,
  expanded,
  showChangedOnly,
  committable,
  onSelect,
  onToggle,
}: FolderTreeRowProps) {
  const isSelected = selectedPath === node.path;
  const hasChildren = node.children.length > 0 || node.item_count > 0;

  if (showChangedOnly && !folderHasCommittable(node.path, committable)) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className={cn(
          "h-auto w-full justify-start gap-1 rounded-md px-2 py-1.5 text-left text-sm font-normal",
          isSelected ? "bg-accent text-secondary-foreground" : "",
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
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
        <span className="min-w-0 flex-1 truncate">{node.name}</span>
        <span className="text-xs font-semibold text-muted-foreground">{node.item_count}</span>
      </Button>
      {expanded
        ? node.children.map((child) => (
            <FolderTreeBranch
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              showChangedOnly={showChangedOnly}
              committable={committable}
              onSelect={onSelect}
            />
          ))
        : null}
    </>
  );
}

function FolderTreeBranch({
  node,
  depth,
  selectedPath,
  showChangedOnly,
  committable,
  onSelect,
}: {
  node: FolderNode;
  depth: number;
  selectedPath: string;
  showChangedOnly: boolean;
  committable: string[];
  onSelect: (path: string) => void;
}) {
  const expandedPaths = useProjectStore((s) => s.expandedPaths);
  const toggleExpanded = useProjectStore((s) => s.toggleExpanded);
  const mergeFolderChildren = useProjectStore((s) => s.mergeFolderChildren);
  const expanded = !!expandedPaths[node.path];

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

  return (
    <FolderTreeRow
      node={node}
      depth={depth}
      selectedPath={selectedPath}
      expanded={expanded}
      showChangedOnly={showChangedOnly}
      committable={committable}
      onSelect={onSelect}
      onToggle={(path) => void onToggle(path)}
    />
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
  onFolderSelect: (path: string) => void;
}

export function FolderTree({ onFolderSelect }: FolderTreeProps) {
  const folderTree = useProjectStore((s) => s.folderTree);
  const selectedFolderPath = useProjectStore((s) => s.selectedFolderPath);
  const showChangedOnly = useProjectStore((s) => s.showChangedOnly);
  const committable = useProjectStore((s) => s.committable);
  const treeLoading = useProjectStore((s) => s.treeLoading);
  const setSelectedFolderPath = useProjectStore((s) => s.setSelectedFolderPath);

  const handleSelect = (path: string) => {
    setSelectedFolderPath(path);
    onFolderSelect(path);
  };

  if (treeLoading && !folderTree) {
    return <p className="p-4 text-sm text-muted-foreground">Loading folders…</p>;
  }

  if (!folderTree) {
    return <p className="p-4 text-sm text-muted-foreground">No folders</p>;
  }

  const rootVisible =
    !showChangedOnly || folderHasCommittable("", committable) || folderTree.children.length > 0;

  return (
    <div className="flex flex-col gap-0.5 p-2">
      {rootVisible ? (
        <Button
          type="button"
          variant="ghost"
          className={cn(
            "h-auto w-full justify-start gap-2 rounded-md px-2 py-1.5 text-left text-sm font-normal",
            selectedFolderPath === "" ? "bg-accent" : "",
          )}
          onClick={() => handleSelect("")}
        >
          <Folder className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1 truncate">{folderTree.name}</span>
          <span className="text-xs font-semibold text-muted-foreground">{folderTree.item_count}</span>
        </Button>
      ) : null}
      {folderTree.children.map((child) => (
        <FolderTreeBranch
          key={child.path}
          node={child}
          depth={0}
          selectedPath={selectedFolderPath}
          showChangedOnly={showChangedOnly}
          committable={committable}
          onSelect={handleSelect}
        />
      ))}
    </div>
  );
}
