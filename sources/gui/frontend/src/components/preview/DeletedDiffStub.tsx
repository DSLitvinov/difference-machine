import { FileX } from "lucide-react";

interface DeletedDiffStubProps {
  path: string;
}

export function DeletedDiffStub({ path }: DeletedDiffStubProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
      <FileX className="h-12 w-12 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">File was deleted</p>
      <p className="max-w-full truncate font-mono text-sm text-muted-foreground">{path}</p>
      <p className="text-sm text-muted-foreground">This file no longer exists in this commit</p>
    </div>
  );
}
