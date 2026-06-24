#!/bin/bash
# macOS build entry: Forester payload, optional GUI, optional DMG installer.
# Usage: ./builder/macos/build.sh [--gui] [--dmg] [--write-local-config]

set -euo pipefail

PLATFORM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILDER_DIR="$(cd "${PLATFORM_DIR}/.." && pwd)"
SCRIPTS_DIR="${BUILDER_DIR}/scripts"

# shellcheck source=../scripts/lib/detect_platform.sh
. "${SCRIPTS_DIR}/lib/detect_platform.sh"
# shellcheck source=../scripts/lib/setup_dev_path.sh
. "${SCRIPTS_DIR}/lib/setup_dev_path.sh"
# shellcheck source=../scripts/lib/build_common.sh
. "${SCRIPTS_DIR}/lib/build_common.sh"
# shellcheck source=../scripts/lib/dfm_dist.sh
. "${SCRIPTS_DIR}/lib/dfm_dist.sh"

WRITE_LOCAL_CONFIG=false
BUILD_GUI=false
BUILD_DMG=false

for arg in "$@"; do
    case "${arg}" in
        --write-local-config) WRITE_LOCAL_CONFIG=true ;;
        --gui) BUILD_GUI=true ;;
        --dmg) BUILD_DMG=true; BUILD_GUI=true ;;
        -h|--help)
            echo "Usage: $(basename "$0") [--gui] [--dmg] [--write-local-config]"
            echo ""
            echo "  Forester + Blender addon → builder/dist/payload"
            echo "  --gui                 Wails GUI → dist/payload/apps/"
            echo "  --dmg                 GUI + DifferenceMachine-*-macos.dmg"
            echo "  --write-local-config  Write ~/.dfm/setup.cfg for local dev"
            exit 0
            ;;
        *)
            echo "Unknown option: ${arg}" >&2
            exit 1
            ;;
    esac
done

detect_platform
if [ "${CURRENT_OS}" != "macos" ]; then
    echo "ERROR: Run on macOS (current: ${CURRENT_OS})" >&2
    exit 1
fi
setup_dev_path
ensure_dfm_dist "${BUILDER_DIR}"

echo ">>> Build Forester"
build_common_forester

if [ "${BUILD_GUI}" = true ]; then
    echo ""
    echo ">>> Build GUI"
    build_common_gui
fi

echo ""
echo ">>> Stage distribution"
build_common_stage "${BUILD_GUI}"

if [ "${WRITE_LOCAL_CONFIG}" = true ]; then
    echo ""
    echo ">>> Write ~/.dfm/setup.cfg"
    build_common_write_config
fi

if [ "${BUILD_DMG}" = true ]; then
    echo ""
    echo ">>> Package DMG"
    bash "${PLATFORM_DIR}/package_dmg.sh"
fi

echo ""
echo ">>> Clean staging"
build_common_clean

build_common_print_done
if [ "${BUILD_DMG}" = true ]; then
    echo "DMG: ${BUILDER_DIR}/dist/DifferenceMachine-"*"-macos.dmg"
fi
