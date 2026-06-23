import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_WIDTH = 373;
const MIN_WIDTH = 280;

interface UseResizableWidthOptions {
  defaultWidth?: number;
  minWidth?: number;
  maxWidthPercent?: number;
  onWidthChange?: (width: number) => void;
}

export function useResizableWidth({
  defaultWidth = DEFAULT_WIDTH,
  minWidth = MIN_WIDTH,
  maxWidthPercent = 0.45,
  onWidthChange,
}: UseResizableWidthOptions = {}) {
  const [width, setWidth] = useState(defaultWidth);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const clampWidth = useCallback(
    (next: number) => {
      const container = containerRef.current?.parentElement;
      const max = container ? Math.max(minWidth, container.clientWidth * maxWidthPercent) : 600;
      return Math.min(Math.max(next, minWidth), max);
    },
    [minWidth, maxWidthPercent],
  );

  const startDrag = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      draggingRef.current = true;
      const startX = event.clientX;
      const startWidth = width;

      const onMove = (moveEvent: MouseEvent) => {
        if (!draggingRef.current) return;
        const next = clampWidth(startWidth + (moveEvent.clientX - startX));
        setWidth(next);
        onWidthChange?.(next);
      };

      const onUp = () => {
        draggingRef.current = false;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [clampWidth, onWidthChange, width],
  );

  const resetWidth = useCallback(() => {
    setWidth(defaultWidth);
    onWidthChange?.(defaultWidth);
  }, [defaultWidth, onWidthChange]);

  useEffect(() => {
    setWidth(defaultWidth);
  }, [defaultWidth]);

  return { width, containerRef, startDrag, resetWidth, setWidth };
}
