#!/bin/bash
# Assemble Linux release archive: DifferenceMachine-<version>-linux.tar.gz

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

PLATFORM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILDER_DIR="$(cd "${PLATFORM_DIR}/.." && pwd)"
SCRIPTS_DIR="${BUILDER_DIR}/scripts"

# shellcheck source=../scripts/lib/detect_platform.sh
. "${SCRIPTS_DIR}/lib/detect_platform.sh"
# shellcheck source=../scripts/lib/dfm_dist.sh
. "${SCRIPTS_DIR}/lib/dfm_dist.sh"

detect_platform
ensure_dfm_dist "${BUILDER_DIR}"

DFM_DIST="${DFM_DIST}"
DIST_DIR="${BUILDER_DIR}/dist"
STAGING="${BUILDER_DIR}/.staging/linux_installer"
INSTALL_FOLDER_NAME="Difference-Machine"

# shellcheck source=../scripts/lib/release_install_folder.sh
. "${SCRIPTS_DIR}/lib/release_install_folder.sh"

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

cp "${PLATFORM_DIR}/install.sh" "${INSTALL_DIR}/install.sh"
chmod +x "${INSTALL_DIR}/install.sh"

cat > "${INSTALL_DIR}/README.txt" << EOF
Difference Machine — Linux install
==================================

Install path: /opt/${INSTALL_FOLDER_NAME}/

Contents:
  install.sh                    Installer (recommended)
  ${GUI_DEST_NAME}              GUI application
  bin/${FORESTER_CLI_NAME}      Forester CLI
  lib/${API_LIB_NAME}           Forester API library
  addons/blender/difference_machine.zip

Quick install (recommended)
---------------------------
  tar -xzf DifferenceMachine-*-linux.tar.gz
  cd "${INSTALL_FOLDER_NAME}"
  sudo ./install.sh

The installer will:
  - copy files to /opt/${INSTALL_FOLDER_NAME}/ (GUI, CLI, API, icons, addon zip)
  - write ~/.dfm/setup.cfg (Forester CLI and API paths)
  - create /usr/local/bin/forester and /usr/local/bin/difference-machine symlinks
  - add a desktop menu entry in /usr/share/applications/
  - register app icons in /usr/share/icons/hicolor/ (menu uses /opt icon path)

Install the Blender addon (once per Blender version)
----------------------------------------------------
  Blender → Edit → Preferences → Get Extensions → Install from Disk…
  and select addons/blender/difference_machine.zip from the install folder.

  Set the addon path in GUI Settings if needed after Blender installs it.

User install (no sudo)
----------------------
  ./install.sh --user

Uninstall
---------
  sudo ./install.sh --uninstall
  ./install.sh --user --uninstall

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
