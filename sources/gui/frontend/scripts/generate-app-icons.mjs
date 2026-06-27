/**
 * Renders app icons from the master SVG (256 viewBox, 12% glyph safe zone).
 * Outputs: build/appicon.png, build/windows/icon.ico, PNG sizes for Linux packaging.
 *
 * Requires: npm install (includes @resvg/resvg-js as devDependency)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import pngToIco from "png-to-ico";

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendDir = join(__dirname, "..");
const guiDir = join(frontendDir, "..");
const masterSvg = join(frontendDir, "src/assets/images/256.svg");

function renderPng(svg, size) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: size },
    background: "transparent",
  });
  return resvg.render().asPng();
}

const svg = readFileSync(masterSvg, "utf8");

const buildDir = join(guiDir, "build");
const windowsDir = join(buildDir, "windows");
const shareIconsDir = join(guiDir, "frontend/src/assets/images/export");
mkdirSync(windowsDir, { recursive: true });
mkdirSync(shareIconsDir, { recursive: true });

const appicon = renderPng(svg, 1024);
writeFileSync(join(buildDir, "appicon.png"), appicon);
console.log("Wrote build/appicon.png (1024x1024)");

const icoSizes = [16, 24, 32, 48, 64, 128, 256];
for (const size of icoSizes) {
  const png = renderPng(svg, size);
  writeFileSync(join(shareIconsDir, `${size}.png`), png);
}
console.log(`Wrote PNG exports (${icoSizes.join(", ")}px)`);

const icoInputs = icoSizes.map((size) => join(shareIconsDir, `${size}.png`));
const ico = await pngToIco(icoInputs);
writeFileSync(join(windowsDir, "icon.ico"), ico);
console.log("Wrote build/windows/icon.ico");
