/**
 * Forester app icon SVG assets.
 * Source artwork: sources/icons/logo/forester/source.svg
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  APPLE_LIVE_AREA,
  ICON_CANVAS,
  ICON_CENTER,
  macosSquirclePath,
} from "../../builder/scripts/lib/icon-squircle.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const FORESTER_ICONS_DIR = join(__dirname, "logo/forester");
export const FORESTER_BUILD_DIR = join(FORESTER_ICONS_DIR, "build");

/** Artwork grid is 256×256; scale into Apple's 824px live area on a 1024 canvas. */
const ARTWORK_GRID = 256;
const ARTWORK_CENTER = ARTWORK_GRID / 2;
const ARTWORK_SCALE = APPLE_LIVE_AREA / ARTWORK_GRID;

function loadArtwork256() {
  const source = readFileSync(join(FORESTER_ICONS_DIR, "source.svg"), "utf8");
  const match = source.match(/<g clip-path="[^"]*">([\s\S]*?)<\/g>\s*<defs>/);
  if (!match) {
    throw new Error("Could not parse Forester icon artwork from source.svg");
  }
  return match[1].trim();
}

const FORESTER_ARTWORK = loadArtwork256();

/** Same layering as GUI icons: squircle fill to edge, artwork in Apple live area. */
export function buildForesterIconSvg(displaySize) {
  const squircle = macosSquirclePath();
  return `<svg width="${displaySize}" height="${displaySize}" viewBox="0 0 ${ICON_CANVAS} ${ICON_CANVAS}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Forester">
  <defs>
    <clipPath id="forester-squircle">
      <path d="${squircle}"/>
    </clipPath>
  </defs>
  <path d="${squircle}" fill="#18181B"/>
  <g clip-path="url(#forester-squircle)">
    <g transform="translate(${ICON_CENTER} ${ICON_CENTER}) scale(${ARTWORK_SCALE}) translate(-${ARTWORK_CENTER} -${ARTWORK_CENTER})">
      ${FORESTER_ARTWORK}
    </g>
  </g>
</svg>
`;
}

/** Squircle clip path for the 256px design grid (source.svg preview). */
export function buildForesterSourceSquircleClip() {
  return macosSquirclePath(ARTWORK_GRID);
}

export const ICON_SIZES = [32, 48, 64, 128, 256];
