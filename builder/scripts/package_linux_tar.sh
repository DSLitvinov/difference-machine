#!/bin/bash
# Assemble Linux release archive: DifferenceMachine-<version>-linux.tar.gz

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

if [ "${CURRENT_OS}" != "linux" ]; then
    echo -e "${RED}Linux tar packaging is linux only (current: ${CURRENT_OS}).${NC}" >&2
    exit 1
fi

BUILDER_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
DFM_DIST="${DFM_DIST:-${HOME}/dfm_distr}"
DIST_DIR="${BUILDER_DIR}/dist"
STAGING="${BUILDER_DIR}/.staging/linux_installer"
INSTALL_FOLDER_NAME="${INSTALL_FOLDER_NAME:-Difference Machine}"

VERSION="$(head -1 "${DFM_DIST}/VERSION" 2>/dev/null | tr -d '[:space:]' || echo "0.0.0")"
ARCHIVE_BASENAME="DifferenceMachine-${VERSION}-linux"
ARCHIVE_PATH="${DIST_DIR}/${ARCHIVE_BASENAME}.tar.gz"
INSTALL_DIR="${STAGING}/${INSTALL_FOLDER_NAME}"

echo "=========================================="
echo "  Package Linux release (.tar.gz)"
echo "=========================================="
echo "Source: ${DFM_DIST}"
echo "Output: ${ARCHIVE_PATH}"
echo ""

assemble_portable_install_dir "${INSTALL_DIR}" "${DFM_DIST}"

cat > "${INSTALL_DIR}/README.txt" << EOF
Difference Machine — Linux install
==================================

Suggested install path: /opt/Difference Machine/

Contents:
  ${GUI_DEST_NAME}              GUI application
  bin/${FORESTER_CLI_NAME}      Forester CLI
  lib/${API_LIB_NAME}           Forester API library
  addons/blender/difference_machine.zip

1. Copy this folder to your preferred location, for example:
     sudo mkdir -p /opt
     sudo cp -R "${INSTALL_FOLDER_NAME}" /opt/

2. Install the Blender addon (once per Blender version):
   Blender → Edit → Preferences → Get Extensions → Install from Disk…
   and select addons/blender/difference_machine.zip from this folder;

   or symlink:
     ln -sf "/opt/${INSTALL_FOLDER_NAME}/addons/blender/difference_machine" \\
       "\$HOME/.config/blender/<version>/extensions/user_default/difference_machine"

   Replace <version> with your Blender version (e.g. 4.2).

3. Launch ${GUI_DEST_NAME} once. It creates ~/.dfm/setup.cfg with paths
   to Forester and the addon in this install folder.

4. Optional CLI on PATH:
     sudo ln -sfn "/opt/${INSTALL_FOLDER_NAME}/bin/${FORESTER_CLI_NAME}" /usr/local/bin/forester

Support: https://github.com/difference-machine/difference-machine
EOF

echo ""
echo "=== Create tar.gz ==="
mkdir -p "${DIST_DIR}"
rm -f "${ARCHIVE_PATH}"

tar -czf "${ARCHIVE_PATH}" -C "${STAGING}" "${INSTALL_FOLDER_NAME}"

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
