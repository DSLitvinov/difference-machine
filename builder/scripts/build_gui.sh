#!/bin/bash
# Build Wails GUI → builder/.staging/gui/ (macOS .app, Linux binary, Windows .exe)

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "${SCRIPT_DIR}/lib/detect_platform.sh"
# shellcheck source=lib/setup_dev_path.sh
. "${SCRIPT_DIR}/lib/setup_dev_path.sh"
# shellcheck source=lib/wails_toolchain.sh
. "${SCRIPT_DIR}/lib/wails_toolchain.sh"

detect_platform
setup_dev_path

BUILDER_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROJECT_ROOT="$(cd "${BUILDER_DIR}/.." && pwd)"
GUI_DIR="${PROJECT_ROOT}/sources/gui"
STAGING_GUI="${BUILDER_DIR}/.staging/gui"

if [ "${CURRENT_OS}" = "unknown" ]; then
    echo -e "${RED}Unsupported platform for GUI build.${NC}" >&2
    exit 1
fi

if [ ! -d "${GUI_DIR}" ]; then
    echo -e "${RED}GUI sources not found: ${GUI_DIR}${NC}" >&2
    exit 1
fi

echo "=========================================="
echo "  Build GUI (Wails, ${CURRENT_OS})"
echo "=========================================="
echo "Sources: ${GUI_DIR}"
echo ""

echo "=== Toolchain checks ==="
check_wails_go_node || exit 1
check_wails_platform_deps || exit 1
ensure_wails_cli || exit 1

echo -e "${GREEN}✓ Wails: $(wails version 2>/dev/null | head -1 || wails --version 2>/dev/null || echo wails)${NC}"
run_wails_doctor_summary

echo ""
echo "=== Generate app icons ==="
(
    cd "${GUI_DIR}/frontend"
    if [ ! -d node_modules ]; then
        npm install
    fi
    npm run icons:generate
)

run_wails_build "${GUI_DIR}"

BUILD_BIN="${GUI_DIR}/build/bin"
if [ ! -d "${BUILD_BIN}" ]; then
    echo -e "${RED}Wails build output not found: ${BUILD_BIN}${NC}" >&2
    exit 1
fi

FORESTER_BIN_STAGING="${BUILDER_DIR}/.staging/forester/bin"
# shellcheck source=lib/copy_ffmpeg_sidecar.sh
. "${SCRIPT_DIR}/lib/copy_ffmpeg_sidecar.sh"
copy_ffmpeg_sidecar "${FORESTER_BIN_STAGING}" "${BUILD_BIN}"

copy_ffmpeg_into_macos_app() {
    local app_bundle="$1"
    local source_bin="$2"
    local resources_bin="${app_bundle}/Contents/Resources/bin"

    if [ ! -d "${app_bundle}" ] || [ ! -d "${source_bin}" ]; then
        return 0
    fi
    if [ ! -f "${source_bin}/${FFMPEG_BIN_NAME}" ]; then
        return 0
    fi

    mkdir -p "${resources_bin}"
    cp "${source_bin}/${FFMPEG_BIN_NAME}" "${resources_bin}/${FFMPEG_BIN_NAME}"
    chmod +x "${resources_bin}/${FFMPEG_BIN_NAME}" 2>/dev/null || true
}

echo ""
echo "=== Stage GUI ==="
rm -rf "${STAGING_GUI}"
mkdir -p "${STAGING_GUI}"

case "${CURRENT_OS}" in
    macos)
        shopt -s nullglob
        APP_BUNDLES=("${BUILD_BIN}"/*.app)
        shopt -u nullglob

        if [ "${#APP_BUNDLES[@]}" -eq 0 ]; then
            echo -e "${RED}No .app bundle in ${BUILD_BIN}${NC}" >&2
            exit 1
        fi

        cp -R "${APP_BUNDLES[0]}" "${STAGING_GUI}/${GUI_STAGE_NAME}"
        copy_ffmpeg_into_macos_app "${APP_BUNDLES[0]}" "${FORESTER_BIN_STAGING}"
        copy_ffmpeg_into_macos_app "${STAGING_GUI}/${GUI_STAGE_NAME}" "${FORESTER_BIN_STAGING}"
        ;;
    linux)
        GUI_BIN="${BUILD_BIN}/${GUI_WAILS_OUTPUT}"
        if [ ! -f "${GUI_BIN}" ]; then
            echo -e "${RED}GUI binary not found: ${GUI_BIN}${NC}" >&2
            exit 1
        fi
        cp "${GUI_BIN}" "${STAGING_GUI}/${GUI_STAGE_NAME}"
        chmod +x "${STAGING_GUI}/${GUI_STAGE_NAME}"
        ;;
    windows)
        GUI_EXE="${BUILD_BIN}/${GUI_WAILS_OUTPUT}.exe"
        if [ ! -f "${GUI_EXE}" ]; then
            echo -e "${RED}GUI executable not found: ${GUI_EXE}${NC}" >&2
            exit 1
        fi
        cp "${GUI_EXE}" "${STAGING_GUI}/${GUI_STAGE_NAME}"
        copy_ffmpeg_sidecar "${FORESTER_BIN_STAGING}" "${STAGING_GUI}"
        ;;
esac

echo -e "${GREEN}✓ ${STAGING_GUI}/${GUI_STAGE_NAME}${NC}"
echo ""
echo -e "${GREEN}GUI build complete.${NC}"
