/**
 * Sync SVG icon sizes and render Wails / Windows raster assets.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import pngToIco from "png-to-ico";
import { buildIconSvg, ICON_SIZES, DFM_ICONS_DIR } from "../../../icons/dfm-icon-assets.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendDir = join(__dirname, "..");
const guiDir = join(frontendDir, "..");
const imagesDir = join(frontendDir, "src/assets/images");
const masterSvgPath = join(DFM_ICONS_DIR, "256.svg");

function renderPng(svg, size) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: size },
    background: "transparent",
  });
  return resvg.render().asPng();
}

for (const size of ICON_SIZES) {
  const svg = buildIconSvg(size);
  writeFileSync(join(imagesDir, `${size}.svg`), svg);
}
writeFileSync(join(frontendDir, "public/icon.svg"), buildIconSvg(32));
console.log(`Synced DFM SVG icons from ${DFM_ICONS_DIR} (${ICON_SIZES.join(", ")}px + favicon)`);

const svg = readFileSync(masterSvgPath, "utf8");
writeFileSync(join(frontendDir, "public/app-icon-32.png"), renderPng(svg, 32));
console.log("Wrote public/app-icon-32.png");

const buildDir = join(guiDir, "build");
const windowsDir = join(buildDir, "windows");
const exportDir = join(imagesDir, "export");
mkdirSync(buildDir, { recursive: true });
mkdirSync(windowsDir, { recursive: true });
mkdirSync(exportDir, { recursive: true });

writeFileSync(join(buildDir, "appicon.png"), renderPng(svg, 1024));
console.log("Wrote build/appicon.png (1024x1024)");

const icoSizes = [16, 24, 32, 48, 64, 128, 256];
for (const size of icoSizes) {
  writeFileSync(join(exportDir, `${size}.png`), renderPng(svg, size));
}
console.log(`Wrote PNG exports (${icoSizes.join(", ")}px)`);

const ico = await pngToIco(icoSizes.map((size) => join(exportDir, `${size}.png`)));
writeFileSync(join(windowsDir, "icon.ico"), ico);
console.log("Wrote build/windows/icon.ico");

const hicolorSizes = [16, 22, 24, 32, 48, 64, 128, 256, 512];
const iconName = "difference-machine";
for (const size of hicolorSizes) {
  const dir = join(buildDir, "share/icons/hicolor", `${size}x${size}`, "apps");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${iconName}.png`), renderPng(svg, size));
}
const scalableDir = join(buildDir, "share/icons/hicolor/scalable/apps");
mkdirSync(scalableDir, { recursive: true });
writeFileSync(join(scalableDir, `${iconName}.svg`), buildIconSvg(256));
console.log(`Wrote Linux hicolor icons (${hicolorSizes.join(", ")}px + scalable SVG)`);
