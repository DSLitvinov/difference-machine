/** macOS Dock squircle (superellipse n=5). */

export const ICON_CANVAS = 1024;
export const ICON_CENTER = ICON_CANVAS / 2;

/** Apple HIG live area (824px on a 1024 grid). */
export const APPLE_LIVE_AREA = 824;

export function macosSquirclePath(size = ICON_CANVAS, n = 5, segments = 120) {
  const radius = size / 2;
  const center = size / 2;
  const points = [];

  for (let i = 0; i < segments; i += 1) {
    const t = (2 * Math.PI * i) / segments;
    const cos = Math.cos(t);
    const sin = Math.sin(t);
    const x = center + radius * Math.sign(cos) * Math.abs(cos) ** (2 / n);
    const y = center + radius * Math.sign(sin) * Math.abs(sin) ** (2 / n);
    points.push([x, y]);
  }

  const fmt = (v) => {
    const s = v.toFixed(4);
    return s.replace(/\.?0+$/, "");
  };

  const parts = [`M ${fmt(points[0][0])} ${fmt(points[0][1])}`];
  for (let i = 1; i < points.length; i += 1) {
    parts.push(`L ${fmt(points[i][0])} ${fmt(points[i][1])}`);
  }
  parts.push("Z");
  return parts.join(" ");
}
