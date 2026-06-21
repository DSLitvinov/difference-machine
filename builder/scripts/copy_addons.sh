#!/bin/bash
# Copy addons into the distribution target directory.
# Usage: copy_addons.sh [TARGET_DIR]
# Default TARGET_DIR: ${HOME}/dfm_distr

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILDER_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROJECT_ROOT="$(cd "${BUILDER_DIR}/.." && pwd)"
SOURCES_DIR="${PROJECT_ROOT}/sources"
ADDONS_SOURCE="${SOURCES_DIR}/addons"
if [ ! -d "${ADDONS_SOURCE}" ]; then
    ADDONS_SOURCE="${PROJECT_ROOT}/addons"
fi
TARGET_DIR="${1:-${HOME}/dfm_distr}"

echo "=== Copy addons ==="
echo "Source: ${ADDONS_SOURCE}"
echo "Target: ${TARGET_DIR}/addons"
echo ""

if [ ! -d "${ADDONS_SOURCE}" ]; then
    echo "Addons directory not found: ${ADDONS_SOURCE}"
    exit 1
fi

mkdir -p "${TARGET_DIR}"
rm -rf "${TARGET_DIR}/addons"
cp -R "${ADDONS_SOURCE}" "${TARGET_DIR}/"
echo "Addons copied to ${TARGET_DIR}/addons"
