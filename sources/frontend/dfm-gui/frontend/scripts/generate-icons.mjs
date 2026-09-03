/**
 * Rasterize GUI app icons from sources/frontend/icons/512/Appicon.svg.
 * Writes appicon.png, Windows icon.ico, and Linux hicolor icons.
 */
import { createRequire } from "node:module";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendDir = join(__dirname, "..");
const guiDir = join(frontendDir, "..");
const sourceSvg = join(frontendDir, "../../icons/512/Appicon.svg");
const buildDir = join(guiDir, "build");
const windowsDir = join(buildDir, "windows");
const hicolorRoot = join(buildDir, "share/icons/hicolor");

const require = createRequire(join(frontendDir, "package.json"));
const { Resvg } = require("@resvg/resvg-js");
const pngToIcoMod = require("png-to-ico");
const pngToIco = typeof pngToIcoMod === "function" ? pngToIcoMod : pngToIcoMod.default;

function renderPng(svg, size) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: size },
    background: "transparent",
  });
  return resvg.render().asPng();
}

mkdirSync(windowsDir, { recursive: true });
const svg = readFileSync(sourceSvg);
writeFileSync(join(buildDir, "appicon.png"), renderPng(svg, 1024));

const icoSizes = [16, 24, 32, 48, 64, 128, 256];
const buffers = icoSizes.map((size) => renderPng(svg, size));
const ico = await pngToIco(buffers);
writeFileSync(join(windowsDir, "icon.ico"), ico);

const hicolorSizes = [16, 22, 24, 32, 48, 64, 128, 256, 512];
for (const size of hicolorSizes) {
  const dir = join(hicolorRoot, `${size}x${size}`, "apps");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "difference-machine.png"), renderPng(svg, size));
}
const scalableDir = join(hicolorRoot, "scalable", "apps");
mkdirSync(scalableDir, { recursive: true });
copyFileSync(sourceSvg, join(scalableDir, "difference-machine.svg"));

console.log(`Wrote ${join(buildDir, "appicon.png")}`);
console.log(`Wrote ${join(windowsDir, "icon.ico")}`);
console.log(`Wrote Linux hicolor icons (${hicolorSizes.join(", ")}px + scalable SVG)`);
