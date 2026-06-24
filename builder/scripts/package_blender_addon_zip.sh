#!/bin/bash
# Package Blender extension folder as a .zip (difference_machine/ inside the archive).
# Usage: package_blender_addon_zip.sh SOURCE_DIR OUTPUT_ZIP

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/detect_platform.sh
. "${SCRIPT_DIR}/lib/detect_platform.sh"
# shellcheck source=lib/zip_archive.sh
. "${SCRIPT_DIR}/lib/zip_archive.sh"

detect_platform

BUILDER_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

ADDON_ID="difference_machine"
SOURCE_DIR="${1:?source addon directory required}"
OUTPUT_ZIP="${2:?output .zip path required}"

if [ ! -d "${SOURCE_DIR}" ]; then
    echo "Blender addon not found: ${SOURCE_DIR}" >&2
    exit 1
fi

if [ ! -f "${SOURCE_DIR}/blender_manifest.toml" ]; then
    echo "Missing blender_manifest.toml in ${SOURCE_DIR}" >&2
    exit 1
fi

STAGING_ZIP="${BUILDER_DIR}/.staging/blender_addon_zip"
rm -rf "${STAGING_ZIP}"
mkdir -p "${STAGING_ZIP}" "$(dirname "${OUTPUT_ZIP}")"
cp -R "${SOURCE_DIR}" "${STAGING_ZIP}/${ADDON_ID}"

find "${STAGING_ZIP}" \
    \( -name '__pycache__' -o -name '.git' -o -name '.DS_Store' -o -name '*.pyc' -o -name '*.pyo' \) \
    -print -prune -exec rm -rf {} + 2>/dev/null || true

create_zip_archive "${OUTPUT_ZIP}" "${STAGING_ZIP}/${ADDON_ID}"
rm -rf "${STAGING_ZIP}"

echo "${OUTPUT_ZIP}"
