import { useEffect, useRef, useState, type RefObject } from "react";
import { marqueeRect, type MarqueeRect } from "@/lib/marquee";

const DRAG_THRESHOLD = 4;
const SCROLL_EDGE = 28;
const SCROLL_STEP = 16;

type UseMarqueeArgs = {
  scrollRef: RefObject<HTMLDivElement | null>;
  /** Horizontal padding of the scrollport; content x starts after it. */
  padX: number;
  selection: string[];
  onSelect: (paths: string[]) => void;
  hitTest: (rect: MarqueeRect) => string[];
};

function unique(paths: string[]): string[] {
  return [...new Set(paths)];
}

function contentPoint(el: HTMLElement, clientX: number, clientY: number, padX: number): { x: number; y: number } {
  const bounds = el.getBoundingClientRect();
  return {
    x: clientX - bounds.left - padX + el.scrollLeft,
    y: clientY - bounds.top + el.scrollTop,
  };
}

export function useMarquee({ scrollRef, padX, selection, onSelect, hitTest }: UseMarqueeArgs): MarqueeRect | null {
  const [box, setBox] = useState<MarqueeRect | null>(null);
  const selectionRef = useRef(selection);
  const onSelectRef = useRef(onSelect);
  const hitRef = useRef(hitTest);
  selectionRef.current = selection;
  onSelectRef.current = onSelect;
  hitRef.current = hitTest;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }

    let dragging = false;
    let additive = false;
    let base: string[] = [];
    let origin: { x: number; y: number } | null = null;
    let last = { clientX: 0, clientY: 0 };
    let published = "";
    let frame = 0;

    const publish = (paths: string[]) => {
      const key = paths.join("\0");
      if (key === published) {
        return;
      }
      published = key;
      onSelectRef.current(paths);
    };

    const nearEdge = () => {
      const bounds = el.getBoundingClientRect();
      return (
        last.clientY < bounds.top + SCROLL_EDGE ||
        last.clientY > bounds.bottom - SCROLL_EDGE ||
        last.clientX < bounds.left + SCROLL_EDGE ||
        last.clientX > bounds.right - SCROLL_EDGE
      );
    };

    const apply = () => {
      if (!origin) {
        return;
      }
      const current = contentPoint(el, last.clientX, last.clientY, padX);
      const rect = marqueeRect(origin, current);
      if (rect.w < DRAG_THRESHOLD && rect.h < DRAG_THRESHOLD) {
        return;
      }
      setBox((prev) =>
        prev && prev.x === rect.x && prev.y === rect.y && prev.w === rect.w && prev.h === rect.h ? prev : rect,
      );
      const hits = hitRef.current(rect);
      publish(additive ? unique([...base, ...hits]) : hits);
    };

    const tick = () => {
      frame = 0;
      if (!dragging) {
        return;
      }
      const bounds = el.getBoundingClientRect();
      if (last.clientY < bounds.top + SCROLL_EDGE) {
        el.scrollTop -= SCROLL_STEP;
      } else if (last.clientY > bounds.bottom - SCROLL_EDGE) {
        el.scrollTop += SCROLL_STEP;
      }
      if (last.clientX < bounds.left + SCROLL_EDGE) {
        el.scrollLeft -= SCROLL_STEP;
      } else if (last.clientX > bounds.right - SCROLL_EDGE) {
        el.scrollLeft += SCROLL_STEP;
      }
      apply();
      if (nearEdge()) {
        frame = window.requestAnimationFrame(tick);
      }
    };

    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) {
        return;
      }
      const target = event.target;
      if (target instanceof Element && target.closest("button, a, input, textarea")) {
        return;
      }
      dragging = true;
      additive = event.shiftKey || event.metaKey || event.ctrlKey;
      base = selectionRef.current.slice();
      published = "\0";
      last = { clientX: event.clientX, clientY: event.clientY };
      origin = contentPoint(el, event.clientX, event.clientY, padX);
      el.setPointerCapture(event.pointerId);
      event.preventDefault();
    };

    const onMove = (event: PointerEvent) => {
      if (!dragging) {
        return;
      }
      last = { clientX: event.clientX, clientY: event.clientY };
      apply();
      if (!frame && nearEdge()) {
        frame = window.requestAnimationFrame(tick);
      }
    };

    const finish = (event: PointerEvent) => {
      if (!dragging) {
        return;
      }
      dragging = false;
      if (frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
      const current = origin ? contentPoint(el, event.clientX, event.clientY, padX) : null;
      const rect = origin && current ? marqueeRect(origin, current) : null;
      const moved = Boolean(rect && (rect.w >= DRAG_THRESHOLD || rect.h >= DRAG_THRESHOLD));
      if (!moved && selectionRef.current.length > 0) {
        publish([]);
      }
      setBox(null);
      origin = null;
      if (el.hasPointerCapture(event.pointerId)) {
        el.releasePointerCapture(event.pointerId);
      }
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", finish);
    el.addEventListener("pointercancel", finish);
    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", finish);
      el.removeEventListener("pointercancel", finish);
    };
  }, [padX, scrollRef]);

  return box;
}
