import { useCallback, useEffect, useRef, useState } from "react";

import {
  normalizeMarqueeRect,
  pathsInMarquee,
  type MarqueeRect,
} from "@/lib/fileSelection";

const DRAG_THRESHOLD_PX = 4;

interface UseMarqueeSelectionOptions {
  orderedPaths: string[];
  onSelect: (paths: string[], additive: boolean) => void;
  onClear: () => void;
}

export function useMarqueeSelection({
  orderedPaths,
  onSelect,
  onClear,
}: UseMarqueeSelectionOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    additive: boolean;
    dragging: boolean;
  } | null>(null);

  const finishDrag = useCallback(
    (clientX: number, clientY: number) => {
      const drag = dragRef.current;
      const container = containerRef.current;
      dragRef.current = null;
      setMarquee(null);

      if (!drag || !container) return;

      if (!drag.dragging) {
        onClear();
        return;
      }

      const rect = normalizeMarqueeRect(drag.startX, drag.startY, clientX, clientY);
      if (rect.width < DRAG_THRESHOLD_PX && rect.height < DRAG_THRESHOLD_PX) {
        onClear();
        return;
      }

      const hits = pathsInMarquee(container, rect, orderedPaths);
      if (hits.length > 0) {
        onSelect(hits, drag.additive);
      }
    },
    [onClear, onSelect, orderedPaths],
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      const dx = Math.abs(e.clientX - drag.startX);
      const dy = Math.abs(e.clientY - drag.startY);
      if (!drag.dragging && (dx > DRAG_THRESHOLD_PX || dy > DRAG_THRESHOLD_PX)) {
        drag.dragging = true;
      }

      if (drag.dragging) {
        setMarquee(normalizeMarqueeRect(drag.startX, drag.startY, e.clientX, e.clientY));
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (!dragRef.current) return;
      finishDrag(e.clientX, e.clientY);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [finishDrag]);

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("[data-file-item]")) return;

    e.preventDefault();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      additive: e.shiftKey || e.metaKey || e.ctrlKey,
      dragging: false,
    };
  }, []);

  return { containerRef, marquee, onMouseDown };
}
