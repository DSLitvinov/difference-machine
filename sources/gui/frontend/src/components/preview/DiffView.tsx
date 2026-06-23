import { FileImage, FileX, FileWarning } from "lucide-react";

import { classifyHistoryDiff } from "@/lib/fileKinds";
import { TextDiffPanel } from "@/components/preview/TextDiffPanel";
import type { DiffFileEntry } from "@/wails/forester";

interface DiffViewProps {
  file: DiffFileEntry | null;
  diffContent: string;
  isBinary: boolean;
  loading: boolean;
  error: string | null;
}

function DeletedDiffStub({ path }: { path: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
      <FileX className="h-12 w-12 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">File was deleted</p>
      <p className="max-w-full truncate font-mono text-sm text-muted-foreground">{path}</p>
      <p className="text-sm text-muted-foreground">This file no longer exists in this commit</p>
    </div>
  );
}

function BinaryDiffStub({ path }: { path: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
      <FileWarning className="h-12 w-12 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">This binary file cannot be displayed</p>
      <p className="max-w-full truncate font-mono text-sm text-muted-foreground">{path}</p>
      <p className="text-sm text-muted-foreground">Open in external application to view</p>
    </div>
  );
}

function ImageDiffStub({ path }: { path: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
      <FileImage className="h-12 w-12 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">Image preview</p>
      <p className="max-w-full truncate font-mono text-sm text-muted-foreground">{path}</p>
      <p className="text-sm text-muted-foreground">Image diff panel — coming soon</p>
    </div>
  );
}

export function DiffView({ file, diffContent, isBinary, loading, error }: DiffViewProps) {
  if (!file) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Select a changed file to view the diff
      </div>
    );
  }

  const kind = classifyHistoryDiff(file.status, file.path, isBinary);
  switch (kind) {
    case "deleted":
      return <DeletedDiffStub path={file.path} />;
    case "binary":
      return <BinaryDiffStub path={file.path} />;
    case "image":
      return <ImageDiffStub path={file.path} />;
    default:
      return <TextDiffPanel content={diffContent} loading={loading} error={error} />;
  }
}
