import { useState, type MouseEvent } from "react";
import { Copy, ExternalLink, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { diffStatusBadgeClass } from "@/lib/vcsBadge";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/appStore";
import type { DiffFileEntry } from "@/wails/forester";

const STATUS_LABELS: Record<DiffFileEntry["status"], string> = {
  A: "Added",
  M: "Modified",
  D: "Deleted",
  R: "Renamed",
};

function formatChangedFilePath(file: DiffFileEntry): string {
  if (file.status === "R" && file.old_path) {
    return `${file.old_path} → ${file.path}`;
  }
  return file.path;
}

interface ChangedFileItemProps {
  file: DiffFileEntry;
  selected: boolean;
  onSelect: () => void;
  onContextMenu: (event: MouseEvent<HTMLButtonElement>, file: DiffFileEntry) => void;
}

export function ChangedFileItem({ file, selected, onSelect, onContextMenu }: ChangedFileItemProps) {
  const displayPath = formatChangedFilePath(file);

  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        "h-auto w-full justify-start gap-2 rounded-none px-3 py-2 text-left text-sm font-normal",
        selected ? "bg-accent" : "",
      )}
      title={displayPath}
      onClick={onSelect}
      onContextMenu={(event) => onContextMenu(event, file)}
    >
      <span
        className={cn(
          "flex h-5 min-w-[20px] items-center justify-center rounded px-1 text-xs font-semibold",
          diffStatusBadgeClass(file.status),
        )}
      >
        {file.status}
      </span>
      <span className="min-w-0 flex-1 truncate">{displayPath}</span>
    </Button>
  );
}

interface ChangedFilesListProps {
  files: DiffFileEntry[];
  selectedPath: string | null;
  loading: boolean;
  width: number;
  onSelect: (path: string) => void;
  onOpenFile?: (path: string) => void | Promise<void>;
}

export function ChangedFilesList({
  files,
  selectedPath,
  loading,
  width,
  onSelect,
  onOpenFile,
}: ChangedFilesListProps) {
  const setNotice = useAppStore((s) => s.setNotice);
  const setError = useAppStore((s) => s.setError);
  const [contextMenu, setContextMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
    file: DiffFileEntry | null;
  }>({ open: false, x: 0, y: 0, file: null });

  const menuFile = contextMenu.file;
  const menuDisplayPath = menuFile ? formatChangedFilePath(menuFile) : "";
  const menuFileName = menuFile?.path.split("/").filter(Boolean).pop() ?? menuFile?.path ?? "";

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(`${label} copied`);
    } catch {
      setError("Failed to copy to clipboard");
    }
  };

  const closeContextMenu = () => {
    setContextMenu((state) => ({ ...state, open: false, file: null }));
  };

  const handleContextMenu = (event: MouseEvent<HTMLButtonElement>, file: DiffFileEntry) => {
    event.preventDefault();
    onSelect(file.path);
    setContextMenu({
      open: true,
      x: event.clientX,
      y: event.clientY,
      file,
    });
  };

  const handleOpenFile = async () => {
    if (!menuFile || !onOpenFile || menuFile.status === "D") return;
    closeContextMenu();
    await onOpenFile(menuFile.path);
  };

  return (
    <div
      className="flex h-full min-h-0 shrink-0 flex-col border-r border-border bg-background"
      style={{ width, minWidth: width, maxWidth: width }}
    >
      <div className="shrink-0 bg-accent px-3 py-2 text-sm font-medium text-foreground">
        {loading ? "Loading…" : `${files.length} files changed`}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-2 p-3">
            <div className="h-8 animate-pulse rounded bg-muted" />
            <div className="h-8 animate-pulse rounded bg-muted" />
          </div>
        ) : files.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No files changed in this commit</p>
        ) : (
          files.map((file) => (
            <ChangedFileItem
              key={`${file.status}:${file.path}:${file.old_path ?? ""}`}
              file={file}
              selected={selectedPath === file.path}
              onSelect={() => onSelect(file.path)}
              onContextMenu={handleContextMenu}
            />
          ))
        )}
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
            onClick={() => {
              if (menuFile) onSelect(menuFile.path);
              closeContextMenu();
            }}
          >
            <FileText className="h-3.5 w-3.5" />
            Show diff
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2"
            disabled={!menuFile || menuFile.status === "D" || !onOpenFile}
            onClick={() => void handleOpenFile()}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open from commit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2"
            disabled={!menuFile}
            onClick={() => {
              if (menuFile) void copyText(menuFile.path, "Path");
              closeContextMenu();
            }}
          >
            <Copy className="h-3.5 w-3.5" />
            Copy path
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2"
            disabled={!menuFile || !menuFileName}
            onClick={() => {
              if (menuFileName) void copyText(menuFileName, "File name");
              closeContextMenu();
            }}
          >
            <Copy className="h-3.5 w-3.5" />
            Copy file name
          </DropdownMenuItem>
          {menuFile?.old_path ? (
            <DropdownMenuItem
              className="gap-2"
              onClick={() => {
                if (menuFile.old_path) void copyText(menuFile.old_path, "Previous path");
                closeContextMenu();
              }}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy previous path
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            className="gap-2"
            disabled={!menuFile}
            onClick={() => {
              if (menuFile) void copyText(STATUS_LABELS[menuFile.status], "Status");
              closeContextMenu();
            }}
          >
            <Copy className="h-3.5 w-3.5" />
            Copy status
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <div className="max-w-[18rem] truncate px-2 py-1.5 text-xs text-muted-foreground" title={menuDisplayPath}>
            {menuDisplayPath}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
