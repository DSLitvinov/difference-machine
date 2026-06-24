#!/bin/bash
# Assemble distribution payload: forester, API, Blender addon → DFM_DIST (default ~/dfm_distr)

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/detect_platform.sh
. "${SCRIPT_DIR}/lib/detect_platform.sh"
detect_platform

BUILDER_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROJECT_ROOT="$(cd "${BUILDER_DIR}/.." && pwd)"
STAGING_DIR="${BUILDER_DIR}/.staging/forester"
DFM_DIST="${DFM_DIST:-${HOME}/dfm_distr}"
BUILD_GUI="${BUILD_GUI:-false}"
STAGING_GUI="${BUILDER_DIR}/.staging/gui"

SOURCES_DIR="${PROJECT_ROOT}/sources"
FORESTER_API_SRC="${SOURCES_DIR}/forester/api"
if [ ! -d "${FORESTER_API_SRC}" ]; then
    FORESTER_API_SRC="${PROJECT_ROOT}/forester/api"
fi

ADDON_REL="addons/blender/difference_machine"

echo "=========================================="
echo "  Stage distribution (${CURRENT_OS})"
echo "=========================================="
echo "Target: ${DFM_DIST}"
echo ""

if [ ! -d "${STAGING_DIR}/bin" ]; then
    echo -e "${RED}Staging not found. Run build_forester.sh first.${NC}"
    exit 1
fi

rm -rf "${DFM_DIST}"
mkdir -p "${DFM_DIST}/bin" "${DFM_DIST}/lib"

echo "=== Copy Forester ==="
cp -R "${STAGING_DIR}/bin/." "${DFM_DIST}/bin/"
mkdir -p "${DFM_DIST}/lib"
for lib in "${STAGING_DIR}/lib/"*.so "${STAGING_DIR}/lib/"*.dylib "${STAGING_DIR}/lib/"*.dll; do
    [ -f "${lib}" ] || continue
    cp "${lib}" "${DFM_DIST}/lib/"
done
chmod +x "${DFM_DIST}/bin/"* 2>/dev/null || true
chmod +x "${DFM_DIST}/lib/"*.so "${DFM_DIST}/lib/"*.dylib 2>/dev/null || true
echo -e "${GREEN}✓ bin/ and lib/${NC}"

echo ""
echo "=== Copy addons ==="
"${SCRIPT_DIR}/copy_addons.sh" "${DFM_DIST}"
echo ""

echo "=== Embed API in Blender addon ==="
ADDON_API_DIR="${DFM_DIST}/${ADDON_REL}/api"
mkdir -p "${ADDON_API_DIR}/python"

if [ -f "${DFM_DIST}/lib/${API_LIB_NAME}" ]; then
    cp "${DFM_DIST}/lib/${API_LIB_NAME}" "${ADDON_API_DIR}/"
    echo -e "${GREEN}✓ Native library → ${ADDON_REL}/api/${NC}"
else
    echo -e "${YELLOW}⚠ API library not found: ${DFM_DIST}/lib/${API_LIB_NAME}${NC}"
fi

if [ -d "${FORESTER_API_SRC}" ]; then
    if [ -f "${FORESTER_API_SRC}/python_bindings_json.py" ]; then
        cp "${FORESTER_API_SRC}/python_bindings_json.py" "${ADDON_API_DIR}/python/"
    fi
    echo -e "${GREEN}✓ Python bindings → ${ADDON_REL}/api/python/${NC}"
fi

GUI_MANIFEST_ENTRY=""
if [ "${BUILD_GUI}" = true ] && [ -d "${STAGING_GUI}" ]; then
    echo ""
    echo "=== Copy GUI app (macOS) ==="
    shopt -s nullglob
    GUI_APPS=("${STAGING_GUI}"/*.app)
    shopt -u nullglob
    if [ "${#GUI_APPS[@]}" -gt 0 ]; then
        mkdir -p "${DFM_DIST}/apps"
        for app in "${GUI_APPS[@]}"; do
            app_name="$(basename "${app}")"
            rm -rf "${DFM_DIST}/apps/${app_name}"
            cp -R "${app}" "${DFM_DIST}/apps/${app_name}"
            echo -e "${GREEN}✓ apps/${app_name}${NC}"
            GUI_MANIFEST_ENTRY="\"gui_app\": \"apps/${app_name}\""
        done
    else
        echo -e "${YELLOW}⚠ BUILD_GUI=true but no .app in ${STAGING_GUI}${NC}"
    fi
elif [ "${BUILD_GUI}" = true ]; then
    echo -e "${YELLOW}⚠ BUILD_GUI=true but staging GUI not found: ${STAGING_GUI}${NC}"
fi

echo ""
echo "=== Metadata ==="
if [ -f "${STAGING_DIR}/VERSION" ]; then
    cp "${STAGING_DIR}/VERSION" "${DFM_DIST}/VERSION"
else
    echo "unknown" > "${DFM_DIST}/VERSION"
fi

cp "${BUILDER_DIR}/setup.cfg.template" "${DFM_DIST}/setup.cfg.template"

if [ -n "${GUI_MANIFEST_ENTRY}" ]; then
    MANIFEST_COMPONENTS=$(cat << EOF
    "forester_cli": "bin/${FORESTER_CLI_NAME}",
    "forester_api": "lib/${API_LIB_NAME}",
    "blender_addon": "${ADDON_REL}",
    ${GUI_MANIFEST_ENTRY}
EOF
)
else
    MANIFEST_COMPONENTS=$(cat << EOF
    "forester_cli": "bin/${FORESTER_CLI_NAME}",
    "forester_api": "lib/${API_LIB_NAME}",
    "blender_addon": "${ADDON_REL}"
EOF
)
fi

cat > "${DFM_DIST}/manifest.json" << EOF
{
  "format": 1,
  "platform": "${CURRENT_OS}",
  "components": {
${MANIFEST_COMPONENTS}
  },
  "install_defaults": {
    "forester_prefix": "${DEFAULT_PREFIX}",
    "blender_addon_name": "difference_machine"
  }
}
EOF

cat > "${DFM_DIST}/README.txt" << 'EOF'
Difference Machine distribution payload (dfm_distr)

This folder is a self-contained build output. A separate installer will
copy forester and the Blender addon to system paths.

Layout:
  bin/     Forester CLI
  lib/     Forester API native library
  addons/  Blender addon (API embedded in addons/blender/difference_machine/api/)
  apps/    Forester GUI .app (macOS, when built with --gui)

Developer setup (manual):
  1. Add bin/ to PATH, or run bin/forester directly.
  2. Symlink the addon into Blender extensions, for example:
       Linux:  ~/.config/blender/<version>/extensions/user_default/difference_machine
       macOS:  ~/Library/Application Support/Blender/<version>/extensions/user_default/difference_machine
       Windows: %APPDATA%\Blender Foundation\Blender\<version>\extensions\user_default\difference_machine
  3. Use setup.cfg.template as a reference for ~/.dfm/setup.cfg after install.

Build again: ./builder/build.sh from the project root.
EOF

echo -e "${GREEN}✓ manifest.json, setup.cfg.template, README.txt${NC}"
echo ""
echo -e "${GREEN}Distribution ready: ${DFM_DIST}${NC}"
