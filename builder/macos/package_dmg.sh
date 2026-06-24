#!/bin/bash
# Assemble macOS DMG: "Difference Machine" install folder + README at volume root.

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PLATFORM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILDER_DIR="$(cd "${PLATFORM_DIR}/.." && pwd)"
SCRIPTS_DIR="${BUILDER_DIR}/scripts"

# shellcheck source=../scripts/lib/dfm_dist.sh
. "${SCRIPTS_DIR}/lib/dfm_dist.sh"
ensure_dfm_dist "${BUILDER_DIR}"

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
    echo -e "${RED}GUI app not found. Build with: ./builder/macos/build.sh --gui${NC}" >&2
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
OUT_DIR="${STAGING}" bash "${PLATFORM_DIR}/wrap_forester_app.sh"

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
ADDON_ZIP_REL="addons/blender/difference_machine.zip"
mkdir -p "${INSTALL_DIR}/addons/blender"
"${SCRIPTS_DIR}/package_blender_addon_zip.sh" "${DFM_DIST}/${ADDON_REL}" "${INSTALL_DIR}/${ADDON_ZIP_REL}"
echo -e "${GREEN}✓ ${ADDON_ZIP_REL}${NC}"

cat > "${DMG_LAYOUT}/README.txt" << EOF
Difference Machine — macOS install
==================================

1. Drag the "${INSTALL_FOLDER_NAME}" folder into Applications
   (use the Applications shortcut on the right).

   After install:
     /Applications/${INSTALL_FOLDER_NAME}/${GUI_APP_NAME}
     /Applications/${INSTALL_FOLDER_NAME}/Forester.app
     /Applications/${INSTALL_FOLDER_NAME}/addons/blender/difference_machine.zip

2. Install the Blender addon (once per Blender version), either:
   Blender → Edit → Preferences → Get Extensions → Install from Disk…
   and select difference_machine.zip from the install folder above;

   or symlink after first launch of "${GUI_APP_NAME}" (extracts the zip):
     ln -sf "/Applications/${INSTALL_FOLDER_NAME}/addons/blender/difference_machine" \\
       "\$HOME/Library/Application Support/Blender/<version>/extensions/user_default/difference_machine"

   Replace <version> with your Blender version (e.g. 4.5).

3. Launch "${GUI_APP_NAME}" once. It creates ~/.dfm/setup.cfg with paths
   to Forester and the addon (same install folder).

4. Open Blender and enable the "Difference Machine" extension.

Forester.app — double-click opens Terminal with forester on PATH.
Persistent CLI (optional):
  sudo ln -sfn "/Applications/${INSTALL_FOLDER_NAME}/Forester.app/Contents/Resources/bin/forester" /usr/local/bin/forester
Or run directly:
  "/Applications/${INSTALL_FOLDER_NAME}/Forester.app/Contents/Resources/bin/forester" status

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
echo "Install path: /Applications/${INSTALL_FOLDER_NAME}/"
echo -e "${YELLOW}Note: Code signing and notarization are not applied by this script.${NC}"
