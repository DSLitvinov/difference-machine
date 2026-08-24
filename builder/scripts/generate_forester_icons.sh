#!/bin/bash
# Generate Forester raster icons (PNG, ICO, ICNS, Linux hicolor).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILDER_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROJECT_ROOT="$(cd "${BUILDER_DIR}/.." && pwd)"
FORESTER_ICONS="${PROJECT_ROOT}/sources/backend/forester/icons/build"
ICON_NODE_ROOT="${BUILDER_DIR}/.staging/icon-tools"
NPM_CACHE="${BUILDER_DIR}/.staging/npm-cache"

if [ ! -d "${ICON_NODE_ROOT}/node_modules/@resvg/resvg-js" ]; then
    echo "Installing icon rasterization deps..."
    mkdir -p "${ICON_NODE_ROOT}" "${NPM_CACHE}"
    cat > "${ICON_NODE_ROOT}/package.json" << 'EOF'
{
  "name": "dfm-icon-tools",
  "private": true,
  "type": "module",
  "dependencies": {
    "@resvg/resvg-js": "^2.6.2",
    "png-to-ico": "^2.1.8"
  }
}
EOF
    (cd "${ICON_NODE_ROOT}" && npm install --no-audit --no-fund --cache "${NPM_CACHE}")
fi

export ICON_NODE_ROOT
node "${SCRIPT_DIR}/generate_forester_icons.mjs"

if [ "$(uname -s)" = "Darwin" ] && command -v iconutil >/dev/null 2>&1; then
    ICONSET="${FORESTER_ICONS}/AppIcon.iconset"
    ICNS="${FORESTER_ICONS}/AppIcon.icns"
    if [ -d "${ICONSET}" ]; then
        if iconutil -c icns "${ICONSET}" -o "${ICNS}"; then
            echo "Wrote sources/backend/forester/icons/build/AppIcon.icns"
        else
            echo "Warning: iconutil failed — AppIcon.icns not created" >&2
        fi
    fi
else
    echo "Note: iconutil not available — AppIcon.icns skipped (macOS only)"
fi
