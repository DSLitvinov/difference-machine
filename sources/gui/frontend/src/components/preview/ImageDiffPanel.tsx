import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { HistoryImageLayout } from "@/lib/storage";
import { cn } from "@/lib/utils";

interface ImageDiffPanelProps {
  beforeUrl?: string | null;
  afterUrl?: string | null;
  status: "A" | "M" | "D";
  layout: HistoryImageLayout;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

function Checkerboard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative h-full min-h-[240px] w-full bg-muted/50",
        "[background-image:linear-gradient(45deg,#e5e5e5_25%,transparent_25%),linear-gradient(-45deg,#e5e5e5_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e5e5e5_75%),linear-gradient(-45deg,transparent_75%,#e5e5e5_75%)]",
        "[background-size:16px_16px]",
        "[background-position:0_0,0_8px,8px_-8px,-8px_0px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function ImageDiffSplit({
  beforeUrl,
  afterUrl,
  status,
}: Pick<ImageDiffPanelProps, "beforeUrl" | "afterUrl" | "status">) {
  const [position, setPosition] = useState(50);
  const dragging = useRef(false);

  const onMouseDown = (event: React.MouseEvent) => {
    event.preventDefault();
    dragging.current = true;
    const container = (event.currentTarget as HTMLElement).parentElement;
    if (!container) return;

    const onMove = (moveEvent: MouseEvent) => {
      if (!dragging.current) return;
      const rect = container.getBoundingClientRect();
      const pct = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      setPosition(Math.min(100, Math.max(0, pct)));
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <Checkerboard className="h-full w-full">
      <div className="relative h-full w-full">
        <div className="absolute inset-0 flex h-full">
          <div className="relative h-full overflow-hidden" style={{ width: `${position}%` }}>
            <span className="absolute left-2 top-2 text-xs text-muted-foreground">Before</span>
            {beforeUrl ? (
              <img src={beforeUrl} alt="" className="h-full w-full object-contain" draggable={false} />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                {status === "A" ? "No previous version" : "No image"}
              </div>
            )}
          </div>
          <div
            className="relative h-full flex-1 overflow-hidden"
            style={{ width: `${100 - position}%` }}
          >
            <span className="absolute right-2 top-2 text-xs text-muted-foreground">After</span>
            {afterUrl ? (
              <img src={afterUrl} alt="" className="h-full w-full object-contain" draggable={false} />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                No image
              </div>
            )}
          </div>
        </div>
        <div
          className="absolute bottom-0 top-0 z-10 w-1 -translate-x-1/2 cursor-col-resize border-l border-ring bg-background/80"
          style={{ left: `${position}%` }}
          onMouseDown={onMouseDown}
        />
      </div>
    </Checkerboard>
  );
}

function ImageDiffOverlay({
  beforeUrl,
  afterUrl,
}: Pick<ImageDiffPanelProps, "beforeUrl" | "afterUrl">) {
  const [opacity, setOpacity] = useState(50);

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <Checkerboard className="relative min-h-0 flex-1">
        {beforeUrl ? (
          <img
            src={beforeUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-contain"
            draggable={false}
          />
        ) : null}
        {afterUrl ? (
          <img
            src={afterUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-contain"
            style={{ opacity: opacity / 100 }}
            draggable={false}
          />
        ) : null}
      </Checkerboard>
      <div className="flex shrink-0 items-center gap-3 border-t border-border px-4 py-2">
        <Label className="text-xs font-normal text-muted-foreground">Opacity</Label>
        <Slider
          min={0}
          max={100}
          step={1}
          value={[opacity]}
          className="flex-1"
          onValueChange={([value]) => setOpacity(value)}
        />
      </div>
    </div>
  );
}

export function ImageDiffPanel({
  beforeUrl,
  afterUrl,
  status,
  layout,
  loading,
  error,
  onRetry,
}: ImageDiffPanelProps) {
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-48 w-48 animate-pulse rounded-md bg-muted" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-destructive">Failed to load image</p>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col">
        {layout === "overlay" ? (
          <ImageDiffOverlay beforeUrl={beforeUrl} afterUrl={afterUrl} />
        ) : (
          <ImageDiffSplit beforeUrl={beforeUrl} afterUrl={afterUrl} status={status} />
        )}
      </div>
    </div>
  );
}
