import { useState } from "react";
import { FileQuestion, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { fileExtension } from "@/lib/fileKinds";

interface BinaryDiffStubProps {
  path: string;
  screenshotUrl?: string | null;
  screenshotLoading?: boolean;
  onOpen: () => Promise<void>;
}

export function BinaryDiffStub({
  path,
  screenshotUrl,
  screenshotLoading,
  onOpen,
}: BinaryDiffStubProps) {
  const [opening, setOpening] = useState(false);
  const [imageBroken, setImageBroken] = useState(false);
  const showBlendPreview =
    fileExtension(path) === "blend" && screenshotUrl && !screenshotLoading && !imageBroken;

  const handleOpen = async () => {
    setOpening(true);
    try {
      await onOpen();
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
      {screenshotLoading ? (
        <div className="h-[240px] w-full max-w-[320px] animate-pulse rounded-md border border-border bg-muted/30" />
      ) : showBlendPreview ? (
        <img
          src={screenshotUrl}
          alt=""
          draggable={false}
          className="max-h-[240px] w-full max-w-[320px] rounded-md border border-border bg-muted/30 object-contain"
          onError={() => setImageBroken(true)}
        />
      ) : (
        <FileQuestion className="h-12 w-12 text-muted-foreground" />
      )}
      <p className="text-sm font-medium text-foreground">This binary file cannot be displayed</p>
      <p className="text-sm text-muted-foreground">Open in external application to view</p>
      <Button type="button" disabled={opening} onClick={() => void handleOpen()}>
        {opening ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Open in external application
      </Button>
    </div>
  );
}
