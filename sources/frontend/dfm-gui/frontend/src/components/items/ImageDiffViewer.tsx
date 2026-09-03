import { Circle, GripVertical } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/chrome/Icon";
import { Button } from "@/components/ui/button";
import { t, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type ImageTab = "2-up" | "swipe" | "overlay";

type ImageDiffViewerProps = {
  locale: Locale;
  afterSrc?: string;
  beforeSrc?: string;
  noCommits?: boolean;
  busy?: boolean;
  onCompare?: () => void;
  onRevert?: () => void;
};

function TabBar({
  value,
  onChange,
  locale,
  disabled,
}: {
  value: ImageTab;
  onChange: (tab: ImageTab) => void;
  locale: Locale;
  disabled?: boolean;
}) {
  const copy = t(locale);
  const tabs: { id: ImageTab; label: string }[] = [
    { id: "2-up", label: copy.tab2Up },
    { id: "swipe", label: copy.tabSwipe },
    { id: "overlay", label: copy.tabOverlay },
  ];
  return (
    <div className="flex items-center rounded-md bg-background-muted p-1">
      {tabs.map((tab) => (
        <button
          type="button"
          key={tab.id}
          disabled={disabled}
          className={cn(
            "rounded-sm px-3 py-1.5 text-[14px] font-medium leading-5",
            disabled
              ? "text-foreground-disabled"
              : value === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-foreground-muted",
          )}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="inline-flex h-[22px] shrink-0 items-center rounded-full bg-background-primary px-3 text-[12px] font-semibold leading-4 text-foreground-primary">
      {label}
    </span>
  );
}

function Frame({ src }: { src?: string }) {
  return (
    <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-sm">
      {src ? <img src={src} alt="" className="size-full object-cover" /> : <div className="size-full bg-background-muted" />}
    </div>
  );
}

function SwipeCompare({ afterSrc, beforeSrc }: { afterSrc?: string; beforeSrc?: string }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [split, setSplit] = useState(0.5);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [viewport, setViewport] = useState({ w: 0, h: 0 });

  useEffect(() => {
    setNatural({ w: 0, h: 0 });
  }, [afterSrc, beforeSrc]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) {
      return;
    }
    const sync = () => setViewport({ w: el.clientWidth, h: el.clientHeight });
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    sync();
    return () => observer.disconnect();
  }, []);

  const fit = natural.w > 0 && viewport.w > 0 ? Math.min(viewport.w / natural.w, viewport.h / natural.h) : 0;
  const width = fit > 0 ? natural.w * fit : undefined;
  const height = fit > 0 ? natural.h * fit : undefined;

  function moveTo(clientX: number) {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box || box.width <= 0) {
      return;
    }
    setSplit(Math.min(1, Math.max(0, (clientX - box.left) / box.width)));
  }

  function rememberSize(event: { currentTarget: HTMLImageElement }) {
    const img = event.currentTarget;
    if (img.naturalWidth > 0) {
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    }
  }

  return (
    <div ref={viewportRef} className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-2">
      <div
        ref={boxRef}
        className="relative cursor-ew-resize touch-none overflow-hidden rounded-sm"
        style={width && height ? { width, height } : { width: "100%", height: "100%" }}
        onPointerDown={(event) => {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          moveTo(event.clientX);
        }}
        onPointerMove={(event) => {
          if (event.buttons) {
            moveTo(event.clientX);
          }
        }}
      >
        {beforeSrc ? (
          <img
            src={beforeSrc}
            alt=""
            draggable={false}
            className="pointer-events-none absolute inset-0 size-full object-contain"
            onLoad={afterSrc ? undefined : rememberSize}
          />
        ) : (
          <div className="absolute inset-0 bg-background-muted" />
        )}
        <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${(1 - split) * 100}% 0 0)` }}>
          {afterSrc ? (
            <img src={afterSrc} alt="" draggable={false} className="pointer-events-none absolute inset-0 size-full object-contain" onLoad={rememberSize} />
          ) : null}
        </div>
        <div className="pointer-events-none absolute inset-y-0 h-full w-0.5 -translate-x-1/2 bg-[#4f46e5]" style={{ left: `${split * 100}%` }} />
        <div className="pointer-events-none absolute top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 text-[#4f46e5]" style={{ left: `${split * 100}%` }}>
          <Icon icon={GripVertical} size={32} />
        </div>
      </div>
    </div>
  );
}

export function ImageDiffViewer({ locale, afterSrc, beforeSrc, noCommits, busy, onCompare, onRevert }: ImageDiffViewerProps) {
  const copy = t(locale);
  const [tab, setTab] = useState<ImageTab>("2-up");
  const [overlay, setOverlay] = useState(0.5);
  const showActions = Boolean(onCompare && onRevert);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div className={cn("flex w-full items-center justify-end p-2", showActions && "gap-3")}>
        <TabBar value={tab} onChange={setTab} locale={locale} disabled={noCommits} />
        {showActions ? (
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={onCompare}>
              {copy.compare}
            </Button>
            <Button type="button" disabled={busy} onClick={onRevert}>
              {copy.revert}
            </Button>
          </div>
        ) : null}
      </div>
      {noCommits ? (
        <div className="flex min-h-0 flex-1 p-2">
          <Frame src={afterSrc} />
        </div>
      ) : (
        <>
          {tab === "overlay" ? (
            <div className="flex w-full items-center gap-2 px-3 py-2">
              <Badge label={copy.after} />
              <div className="relative h-2 min-w-0 flex-1 rounded-full bg-background-muted">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={overlay}
                  onChange={(event) => setOverlay(Number(event.target.value))}
                  className="absolute inset-0 w-full cursor-pointer opacity-0"
                  aria-label={copy.tabOverlay}
                />
                <div className="pointer-events-none absolute left-0 top-0 h-full rounded-md bg-background-primary" style={{ width: `${overlay * 100}%` }} />
                <div className="pointer-events-none absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 text-background-primary" style={{ left: `${overlay * 100}%` }}>
                  <Icon icon={Circle} size={20} className="fill-background-primary" />
                </div>
              </div>
              <Badge label={copy.before} />
            </div>
          ) : (
            <div className="flex w-full items-center justify-between px-3 py-2">
              <Badge label={copy.after} />
              <Badge label={copy.before} />
            </div>
          )}
          {tab === "2-up" ? (
            <div className="flex min-h-0 flex-1 gap-1 p-2">
              <Frame src={afterSrc} />
              <Frame src={beforeSrc} />
            </div>
          ) : null}
          {tab === "swipe" ? <SwipeCompare afterSrc={afterSrc} beforeSrc={beforeSrc} /> : null}
          {tab === "overlay" ? (
            <div className="relative min-h-0 flex-1 p-2">
              <div className="relative size-full overflow-hidden rounded-sm">
                {beforeSrc ? <img src={beforeSrc} alt="" className="size-full object-cover" /> : <div className="size-full bg-background-muted" />}
                {afterSrc ? (
                  <img src={afterSrc} alt="" className="absolute inset-0 size-full object-cover" style={{ opacity: 1 - overlay }} />
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
