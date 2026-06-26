#!/bin/bash
# Linux build entry: Forester payload, optional GUI, optional tar.gz release.
# Usage: ./builder/linux/build.sh [--gui] [--tar] [--write-local-config]

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
BUILD_TAR=false

for arg in "$@"; do
    case "${arg}" in
        --write-local-config) WRITE_LOCAL_CONFIG=true ;;
        --gui) BUILD_GUI=true ;;
        --tar) BUILD_TAR=true; BUILD_GUI=true ;;
        -h|--help)
            echo "Usage: $(basename "$0") [--gui] [--tar] [--write-local-config]"
            echo ""
            echo "  Forester + Blender addon → builder/dist/payload"
            echo "  --gui                 Wails GUI → dist/payload/apps/"
            echo "  --tar                 GUI + DifferenceMachine-*-linux.tar.gz"
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
if [ "${CURRENT_OS}" != "linux" ]; then
    echo "ERROR: Run on Linux (current: ${CURRENT_OS})" >&2
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

if [ "${BUILD_TAR}" = true ]; then
    echo ""
    echo ">>> Package tar.gz"
    bash "${PLATFORM_DIR}/package_tar.sh"
fi

echo ""
echo ">>> Clean staging"
build_common_clean

build_common_print_done
if [ "${BUILD_TAR}" = true ]; then
    echo "Archive: ${BUILDER_DIR}/dist/DifferenceMachine-"*"-linux.tar.gz"
fi
