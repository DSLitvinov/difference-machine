import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";

import { FilePreviewItem } from "@/components/preview/FilePreviewItem";
import { FolderPreviewItem } from "@/components/preview/FolderPreviewItem";
import { PreviewToolbar, sortByName } from "@/components/preview/PreviewToolbar";
import { useAppStore } from "@/stores/appStore";
import { useProjectStore } from "@/stores/projectStore";
import {
  fetchStatus,
  fetchWorkdirEntries,
  fetchWorkdirTree,
  openWorkdirFile,
  vcsFileStatus,
  type DirEntry,
} from "@/wails/forester";

function filesForPreview(folderPath: string, committable: string[]): string[] {
  return committable.filter((filePath) => {
    if (folderPath === "") {
      return !filePath.includes("/");
    }
    return (
      filePath.startsWith(`${folderPath}/`) &&
      !filePath.slice(folderPath.length + 1).includes("/")
    );
  });
}

function breadcrumbSegments(folderPath: string): { label: string; path: string }[] {
  if (folderPath === "") {
    return [{ label: "root", path: "" }];
  }
  const parts = folderPath.split("/");
  const segments: { label: string; path: string }[] = [{ label: "root", path: "" }];
  let acc = "";
  for (const part of parts) {
    acc = acc ? `${acc}/${part}` : part;
    segments.push({ label: part, path: acc });
  }
  return segments;
}

export async function loadProjectData() {
  const store = useProjectStore.getState();
  const repoPath = useAppStore.getState().repoPath;
  if (repoPath) {
    store.restoreRepoPrefs(repoPath);
  }
  store.setTreeLoading(true);
  try {
    const [tree, status] = await Promise.all([fetchWorkdirTree("", 1), fetchStatus()]);
    store.setFolderTree(tree);
    store.setStatus(status);
    useAppStore.getState().setForesterError(null);
  } catch (err) {
    useAppStore.getState().setForesterError(err instanceof Error ? err.message : String(err));
    throw err;
  } finally {
    store.setTreeLoading(false);
  }
}

export function ProjectPreviewPanel() {
  const repoPath = useAppStore((s) => s.repoPath);
  const setError = useAppStore((s) => s.setError);
  const selectedFolderPath = useProjectStore((s) => s.selectedFolderPath);
  const selectedFilePath = useProjectStore((s) => s.selectedFilePath);
  const setSelectedFolderPath = useProjectStore((s) => s.setSelectedFolderPath);
  const setSelectedFilePath = useProjectStore((s) => s.setSelectedFilePath);
  const showChangedOnly = useProjectStore((s) => s.showChangedOnly);
  const committable = useProjectStore((s) => s.committable);
  const status = useProjectStore((s) => s.status);
  const sortLocale = useProjectStore((s) => s.sortLocale);
  const setSortLocale = useProjectStore((s) => s.setSortLocale);

  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [subfolders, setSubfolders] = useState<DirEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!repoPath) {
      setEntries([]);
      setSubfolders([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        if (showChangedOnly) {
          const paths = filesForPreview(selectedFolderPath, committable);
          const synthetic: DirEntry[] = paths.map((path) => ({
            name: path.split("/").pop() ?? path,
            path,
            is_dir: false,
            item_count: 0,
            size: 0,
          }));
          if (!cancelled) {
            setEntries(synthetic);
            setSubfolders([]);
          }
        } else {
          const result = await fetchWorkdirEntries(selectedFolderPath, 0, 200);
          if (!cancelled) {
            setEntries(result.entries.filter((e) => !e.is_dir));
            setSubfolders(result.entries.filter((e) => e.is_dir));
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [repoPath, selectedFolderPath, showChangedOnly, committable]);

  const openFolder = (path: string) => {
    setSelectedFolderPath(path);
  };

  const openFile = async (path: string) => {
    try {
      setError(null);
      await openWorkdirFile(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  if (!repoPath) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Select a repository from the sidebar
      </div>
    );
  }

  const crumbs = breadcrumbSegments(selectedFolderPath);
  const sortedSubfolders = sortByName(subfolders, sortLocale);
  const sortedEntries = sortByName(entries, sortLocale);

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border px-4 py-3">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            {crumbs.map((segment, index) => (
              <span key={segment.path || "root"} className="flex items-center gap-1">
                {index > 0 ? <ChevronRight className="h-3 w-3" /> : null}
                <button
                  type="button"
                  className="hover:text-foreground"
                  onClick={() => openFolder(segment.path)}
                >
                  {segment.label}
                </button>
              </span>
            ))}
            {showChangedOnly ? <span className="ml-2 text-xs">· changed only</span> : null}
          </nav>
          <PreviewToolbar sortLocale={sortLocale} onSortLocaleChange={setSortLocale} />
        </div>
      </header>
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            {!showChangedOnly && subfolders.length > 0 ? (
              <div className="mb-6">
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Folders</p>
                <ul className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">
                  {sortedSubfolders.map((entry) => (
                    <li key={entry.path}>
                      <FolderPreviewItem
                        name={entry.name}
                        onOpen={() => openFolder(entry.path)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {sortedEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {showChangedOnly ? "No changed files here" : "No files in this folder"}
              </p>
            ) : (
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
                {sortedEntries.map((entry) => (
                  <li key={entry.path}>
                    <FilePreviewItem
                      name={entry.name}
                      path={entry.path}
                      selected={selectedFilePath === entry.path}
                      vcsStatus={vcsFileStatus(entry.path, status)}
                      onSelect={() => setSelectedFilePath(entry.path)}
                      onOpen={() => void openFile(entry.path)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
