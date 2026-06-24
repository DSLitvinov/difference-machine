#!/bin/bash
# Assemble Windows NSIS installer: DifferenceMachine-<version>-windows-setup.exe

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PLATFORM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILDER_DIR="$(cd "${PLATFORM_DIR}/.." && pwd)"
SCRIPTS_DIR="${BUILDER_DIR}/scripts"
NSIS_SCRIPT="${PLATFORM_DIR}/installer.nsi"

# shellcheck source=../scripts/lib/detect_platform.sh
. "${SCRIPTS_DIR}/lib/detect_platform.sh"
# shellcheck source=../scripts/lib/release_install_folder.sh
. "${SCRIPTS_DIR}/lib/release_install_folder.sh"
# shellcheck source=../scripts/lib/dfm_dist.sh
. "${SCRIPTS_DIR}/lib/dfm_dist.sh"

detect_platform
ensure_dfm_dist "${BUILDER_DIR}"

DFM_DIST="${DFM_DIST}"
DIST_DIR="${BUILDER_DIR}/dist"
STAGING="${BUILDER_DIR}/.staging/windows_installer"
INSTALL_FOLDER_NAME="${INSTALL_FOLDER_NAME:-Difference Machine}"

PAYLOAD_VERSION="$(head -1 "${DFM_DIST}/VERSION" 2>/dev/null | tr -d '[:space:]' || true)"
VERSION="${VERSION:-${PAYLOAD_VERSION:-0.8}}"
SETUP_BASENAME="DifferenceMachine-${VERSION}-windows-setup"
SETUP_PATH="${DIST_DIR}/${SETUP_BASENAME}.exe"
INSTALL_DIR="${STAGING}/${INSTALL_FOLDER_NAME}"

echo "=========================================="
echo "  Package Windows installer (NSIS)"
echo "=========================================="
echo "Source: ${DFM_DIST}"
echo "Output: ${SETUP_PATH}"
echo ""

if [ ! -f "${NSIS_SCRIPT}" ]; then
    echo -e "${RED}NSIS script not found: ${NSIS_SCRIPT}${NC}" >&2
    exit 1
fi

MAKENSIS=""
if command -v makensis >/dev/null 2>&1; then
    MAKENSIS="makensis"
elif [ -x "/c/Program Files (x86)/NSIS/makensis.exe" ]; then
    MAKENSIS="/c/Program Files (x86)/NSIS/makensis.exe"
elif [ -x "/c/Program Files/NSIS/makensis.exe" ]; then
    MAKENSIS="/c/Program Files/NSIS/makensis.exe"
fi

if [ -z "${MAKENSIS}" ]; then
    echo -e "${RED}makensis not found.${NC}" >&2
    echo "Install NSIS: https://nsis.sourceforge.io/Download" >&2
    exit 1
fi

echo -e "${GREEN}✓ NSIS: ${MAKENSIS}${NC}"

assemble_portable_install_dir "${INSTALL_DIR}" "${DFM_DIST}"

cat > "${INSTALL_DIR}/README.txt" << EOF
Difference Machine — Windows install
====================================

Installed to: C:\\Program Files\\${INSTALL_FOLDER_NAME}\\

1. Launch ${GUI_DEST_NAME} from the Start menu once.
2. Install Blender addon from addons\\blender\\difference_machine.zip.
3. Uninstall: Settings → Apps → Difference Machine.

Support: https://github.com/difference-machine/difference-machine
EOF

echo ""
echo "=== Compile NSIS installer ==="
mkdir -p "${DIST_DIR}"
rm -f "${SETUP_PATH}"

PAYLOAD_NSIS="$(cd "${INSTALL_DIR}" && pwd -W 2>/dev/null || pwd)"
OUTFILE_NSIS="$(cd "${DIST_DIR}" && pwd -W 2>/dev/null || pwd)/${SETUP_BASENAME}.exe"

# Git Bash mangles /D and absolute /d/.../script.nsi paths — use -D and run from script dir.
export MSYS2_ARG_CONV_EXCL='*'
export MSYS_NO_PATHCONV=1

(
    cd "${PLATFORM_DIR}"
    "${MAKENSIS}" \
        -DVERSION="${VERSION}" \
        "-DPAYLOAD_DIR=${PAYLOAD_NSIS}" \
        "-DOUTFILE=${OUTFILE_NSIS}" \
        installer.nsi
)

rm -rf "${STAGING}"

echo ""
echo -e "${GREEN}✓ Installer ready: ${SETUP_PATH}${NC}"
echo -e "${YELLOW}Note: Code signing is not applied by this script.${NC}"
