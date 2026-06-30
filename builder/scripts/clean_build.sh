#!/bin/bash
# Remove intermediate build artifacts. Does not delete DFM_DIST (final output).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILDER_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROJECT_ROOT="$(cd "${BUILDER_DIR}/.." && pwd)"

echo ">>> Clean build artifacts"

rm -rf "${BUILDER_DIR}/.staging"
# builder/.cache/ (ffmpeg archives + binaries) is intentionally preserved
rm -rf "${BUILDER_DIR}/forester"
rm -rf "${PROJECT_ROOT}/sources/installer/forester"
rm -rf "${PROJECT_ROOT}/installer/forester"
rm -rf "${PROJECT_ROOT}/dist"
rm -rf "${PROJECT_ROOT}/sources/forester/build"
rm -rf "${PROJECT_ROOT}/forester/build" 2>/dev/null || true
rm -rf "${PROJECT_ROOT}/sources/gui/build"
rm -rf "${PROJECT_ROOT}/sources/gui/frontend/node_modules/.vite"

echo "Done."
