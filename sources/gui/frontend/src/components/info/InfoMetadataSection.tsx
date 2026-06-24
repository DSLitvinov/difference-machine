import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

import { formatFileSize, formatTimestamp } from "@/lib/format";
import { fileExtension } from "@/lib/fileKinds";

export interface FileMetadata {
  path: string;
  size: number;
  extension: string;
  mime?: string;
  modifiedAt: number;
  createdAt?: number;
  width?: number;
  height?: number;
  lockedBy?: string;
  editor?: string;
  creator?: string;
}

interface InfoMetadataSectionProps {
  metadata: FileMetadata | null;
  loading?: boolean;
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex w-full gap-2 text-sm">
      <span className="w-[120px] shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 break-all">{value}</span>
    </div>
  );
}

function formatDimensions(width: number, height: number): string {
  return `${width} × ${height}`;
}

export function InfoMetadataSection({ metadata, loading }: InfoMetadataSectionProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <section className="border-t border-border pt-3">
      <Button
        type="button"
        variant="ghost"
        className="mb-2 h-auto w-full justify-between px-0 py-0 text-sm font-semibold hover:bg-transparent"
        onClick={() => setCollapsed((v) => !v)}
      >
        <span>Metadata</span>
        {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </Button>
      {!collapsed ? (
        <div className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : metadata ? (
            <>
              {metadata.lockedBy ? <MetadataRow label="Locked" value={metadata.lockedBy} /> : null}
              {metadata.editor ? <MetadataRow label="Editor" value={metadata.editor} /> : null}
              <MetadataRow label="Modified" value={formatTimestamp(metadata.modifiedAt)} />
              {metadata.width != null && metadata.height != null ? (
                <MetadataRow
                  label="Dimensions"
                  value={formatDimensions(metadata.width, metadata.height)}
                />
              ) : null}
              <MetadataRow label="Size" value={formatFileSize(metadata.size)} />
              <MetadataRow
                label="Type"
                value={metadata.extension || metadata.mime || "unknown"}
              />
              {metadata.creator ? <MetadataRow label="Creator" value={metadata.creator} /> : null}
              {metadata.createdAt != null ? (
                <MetadataRow label="Created" value={formatTimestamp(metadata.createdAt)} />
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No metadata</p>
          )}
        </div>
      ) : null}
    </section>
  );
}

export function metadataFromWorkdir(
  path: string,
  raw: {
    size: number;
    modified: number;
    mime: string;
    created?: number;
    width?: number;
    height?: number;
  },
  options?: { lockedBy?: string; editor?: string; creator?: string },
): FileMetadata {
  return {
    path,
    size: raw.size,
    extension: fileExtension(path),
    mime: raw.mime,
    modifiedAt: raw.modified,
    createdAt: raw.created,
    width: raw.width,
    height: raw.height,
    lockedBy: options?.lockedBy,
    editor: options?.editor,
    creator: options?.creator,
  };
}
