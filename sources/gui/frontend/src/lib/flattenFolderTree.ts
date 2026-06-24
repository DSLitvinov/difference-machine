import type { FolderNode } from "@/wails/forester";
import { folderHasCommittable } from "@/wails/forester";

export interface FlatFolderRow {
  node: FolderNode;
  depth: number;
}

export function flattenVisibleFolderTree(
  children: FolderNode[],
  expandedPaths: Record<string, boolean>,
  depth: number,
  showChangedOnly: boolean,
  committable: string[],
): FlatFolderRow[] {
  const rows: FlatFolderRow[] = [];

  for (const child of children) {
    if (showChangedOnly && !folderHasCommittable(child.path, committable)) {
      continue;
    }
    rows.push({ node: child, depth });
    if (expandedPaths[child.path] && child.children.length > 0) {
      rows.push(
        ...flattenVisibleFolderTree(
          child.children,
          expandedPaths,
          depth + 1,
          showChangedOnly,
          committable,
        ),
      );
    }
  }

  return rows;
}

export function collectFolderPaths(node: FolderNode): string[] {
  const paths: string[] = [];
  if (node.path !== "") {
    paths.push(node.path);
  }
  for (const child of node.children) {
    paths.push(...collectFolderPaths(child));
  }
  return paths;
}
