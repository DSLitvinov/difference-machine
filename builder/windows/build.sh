#!/bin/bash
# Windows build entry: Forester payload, optional GUI, zip or NSIS installer.
# Usage: ./builder/windows/build.sh [--gui] [--zip|--installer] [--write-local-config]

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
BUILD_ZIP=false
BUILD_INSTALLER=false

for arg in "$@"; do
    case "${arg}" in
        --write-local-config) WRITE_LOCAL_CONFIG=true ;;
        --gui) BUILD_GUI=true ;;
        --zip) BUILD_ZIP=true; BUILD_GUI=true ;;
        --installer) BUILD_INSTALLER=true; BUILD_GUI=true ;;
        -h|--help)
            echo "Usage: $(basename "$0") [--gui] [--zip|--installer] [--write-local-config]"
            echo ""
            echo "  Forester + Blender addon → builder/dist/payload"
            echo "  --gui                 Wails GUI → dist/payload/apps/"
            echo "  --zip                 Portable DifferenceMachine-*-windows.zip"
            echo "  --installer           NSIS DifferenceMachine-*-windows-setup.exe"
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
if [ "${CURRENT_OS}" != "windows" ]; then
    echo "ERROR: Run on Windows (Git Bash / MSYS2; current: ${CURRENT_OS})" >&2
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

if [ "${BUILD_ZIP}" = true ]; then
    echo ""
    echo ">>> Package zip"
    bash "${PLATFORM_DIR}/package_zip.sh"
fi

if [ "${BUILD_INSTALLER}" = true ]; then
    echo ""
    echo ">>> Package NSIS installer"
    bash "${PLATFORM_DIR}/package_nsis.sh"
fi

echo ""
echo ">>> Clean staging"
build_common_clean

build_common_print_done
if [ "${BUILD_ZIP}" = true ]; then
    echo "Archive: ${BUILDER_DIR}/dist/DifferenceMachine-"*"-windows.zip"
fi
if [ "${BUILD_INSTALLER}" = true ]; then
    echo "Installer: ${BUILDER_DIR}/dist/DifferenceMachine-"*"-windows-setup.exe"
fi
