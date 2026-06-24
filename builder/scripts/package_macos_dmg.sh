#!/bin/bash
# Assemble macOS DMG: "Difference Machine" install folder + README at volume root.

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/detect_platform.sh
. "${SCRIPT_DIR}/lib/detect_platform.sh"

detect_platform

if [ "${CURRENT_OS}" != "macos" ]; then
    echo -e "${RED}DMG packaging is macOS only (current: ${CURRENT_OS}).${NC}" >&2
    exit 1
fi

BUILDER_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
DFM_DIST="${DFM_DIST:-${HOME}/dfm_distr}"
DIST_DIR="${BUILDER_DIR}/dist"
STAGING="${BUILDER_DIR}/.staging/macos_installer"
INSTALL_FOLDER_NAME="${INSTALL_FOLDER_NAME:-Difference Machine}"
GUI_APP_NAME="Difference Machine.app"
ADDON_REL="addons/blender/difference_machine"

VERSION="$(head -1 "${DFM_DIST}/VERSION" 2>/dev/null | tr -d '[:space:]' || echo "0.0.0")"
DMG_BASENAME="DifferenceMachine-${VERSION}-macos"
DMG_PATH="${DIST_DIR}/${DMG_BASENAME}.dmg"

echo "=========================================="
echo "  Package macOS DMG"
echo "=========================================="
echo "Source: ${DFM_DIST}"
echo "Output: ${DMG_PATH}"
echo ""

if [ ! -d "${DFM_DIST}/apps" ]; then
    echo -e "${RED}GUI app not found. Build with: ./builder/build.sh --gui${NC}" >&2
    exit 1
fi

shopt -s nullglob
GUI_APPS=("${DFM_DIST}/apps"/*.app)
shopt -u nullglob
if [ "${#GUI_APPS[@]}" -eq 0 ]; then
    echo -e "${RED}No .app in ${DFM_DIST}/apps${NC}" >&2
    exit 1
fi
GUI_SRC="${GUI_APPS[0]}"

echo "=== Forester.app ==="
OUT_DIR="${STAGING}" bash "${SCRIPT_DIR}/wrap_forester_app.sh"

echo ""
echo "=== DMG layout ==="
DMG_LAYOUT="${STAGING}/_dmg_root"
INSTALL_DIR="${DMG_LAYOUT}/${INSTALL_FOLDER_NAME}"
rm -rf "${DMG_LAYOUT}"
mkdir -p "${INSTALL_DIR}"

cp -R "${GUI_SRC}" "${INSTALL_DIR}/${GUI_APP_NAME}"
cp -R "${STAGING}/Forester.app" "${INSTALL_DIR}/Forester.app"

if [ ! -d "${DFM_DIST}/${ADDON_REL}" ]; then
    echo -e "${RED}Addon not found: ${DFM_DIST}/${ADDON_REL}${NC}" >&2
    exit 1
fi
mkdir -p "${INSTALL_DIR}/addons/blender"
cp -R "${DFM_DIST}/${ADDON_REL}" "${INSTALL_DIR}/${ADDON_REL}"

cat > "${DMG_LAYOUT}/README.txt" << EOF
Difference Machine — macOS install
==================================

1. Drag the "${INSTALL_FOLDER_NAME}" folder into Applications
   (use the Applications shortcut on the right).

   After install:
     /Applications/${INSTALL_FOLDER_NAME}/${GUI_APP_NAME}
     /Applications/${INSTALL_FOLDER_NAME}/Forester.app
     /Applications/${INSTALL_FOLDER_NAME}/addons/...

2. Install the Blender addon (once per Blender version):
   ln -sf "/Applications/${INSTALL_FOLDER_NAME}/addons/blender/difference_machine" \\
     "\$HOME/Library/Application Support/Blender/<version>/extensions/user_default/difference_machine"

   Replace <version> with your Blender version (e.g. 4.2).

3. Launch "${GUI_APP_NAME}" once. It creates ~/.dfm/setup.cfg with paths
   to Forester and the addon (same install folder).

4. Open Blender and enable the "Difference Machine" extension.

Forester.app — double-click opens Terminal with the forester CLI.
CLI: /Applications/${INSTALL_FOLDER_NAME}/Forester.app/Contents/MacOS/Forester status

Support: https://github.com/difference-machine/difference-machine
EOF

ln -sf /Applications "${DMG_LAYOUT}/Applications"

echo ""
echo "=== Create DMG ==="
mkdir -p "${DIST_DIR}"
rm -f "${DMG_PATH}"

hdiutil create \
    -volname "Difference Machine" \
    -srcfolder "${DMG_LAYOUT}" \
    -ov \
    -format UDZO \
    "${DMG_PATH}"

rm -rf "${DMG_LAYOUT}"

echo ""
echo -e "${GREEN}✓ DMG ready: ${DMG_PATH}${NC}"
echo ""
echo "DMG contents:"
echo "  README.txt"
echo "  Applications →"
echo "  ${INSTALL_FOLDER_NAME}/"
echo "    ${GUI_APP_NAME}"
echo "    Forester.app"
echo "    addons/blender/difference_machine/"
echo ""
echo "Install path: /Applications/${INSTALL_FOLDER_NAME}/"
echo -e "${YELLOW}Note: Code signing and notarization are not applied by this script.${NC}"
