/**
 * Difference Machine app icon SVG assets.
 * Source artwork: sources/icons/logo/dfm/*.svg
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DFM_ICONS_DIR = join(__dirname, "logo/dfm");
export const ICON_SIZES = [32, 48, 64, 128, 256];

export function buildIconSvg(displaySize) {
  const sizePath = join(DFM_ICONS_DIR, `${displaySize}.svg`);
  if (!existsSync(sizePath)) {
    throw new Error(`DFM icon missing: ${sizePath}`);
  }
  return readFileSync(sizePath, "utf8");
}
