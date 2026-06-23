export function rangePathsBetween(
  orderedPaths: string[],
  anchorPath: string | null,
  targetPath: string,
): string[] {
  if (orderedPaths.length === 0) return [];

  const anchor = anchorPath ?? orderedPaths[0]!;
  let anchorIdx = orderedPaths.indexOf(anchor);
  const targetIdx = orderedPaths.indexOf(targetPath);

  if (anchorIdx === -1) anchorIdx = 0;
  if (targetIdx === -1) return [targetPath];

  const start = Math.min(anchorIdx, targetIdx);
  const end = Math.max(anchorIdx, targetIdx);
  return orderedPaths.slice(start, end + 1);
}

export function rectsIntersect(a: DOMRect, b: DOMRect): boolean {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}

export interface MarqueeRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function normalizeMarqueeRect(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): MarqueeRect {
  const left = Math.min(startX, endX);
  const top = Math.min(startY, endY);
  return {
    left,
    top,
    width: Math.abs(endX - startX),
    height: Math.abs(endY - startY),
  };
}

export function pathsInMarquee(
  container: HTMLElement,
  marquee: MarqueeRect,
  orderedPaths: string[],
): string[] {
  const marqueeBox = new DOMRect(marquee.left, marquee.top, marquee.width, marquee.height);
  const hitSet = new Set<string>();

  for (const el of container.querySelectorAll("[data-file-path]")) {
    const path = el.getAttribute("data-file-path");
    if (!path || !orderedPaths.includes(path)) continue;
    if (rectsIntersect(el.getBoundingClientRect(), marqueeBox)) {
      hitSet.add(path);
    }
  }

  return orderedPaths.filter((path) => hitSet.has(path));
}
