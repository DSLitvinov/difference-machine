/**
 * macOS-style app icon SVG assets.
 * Background: superellipse squircle (n=5, same family as Apple Dock icons).
 * Glyph: 12% safe-zone inset (scale 0.962 from canvas center).
 */

import {
  ICON_CANVAS as CANVAS,
  ICON_CENTER as CENTER,
  macosSquirclePath,
} from "../../../../builder/scripts/lib/icon-squircle.mjs";

const GLYPH_SCALE = 0.962;
export const GLYPH_PATH =
  "M512 107.6016C534.308 107.6016 552.396 125.6888 552.396 148V404.612C552.396 422.988 572.204 434.548 588.2 425.508L851.328 276.867C870.76 265.89 895.424 272.722 906.408 292.125C917.396 311.53 910.548 336.161 891.112 347.14L632.156 493.424C615.88 502.62 615.9 525.916 632.196 535.24L890.504 680.524C909.956 691.468 916.852 716.088 905.9 735.512C894.952 754.936 870.304 761.816 850.848 750.876L588.164 603.132C572.164 594.132 552.396 605.696 552.396 624.048V876C552.396 898.312 534.308 916.4 512 916.4C489.688 916.4 471.6 898.312 471.6 876V625.248C471.6 606.872 451.796 595.312 435.796 604.352L173.1 752.752C153.664 763.732 129.004 756.9 118.018 737.496C107.032 718.092 113.88 693.464 133.312 682.484L393.556 535.468C409.836 526.272 409.812 502.816 393.517 493.652L133.073 347.172C113.617 336.229 106.717 311.609 117.667 292.184C128.617 272.758 153.269 265.882 172.725 276.824L435.836 424.804C451.832 433.8 471.6 422.24 471.6 403.884V148C471.6 125.6892 489.688 107.602 512 107.6016Z";

export function buildIconSvg(displaySize) {
  const squircle = macosSquirclePath();
  return `<svg width="${displaySize}" height="${displaySize}" viewBox="0 0 ${CANVAS} ${CANVAS}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Difference Machine">
  <path d="${squircle}" fill="#18181B"/>
  <g transform="translate(${CENTER} ${CENTER}) scale(${GLYPH_SCALE}) translate(-${CENTER} -${CENTER})">
    <path d="${GLYPH_PATH}" fill="white"/>
  </g>
</svg>
`;
}

export const ICON_SIZES = [32, 48, 64, 128, 256];
