#!/bin/bash
# Assemble Windows portable zip: DifferenceMachine-<version>-windows.zip

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

PLATFORM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILDER_DIR="$(cd "${PLATFORM_DIR}/.." && pwd)"
SCRIPTS_DIR="${BUILDER_DIR}/scripts"

# shellcheck source=../scripts/lib/detect_platform.sh
. "${SCRIPTS_DIR}/lib/detect_platform.sh"
# shellcheck source=../scripts/lib/release_install_folder.sh
. "${SCRIPTS_DIR}/lib/release_install_folder.sh"
# shellcheck source=../scripts/lib/zip_archive.sh
. "${SCRIPTS_DIR}/lib/zip_archive.sh"
# shellcheck source=../scripts/lib/dfm_dist.sh
. "${SCRIPTS_DIR}/lib/dfm_dist.sh"

detect_platform
ensure_dfm_dist "${BUILDER_DIR}"

DFM_DIST="${DFM_DIST}"
DIST_DIR="${BUILDER_DIR}/dist"
STAGING="${BUILDER_DIR}/.staging/windows_installer"
INSTALL_FOLDER_NAME="${INSTALL_FOLDER_NAME:-Difference Machine}"

VERSION="$(head -1 "${DFM_DIST}/VERSION" 2>/dev/null | tr -d '[:space:]' || echo "0.0.0")"
ARCHIVE_BASENAME="DifferenceMachine-${VERSION}-windows"
ARCHIVE_PATH="${DIST_DIR}/${ARCHIVE_BASENAME}.zip"
INSTALL_DIR="${STAGING}/${INSTALL_FOLDER_NAME}"

echo "=========================================="
echo "  Package Windows release (.zip)"
echo "=========================================="
echo "Source: ${DFM_DIST}"
echo "Output: ${ARCHIVE_PATH}"
echo ""

assemble_portable_install_dir "${INSTALL_DIR}" "${DFM_DIST}"

cat > "${INSTALL_DIR}/README.txt" << EOF
Difference Machine — Windows portable install
=============================================

Suggested path: C:\\Program Files\\Difference Machine\\

1. Copy this folder to your preferred location.
2. Launch ${GUI_DEST_NAME} once (creates %USERPROFILE%\\.dfm\\setup.cfg).
3. Install Blender addon from addons\\blender\\difference_machine.zip.

Support: https://github.com/difference-machine/difference-machine
EOF

echo ""
echo "=== Create zip ==="
mkdir -p "${DIST_DIR}"
create_zip_archive "${ARCHIVE_PATH}" "${INSTALL_DIR}"

rm -rf "${STAGING}"

echo ""
echo -e "${GREEN}✓ Archive ready: ${ARCHIVE_PATH}${NC}"
