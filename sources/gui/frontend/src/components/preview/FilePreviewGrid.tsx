import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Copy, Pencil, Settings, Trash2 } from "lucide-react";

import { FilePreviewItem } from "@/components/preview/FilePreviewItem";
import { RenameFileDialog } from "@/components/preview/RenameFileDialog";
import { ConfirmAlertDialog } from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMarqueeSelection } from "@/hooks/useMarqueeSelection";
import {
  computeColumnCount,
  estimateGridRowHeight,
  gridMinCellSizeForScale,
} from "@/lib/previewGrid";
import { useT } from "@/lib/i18n";
import { useAppStore } from "@/stores/appStore";
import { useProjectStore } from "@/stores/projectStore";
import {
  deleteWorkdirFile,
  fetchStatus,
  openWorkdirFile,
  renameWorkdirFile,
  type DirEntry,
  type VcsFileStatus,
} from "@/wails/forester";

interface FilePreviewGridProps {
  files: DirEntry[];
  orderedPaths: string[];
  thumbScale: number;
  scrollElement: HTMLElement | null;
  vcsStatusFor: (path: string) => VcsFileStatus | null;
  lockUserFor?: (path: string) => string | null;
  subtitleFor?: (entry: DirEntry) => string | undefined;
  onOpen: (path: string) => void;
  onNearEnd?: () => void;
}

function editorLabel(path: string): string {
  const base = path.split(/[/\\]/).filter(Boolean).pop() ?? path;
  return base.replace(/\.(exe|app)$/i, "");
}

function isFileActionBlocked(vcsStatus: VcsFileStatus | null, lockUser: string | null): boolean {
  if (lockUser) return true;
  return vcsStatus === "deleted" || vcsStatus === "staged-deleted";
}

export function FilePreviewGrid({
  files,
  orderedPaths,
  thumbScale,
  scrollElement,
  vcsStatusFor,
  lockUserFor,
  subtitleFor,
  onOpen,
  onNearEnd,
}: FilePreviewGridProps) {
  const t = useT();
  const setError = useAppStore((s) => s.setError);
  const setNotice = useAppStore((s) => s.setNotice);
  const externalEditorPaths = useAppStore((s) => s.externalEditorPaths);
  const selectedFilePaths = useProjectStore((s) => s.selectedFilePaths);
  const selectFile = useProjectStore((s) => s.selectFile);
  const selectFilePaths = useProjectStore((s) => s.selectFilePaths);
  const setSelectedFilePaths = useProjectStore((s) => s.setSelectedFilePaths);
  const bumpWorkdirGeneration = useProjectStore((s) => s.bumpWorkdirGeneration);
  const setStatus = useProjectStore((s) => s.setStatus);

  const cellMin = gridMinCellSizeForScale(thumbScale);
  const hasSubtitle = Boolean(subtitleFor);
  const rowHeight = estimateGridRowHeight(thumbScale, hasSubtitle);

  const [columnCount, setColumnCount] = useState(1);
  const [gridWidth, setGridWidth] = useState(0);
  const [contextMenu, setContextMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
    entry: DirEntry | null;
  }>({ open: false, x: 0, y: 0, entry: null });
  const [renameTarget, setRenameTarget] = useState<DirEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DirEntry | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const handleMarqueeSelect = useCallback(
    (paths: string[], additive: boolean) => {
      selectFilePaths(paths, { additive });
    },
    [selectFilePaths],
  );

  const { containerRef, marquee, onMouseDown } = useMarqueeSelection({
    orderedPaths,
    onSelect: handleMarqueeSelect,
    onClear: () => useProjectStore.getState().clearFileSelection(),
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const width = el.clientWidth;
      setGridWidth(width);
      setColumnCount(computeColumnCount(width, cellMin));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [cellMin, containerRef]);

  const rowCount = Math.max(1, Math.ceil(files.length / columnCount));

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollElement,
    estimateSize: () => rowHeight,
    overscan: 3,
    gap: 8,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const nearEndRequestedRef = useRef(false);

  useEffect(() => {
    nearEndRequestedRef.current = false;
  }, [files.length]);

  useEffect(() => {
    if (!onNearEnd || files.length === 0) return;
    const last = virtualRows[virtualRows.length - 1];
    if (last && last.index >= rowCount - 2) {
      if (!nearEndRequestedRef.current) {
        nearEndRequestedRef.current = true;
        onNearEnd();
      }
    }
  }, [virtualRows, rowCount, onNearEnd, files.length]);

  const handleFileSelect = (path: string, event: MouseEvent<HTMLButtonElement>) => {
    const additive = event.metaKey || event.ctrlKey;
    const range = event.shiftKey;
    selectFile(path, orderedPaths, { additive, range });
  };

  const menuEntry = contextMenu.entry;
  const menuVcsStatus = menuEntry ? vcsStatusFor(menuEntry.path) : null;
  const menuLockUser = menuEntry ? (lockUserFor?.(menuEntry.path) ?? null) : null;
  const menuBlocked = isFileActionBlocked(menuVcsStatus, menuLockUser);

  const refreshAfterFileChange = async (previousPath: string, nextPath?: string) => {
    bumpWorkdirGeneration();
    try {
      const status = await fetchStatus();
      setStatus(status);
    } catch {
      // status refresh is best-effort
    }
    if (nextPath) {
      setSelectedFilePaths(
        selectedFilePaths.map((path) => (path === previousPath ? nextPath : path)),
      );
    } else {
      setSelectedFilePaths(selectedFilePaths.filter((path) => path !== previousPath));
    }
  };

  const closeContextMenu = () => {
    setContextMenu((state) => ({ ...state, open: false, entry: null }));
  };

  const copyPath = async (path: string) => {
    try {
      await navigator.clipboard.writeText(path);
      setNotice(t("preview.pathCopied"));
    } catch {
      setError(t("common.copyFailed"));
    }
  };

  const handleContextMenu = (event: MouseEvent<HTMLButtonElement>, entry: DirEntry) => {
    event.preventDefault();
    selectFile(entry.path, orderedPaths, { additive: false, range: false });
    setContextMenu({
      open: true,
      x: event.clientX,
      y: event.clientY,
      entry,
    });
  };

  const handleRenameSave = async (newName: string) => {
    if (!renameTarget) return;
    setActionLoading(true);
    try {
      const newPath = await renameWorkdirFile(renameTarget.path, newName);
      setNotice(t("preview.fileRenamed"));
      setRenameTarget(null);
      await refreshAfterFileChange(renameTarget.path, newPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await deleteWorkdirFile(deleteTarget.path);
      setNotice(t("preview.fileRemoved"));
      const path = deleteTarget.path;
      setDeleteTarget(null);
      await refreshAfterFileChange(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenInEditor = async (editorPath: string) => {
    if (!menuEntry) return;
    closeContextMenu();
    try {
      await openWorkdirFile(menuEntry.path, editorPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const editorMenuItems = useMemo(
    () => externalEditorPaths.map((path) => ({ path, label: editorLabel(path) })),
    [externalEditorPaths],
  );

  if (files.length === 0) {
    return null;
  }

  return (
    <>
      <div ref={containerRef} className="relative select-none" onMouseDown={onMouseDown}>
        <div className="relative w-full" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
          {virtualRows.map((virtualRow) => {
            const startIndex = virtualRow.index * columnCount;
            const rowFiles = files.slice(startIndex, startIndex + columnCount);

            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                className="absolute left-0 top-0 grid w-full gap-2"
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                  gridTemplateColumns:
                    gridWidth > 0
                      ? `repeat(${columnCount}, minmax(0, 1fr))`
                      : `repeat(auto-fill, minmax(${cellMin}px, 1fr))`,
                }}
              >
                {rowFiles.map((entry) => (
                  <div key={entry.path} data-file-item data-file-path={entry.path}>
                    <FilePreviewItem
                      name={entry.name}
                      path={entry.path}
                      thumbScale={thumbScale}
                      subtitle={subtitleFor?.(entry)}
                      selected={selectedFilePaths.includes(entry.path)}
                      vcsStatus={vcsStatusFor(entry.path)}
                      lockUser={lockUserFor?.(entry.path) ?? null}
                      onSelect={(event) => handleFileSelect(entry.path, event)}
                      onOpen={() => onOpen(entry.path)}
                      onContextMenu={(event) => handleContextMenu(event, entry)}
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        {marquee ? (
          <div
            className="pointer-events-none fixed z-50 border border-ring bg-primary/10"
            style={{
              left: marquee.left,
              top: marquee.top,
              width: marquee.width,
              height: marquee.height,
            }}
          />
        ) : null}
      </div>

      <DropdownMenu
        open={contextMenu.open}
        onOpenChange={(open) => {
          if (!open) {
            closeContextMenu();
          } else {
            setContextMenu((state) => ({ ...state, open }));
          }
        }}
      >
        <DropdownMenuTrigger asChild>
          <span
            aria-hidden="true"
            className="fixed h-px w-px"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side="right"
          sideOffset={2}
          className="min-w-[13rem]"
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <DropdownMenuItem
            className="gap-2"
            disabled={!menuEntry}
            onClick={() => {
              if (menuEntry) void copyPath(menuEntry.path);
              closeContextMenu();
            }}
          >
            <Copy className="h-3.5 w-3.5" />
            {t("preview.copy")}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2"
            disabled={!menuEntry || menuBlocked}
            onClick={() => {
              if (menuEntry) {
                setRenameTarget(menuEntry);
              }
              closeContextMenu();
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
            {t("preview.rename")}
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger
              className="gap-2"
              disabled={!menuEntry || menuBlocked || editorMenuItems.length === 0}
            >
              <Settings className="h-3.5 w-3.5" />
              {t("preview.editIn")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="min-w-[12rem]">
              {editorMenuItems.map((editor) => (
                <DropdownMenuItem
                  key={editor.path}
                  onClick={() => void handleOpenInEditor(editor.path)}
                >
                  {editor.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2 text-destructive focus:text-destructive"
            disabled={!menuEntry || menuBlocked}
            onClick={() => {
              if (menuEntry) setDeleteTarget(menuEntry);
              closeContextMenu();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("preview.deleteFile")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RenameFileDialog
        open={renameTarget !== null}
        fileName={renameTarget?.name ?? ""}
        loading={actionLoading}
        onOpenChange={(open) => {
          if (!open && !actionLoading) setRenameTarget(null);
        }}
        onSave={handleRenameSave}
      />

      <ConfirmAlertDialog
        open={deleteTarget !== null}
        title={t("preview.deleteFileTitle", { name: deleteTarget?.name ?? "" })}
        description={t("preview.deleteFileDescription")}
        confirmLabel={t("preview.deleteFile")}
        loading={actionLoading}
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={() => {
          if (!actionLoading) setDeleteTarget(null);
        }}
      />
    </>
  );
}

export type { FilePreviewGridProps };
