#!/bin/bash
# Generate Forester raster icons (PNG, ICO, ICNS, Linux hicolor).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILDER_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROJECT_ROOT="$(cd "${BUILDER_DIR}/.." && pwd)"
GUI_FRONTEND="${PROJECT_ROOT}/sources/gui/frontend"
FORESTER_ICONS="${PROJECT_ROOT}/sources/icons/logo/forester/build"

if [ ! -d "${GUI_FRONTEND}/node_modules/@resvg/resvg-js" ]; then
    echo "Installing GUI frontend deps (resvg for icon rasterization)..."
    NPM_CACHE="${BUILDER_DIR}/.staging/npm-cache"
    mkdir -p "${NPM_CACHE}"
    (cd "${GUI_FRONTEND}" && npm install --no-audit --no-fund --cache "${NPM_CACHE}")
fi

node "${SCRIPT_DIR}/generate_forester_icons.mjs"

if [ "$(uname -s)" = "Darwin" ] && command -v iconutil >/dev/null 2>&1; then
    ICONSET="${FORESTER_ICONS}/AppIcon.iconset"
    ICNS="${FORESTER_ICONS}/AppIcon.icns"
    if [ -d "${ICONSET}" ]; then
        if iconutil -c icns "${ICONSET}" -o "${ICNS}"; then
            echo "Wrote sources/icons/logo/forester/build/AppIcon.icns"
        else
            echo "Warning: iconutil failed — AppIcon.icns not created" >&2
        fi
    fi
else
    echo "Note: iconutil not available — AppIcon.icns skipped (macOS only)"
fi
