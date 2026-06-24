#!/bin/bash
# Assemble Windows release archive: DifferenceMachine-<version>-windows.zip

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/detect_platform.sh
. "${SCRIPT_DIR}/lib/detect_platform.sh"
# shellcheck source=lib/release_install_folder.sh
. "${SCRIPT_DIR}/lib/release_install_folder.sh"

detect_platform

if [ "${CURRENT_OS}" != "windows" ]; then
    echo -e "${RED}Windows zip packaging is windows only (current: ${CURRENT_OS}).${NC}" >&2
    exit 1
fi

BUILDER_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
DFM_DIST="${DFM_DIST:-${HOME}/dfm_distr}"
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
Difference Machine — Windows install
====================================

Suggested install path: C:\\Program Files\\Difference Machine\\

Contents:
  ${GUI_DEST_NAME}              GUI application
  bin\\${FORESTER_CLI_NAME}      Forester CLI
  lib\\${API_LIB_NAME}           Forester API library
  addons\\blender\\difference_machine.zip

1. Copy this folder to your preferred location, for example:
     C:\\Program Files\\${INSTALL_FOLDER_NAME}\\

2. Install the Blender addon (once per Blender version):
   Blender → Edit → Preferences → Get Extensions → Install from Disk…
   and select addons\\blender\\difference_machine.zip from this folder.

3. Launch ${GUI_DEST_NAME} once. It creates %USERPROFILE%\\.dfm\\setup.cfg with paths
   to Forester and the addon in this install folder.

4. Optional CLI on PATH: add bin\\ to your user PATH environment variable.

Support: https://github.com/difference-machine/difference-machine
EOF

echo ""
echo "=== Create zip ==="
mkdir -p "${DIST_DIR}"
rm -f "${ARCHIVE_PATH}"

if command -v zip >/dev/null 2>&1; then
    (cd "${STAGING}" && zip -rq "${ARCHIVE_PATH}" "${INSTALL_FOLDER_NAME}")
else
    echo -e "${RED}zip command not found. Install zip or run from MSYS2.${NC}" >&2
    exit 1
fi

rm -rf "${STAGING}"

echo ""
echo -e "${GREEN}✓ Archive ready: ${ARCHIVE_PATH}${NC}"
echo ""
echo "Archive contents:"
echo "  ${INSTALL_FOLDER_NAME}/"
echo "    ${GUI_DEST_NAME}"
echo "    bin/${FORESTER_CLI_NAME}"
echo "    lib/${API_LIB_NAME}"
echo "    addons/blender/difference_machine.zip"
echo "    README.txt"
