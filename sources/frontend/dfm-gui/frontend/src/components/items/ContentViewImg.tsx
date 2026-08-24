import { useEffect, useRef, useState } from "react";
import { wheelZoomDelta } from "@/lib/grid";

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 8;

function clampImageZoom(value: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));
}

export function ContentViewImg({ src }: { src?: string }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    setZoom(1);
    setNatural({ w: 0, h: 0 });
  }, [src]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) {
      return;
    }
    const sync = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    sync();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) {
      return;
    }
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }
      event.preventDefault();
      const next = clampImageZoom(zoom * Math.exp(-wheelZoomDelta(event) * 0.0015));
      if (next === zoom) {
        return;
      }
      const prevW = el.scrollWidth;
      const prevH = el.scrollHeight;
      const cx = el.scrollLeft + el.clientWidth / 2;
      const cy = el.scrollTop + el.clientHeight / 2;
      setZoom(next);
      requestAnimationFrame(() => {
        if (prevW > 0) {
          el.scrollLeft = (cx / prevW) * el.scrollWidth - el.clientWidth / 2;
        }
        if (prevH > 0) {
          el.scrollTop = (cy / prevH) * el.scrollHeight - el.clientHeight / 2;
        }
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoom]);

  const fit = natural.w > 0 && box.w > 0 ? Math.min(box.w / natural.w, box.h / natural.h, 1) : 0;
  const width = fit > 0 ? natural.w * fit * zoom : undefined;
  const height = fit > 0 ? natural.h * fit * zoom : undefined;
  const stageW = width != null ? Math.max(width, box.w) : undefined;
  const stageH = height != null ? Math.max(height, box.h) : undefined;

  return (
    <div ref={viewportRef} className="min-h-0 w-full flex-1 overflow-auto">
      {src ? (
        <div
          className="flex items-center justify-center"
          style={stageW && stageH ? { width: stageW, height: stageH } : { width: "100%", height: "100%" }}
        >
          <img
            src={src}
            alt=""
            className="block max-h-full max-w-full object-contain"
            style={width && height ? { width, height, maxWidth: "none", maxHeight: "none" } : undefined}
            onLoad={(event) => {
              setNatural({ w: event.currentTarget.naturalWidth, h: event.currentTarget.naturalHeight });
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
