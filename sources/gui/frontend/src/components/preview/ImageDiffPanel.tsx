import { forwardRef, useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useT } from "@/lib/i18n";
import type { HistoryImageLayout } from "@/lib/storage";
import { cn } from "@/lib/utils";

interface ImageDiffPanelProps {
  beforeUrl?: string | null;
  afterUrl?: string | null;
  status: "A" | "M" | "D" | "R";
  layout: HistoryImageLayout;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

const Checkerboard = forwardRef<
  HTMLDivElement,
  { children: React.ReactNode; className?: string; onMouseDown?: React.MouseEventHandler<HTMLDivElement> }
>(function Checkerboard({ children, className, onMouseDown }, ref) {
  return (
    <div
      ref={ref}
      onMouseDown={onMouseDown}
      className={cn(
        "relative h-full min-h-[240px] w-full overflow-hidden bg-muted/50",
        "[background-image:linear-gradient(45deg,#e5e5e5_25%,transparent_25%),linear-gradient(-45deg,#e5e5e5_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e5e5e5_75%),linear-gradient(-45deg,transparent_75%,#e5e5e5_75%)]",
        "[background-size:16px_16px]",
        "[background-position:0_0,0_8px,8px_-8px,-8px_0px]",
        className,
      )}
    >
      {children}
    </div>
  );
});

/** 2-up: before and after side by side (natural object-contain per panel). */
function ImageDiffTwoUp({
  beforeUrl,
  afterUrl,
  status,
}: Pick<ImageDiffPanelProps, "beforeUrl" | "afterUrl" | "status">) {
  const t = useT();
  return (
    <div className="flex h-full min-h-[240px] w-full divide-x divide-border">
      <Checkerboard className="flex min-h-0 min-w-0 flex-1 flex-col">
        <span className="shrink-0 px-2 py-1.5 text-xs text-muted-foreground">{t("preview.before")}</span>
        <div className="relative min-h-0 flex-1">
          {beforeUrl ? (
            <img src={beforeUrl} alt="" className="h-full w-full object-contain" draggable={false} />
          ) : (
            <div className="flex h-full items-center justify-center px-2 text-center text-xs text-muted-foreground">
              {status === "A" ? t("preview.noPreviousVersion") : t("preview.noImage")}
            </div>
          )}
        </div>
      </Checkerboard>
      <Checkerboard className="flex min-h-0 min-w-0 flex-1 flex-col">
        <span className="shrink-0 px-2 py-1.5 text-xs text-muted-foreground">{t("preview.after")}</span>
        <div className="relative min-h-0 flex-1">
          {afterUrl ? (
            <img src={afterUrl} alt="" className="h-full w-full object-contain" draggable={false} />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              {t("preview.noImage")}
            </div>
          )}
        </div>
      </Checkerboard>
    </div>
  );
}

/** Swipe: stacked images with a draggable divider (pixel-aligned before/after). */
function ImageDiffSwipe({
  beforeUrl,
  afterUrl,
  status,
}: Pick<ImageDiffPanelProps, "beforeUrl" | "afterUrl" | "status">) {
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [position, setPosition] = useState(50);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const update = () => setContainerWidth(node.clientWidth);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const setPositionFromClientX = useCallback((clientX: number) => {
    const node = containerRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, pct)));
  }, []);

  const startDrag = useCallback(
    (clientX: number) => {
      dragging.current = true;
      setPositionFromClientX(clientX);

      const onMove = (event: MouseEvent | TouchEvent) => {
        if (!dragging.current) return;
        const x = "touches" in event ? event.touches[0]?.clientX : event.clientX;
        if (x != null) setPositionFromClientX(x);
      };
      const onEnd = () => {
        dragging.current = false;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onEnd);
        window.removeEventListener("touchmove", onMove);
        window.removeEventListener("touchend", onEnd);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onEnd);
      window.addEventListener("touchmove", onMove);
      window.addEventListener("touchend", onEnd);
    },
    [setPositionFromClientX],
  );

  const onContainerPointerDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("[data-swipe-handle]")) return;
    setPositionFromClientX(event.clientX);
  };

  return (
    <Checkerboard
      ref={containerRef}
      className="h-full w-full cursor-col-resize select-none"
      onMouseDown={onContainerPointerDown}
    >
      {/* Before (parent) — full layer underneath */}
      <div className="pointer-events-none absolute inset-0">
        <span className="absolute right-2 top-2 z-[1] rounded bg-background/70 px-1.5 py-0.5 text-xs text-muted-foreground">
          {t("preview.before")}
        </span>
        {beforeUrl ? (
          <img src={beforeUrl} alt="" className="h-full w-full object-contain" draggable={false} />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            {status === "A" ? t("preview.noPreviousVersion") : t("preview.noImage")}
          </div>
        )}
      </div>

      {/* After (commit) — clipped top layer, same pixel grid as before */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 overflow-hidden"
        style={{ width: `${position}%` }}
      >
        <span className="absolute left-2 top-2 z-[1] rounded bg-background/70 px-1.5 py-0.5 text-xs text-muted-foreground">
          {t("preview.after")}
        </span>
        <div className="relative h-full" style={{ width: containerWidth || "100%" }}>
          {afterUrl ? (
            <img
              src={afterUrl}
              alt=""
              className="absolute left-0 top-0 h-full object-contain"
              style={{ width: containerWidth || "100%" }}
              draggable={false}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              {t("preview.noImage")}
            </div>
          )}
        </div>
      </div>

      {/* Divider + handle */}
      <div
        data-swipe-handle
        className="absolute bottom-0 top-0 z-20 -translate-x-1/2 cursor-col-resize"
        style={{ left: `${position}%` }}
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          startDrag(event.clientX);
        }}
        onTouchStart={(event) => {
          event.stopPropagation();
          const touch = event.touches[0];
          if (touch) startDrag(touch.clientX);
        }}
      >
        <div className="h-full w-0.5 bg-ring" />
        <div className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ring bg-background shadow-sm" />
      </div>
    </Checkerboard>
  );
}

function ImageDiffOverlay({
  beforeUrl,
  afterUrl,
}: Pick<ImageDiffPanelProps, "beforeUrl" | "afterUrl">) {
  const t = useT();
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
        <Label className="text-xs font-normal text-muted-foreground">{t("preview.opacity")}</Label>
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
  const t = useT();
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
        <p className="text-sm text-destructive">{t("preview.failedLoadImage")}</p>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col">
        {layout === "overlay" ? (
          <ImageDiffOverlay beforeUrl={beforeUrl} afterUrl={afterUrl} />
        ) : layout === "swipe" ? (
          <ImageDiffSwipe beforeUrl={beforeUrl} afterUrl={afterUrl} status={status} />
        ) : (
          <ImageDiffTwoUp beforeUrl={beforeUrl} afterUrl={afterUrl} status={status} />
        )}
      </div>
    </div>
  );
}
