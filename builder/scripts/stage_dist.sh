#!/bin/bash
# Assemble distribution payload: forester, API, Blender addon → DFM_DIST (default builder/dist/payload)

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/detect_platform.sh
. "${SCRIPT_DIR}/lib/detect_platform.sh"
# shellcheck source=lib/dfm_dist.sh
. "${SCRIPT_DIR}/lib/dfm_dist.sh"
detect_platform

BUILDER_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROJECT_ROOT="$(cd "${BUILDER_DIR}/.." && pwd)"
ensure_dfm_dist "${BUILDER_DIR}"
STAGING_DIR="${BUILDER_DIR}/.staging/forester"
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

if [ -d "${STAGING_DIR}/icons/share" ]; then
    mkdir -p "${DFM_DIST}/share"
    cp -R "${STAGING_DIR}/icons/share/." "${DFM_DIST}/share/"
    echo -e "${GREEN}✓ share/icons/ (Forester)${NC}"
fi
if [ "${CURRENT_OS}" = "windows" ] && [ -f "${STAGING_DIR}/icons/forester.ico" ]; then
    cp "${STAGING_DIR}/icons/forester.ico" "${DFM_DIST}/bin/forester.ico"
    echo -e "${GREEN}✓ bin/forester.ico${NC}"
fi

echo -e "${GREEN}✓ bin/ and lib/${NC}"

echo ""
echo "=== Copy Forester scripts ==="
FORESTER_SCRIPTS="${SOURCES_DIR}/forester/scripts"
if [ -d "${FORESTER_SCRIPTS}" ]; then
    mkdir -p "${DFM_DIST}/share/scripts"
    cp -R "${FORESTER_SCRIPTS}/." "${DFM_DIST}/share/scripts/"
    echo -e "${GREEN}✓ share/scripts/ (merge_apply_background.py)${NC}"
fi

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
    echo "=== Copy GUI (${CURRENT_OS}) ==="
    mkdir -p "${DFM_DIST}/apps"

    case "${CURRENT_OS}" in
        macos)
            shopt -s nullglob
            GUI_APPS=("${STAGING_GUI}"/*.app)
            shopt -u nullglob
            if [ "${#GUI_APPS[@]}" -gt 0 ]; then
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
            ;;
        linux|windows)
            if [ -f "${STAGING_GUI}/${GUI_STAGE_NAME}" ]; then
                cp "${STAGING_GUI}/${GUI_STAGE_NAME}" "${DFM_DIST}/apps/${GUI_STAGE_NAME}"
                if [ "${CURRENT_OS}" = "linux" ]; then
                    chmod +x "${DFM_DIST}/apps/${GUI_STAGE_NAME}"
                    GUI_ICONS="${PROJECT_ROOT}/sources/gui/build/share/icons"
                    if [ -d "${GUI_ICONS}" ]; then
                        mkdir -p "${DFM_DIST}/share/icons"
                        cp -R "${GUI_ICONS}/." "${DFM_DIST}/share/icons/"
                        echo -e "${GREEN}✓ share/icons/ (GUI)${NC}"
                    fi
                fi
                # shellcheck source=lib/copy_ffmpeg_sidecar.sh
                . "${SCRIPT_DIR}/lib/copy_ffmpeg_sidecar.sh"
                copy_ffmpeg_sidecar "${DFM_DIST}/bin" "${DFM_DIST}/apps"
                echo -e "${GREEN}✓ apps/${GUI_STAGE_NAME}${NC}"
                GUI_MANIFEST_ENTRY="\"gui_app\": \"apps/${GUI_STAGE_NAME}\""
            else
                echo -e "${YELLOW}⚠ BUILD_GUI=true but ${GUI_STAGE_NAME} not found in ${STAGING_GUI}${NC}"
            fi
            ;;
    esac
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
    "ffmpeg": "bin/${FFMPEG_BIN_NAME}",
    "blender_addon": "${ADDON_REL}",
    ${GUI_MANIFEST_ENTRY}
EOF
)
else
    MANIFEST_COMPONENTS=$(cat << EOF
    "forester_cli": "bin/${FORESTER_CLI_NAME}",
    "forester_api": "lib/${API_LIB_NAME}",
    "ffmpeg": "bin/${FFMPEG_BIN_NAME}",
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
    "macos_install_folder": "Difference Machine",
    "gui_app": "apps/Difference Machine.app",
    "forester_app": "Forester.app",
    "blender_addon_name": "difference_machine"
  }
}
EOF

cat > "${DFM_DIST}/README.txt" << 'EOF'
Difference Machine distribution payload

This folder is a self-contained build output. A separate installer will
copy forester and the Blender addon to system paths.

Layout:
  bin/     Forester CLI and bundled ffmpeg (GPL, BtbN/FFmpeg-Builds)
  lib/     Forester API native library
  addons/  Blender addon (API embedded in addons/blender/difference_machine/api/)
  apps/    Difference Machine GUI (macOS .app, Linux binary, Windows .exe when built with --gui)

macOS release DMG: ./builder/macos/build.sh --dmg
Linux release:     ./builder/linux/build.sh --tar
Windows installer: ./builder/windows/build.sh --installer
Windows portable:  ./builder/windows/build.sh --zip

Developer setup (manual):
  1. Add bin/ to PATH, or run bin/forester directly.
  2. Symlink the addon into Blender extensions, for example:
       Linux:  ~/.config/blender/<version>/extensions/user_default/difference_machine
       macOS:  ~/Library/Application Support/Blender/<version>/extensions/user_default/difference_machine
       Windows: %APPDATA%\Blender Foundation\Blender\<version>\extensions\user_default\difference_machine
  3. Use setup.cfg.template as a reference for ~/.dfm/setup.cfg after install.

Build again: ./builder/macos/build.sh | ./builder/linux/build.sh | ./builder/windows/build.sh
EOF

echo -e "${GREEN}✓ manifest.json, setup.cfg.template, README.txt${NC}"
echo ""
echo -e "${GREEN}Distribution ready: ${DFM_DIST}${NC}"
