import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { formatFileSize, formatTimestamp } from "@/lib/format";
import { fileExtension } from "@/lib/fileKinds";

export interface FileMetadata {
  path: string;
  size: number;
  extension: string;
  mime?: string;
  modifiedAt: number;
  lockedBy?: string;
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

export function InfoMetadataSection({ metadata, loading }: InfoMetadataSectionProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <section className="border-t border-border pt-3">
      <button
        type="button"
        className="mb-2 flex w-full items-center justify-between text-sm font-semibold"
        onClick={() => setCollapsed((v) => !v)}
      >
        <span>Metadata</span>
        {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </button>
      {!collapsed ? (
        <div className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : metadata ? (
            <>
              {metadata.lockedBy ? <MetadataRow label="Locked" value={metadata.lockedBy} /> : null}
              <MetadataRow label="Modified" value={formatTimestamp(metadata.modifiedAt)} />
              <MetadataRow label="Size" value={formatFileSize(metadata.size)} />
              <MetadataRow
                label="Type"
                value={metadata.extension || metadata.mime || "unknown"}
              />
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
  raw: { size: number; modified: number; mime: string },
  lockedBy?: string,
): FileMetadata {
  return {
    path,
    size: raw.size,
    extension: fileExtension(path),
    mime: raw.mime,
    modifiedAt: raw.modified,
    lockedBy,
  };
}
