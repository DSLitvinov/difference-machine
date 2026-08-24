import { useRef, useState, type PointerEvent } from "react";
import { FigmaIcon } from "@/components/chrome/FigmaIcon";
import { t, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import swipeThumb from "@/assets/icons/diff-swipe-thumb.svg";
import overlayThumb from "@/assets/icons/diff-overlay-thumb.svg";

type ImageTab = "2-up" | "swipe" | "overlay";

type ImageDiffViewerProps = {
  locale: Locale;
  afterSrc?: string;
  beforeSrc?: string;
  noCommits?: boolean;
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

export function ImageDiffViewer({ locale, afterSrc, beforeSrc, noCommits }: ImageDiffViewerProps) {
  const copy = t(locale);
  const [tab, setTab] = useState<ImageTab>("2-up");
  const [split, setSplit] = useState(0.5);
  const [overlay, setOverlay] = useState(0.5);
  const swipeRef = useRef<HTMLDivElement>(null);

  function moveSplit(event: PointerEvent<HTMLDivElement>) {
    const box = swipeRef.current?.getBoundingClientRect();
    if (!box) {
      return;
    }
    setSplit(Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)));
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div className="flex w-full items-center justify-end p-2">
        <TabBar value={tab} onChange={setTab} locale={locale} disabled={noCommits} />
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
                <div className="pointer-events-none absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2" style={{ left: `${overlay * 100}%` }}>
                  <FigmaIcon src={overlayThumb} size={20} />
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
          {tab === "swipe" ? (
            <div
              ref={swipeRef}
              className="relative min-h-0 flex-1 cursor-ew-resize overflow-hidden p-2"
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                moveSplit(event);
              }}
              onPointerMove={(event) => {
                if (event.buttons) {
                  moveSplit(event);
                }
              }}
            >
              <div className="absolute inset-2 overflow-hidden rounded-sm">
                {beforeSrc ? <img src={beforeSrc} alt="" className="size-full object-cover" /> : <div className="size-full bg-background-muted" />}
                <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${split * 100}%` }}>
                  {afterSrc ? <img src={afterSrc} alt="" className="h-full max-w-none object-cover" style={{ width: swipeRef.current ? swipeRef.current.clientWidth - 16 : "100%" }} /> : null}
                </div>
                <div className="absolute inset-y-0 w-0.5 bg-[#4f46e5]" style={{ left: `${split * 100}%` }} />
                <div className="absolute top-1/2 size-8 -translate-x-1/2 -translate-y-1/2" style={{ left: `${split * 100}%` }}>
                  <FigmaIcon src={swipeThumb} size={32} />
                </div>
              </div>
            </div>
          ) : null}
          {tab === "overlay" ? (
            <div className="relative min-h-0 flex-1 p-2">
              <div className="relative size-full overflow-hidden rounded-sm">
                {afterSrc ? <img src={afterSrc} alt="" className="size-full object-cover" /> : <div className="size-full bg-background-muted" />}
                {beforeSrc ? <img src={beforeSrc} alt="" className="absolute inset-0 size-full object-cover" style={{ opacity: overlay }} /> : null}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
