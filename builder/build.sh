#!/bin/bash
# Full build: Forester + API + Blender addon → ~/dfm_distr (or DFM_DIST).
# Usage: ./builder/build.sh [--gui] [--dmg|--tar|--zip|--release] [--write-local-config]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="${SCRIPT_DIR}/scripts"
# shellcheck source=scripts/lib/detect_platform.sh
. "${SCRIPTS_DIR}/lib/detect_platform.sh"
# shellcheck source=scripts/lib/setup_dev_path.sh
. "${SCRIPTS_DIR}/lib/setup_dev_path.sh"

WRITE_LOCAL_CONFIG=false
BUILD_GUI=false
BUILD_DMG=false
BUILD_TAR=false
BUILD_ZIP=false
BUILD_RELEASE=false

for arg in "$@"; do
    case "${arg}" in
        --write-local-config)
            WRITE_LOCAL_CONFIG=true
            ;;
        --gui)
            BUILD_GUI=true
            ;;
        --dmg)
            BUILD_DMG=true
            BUILD_GUI=true
            ;;
        --tar)
            BUILD_TAR=true
            BUILD_GUI=true
            ;;
        --zip)
            BUILD_ZIP=true
            BUILD_GUI=true
            ;;
        --release)
            BUILD_RELEASE=true
            BUILD_GUI=true
            ;;
        -h|--help)
            echo "Usage: $(basename "$0") [--gui] [--dmg|--tar|--zip|--release] [--write-local-config]"
            echo ""
            echo "  Builds forester, API, and Blender addon into DFM_DIST."
            echo "  --gui              Also build Wails GUI"
            echo "  --dmg              macOS: build GUI + assemble DifferenceMachine-*-macos.dmg"
            echo "  --tar              Linux: build GUI + assemble DifferenceMachine-*-linux.tar.gz"
            echo "  --zip              Windows: build GUI + assemble DifferenceMachine-*-windows.zip"
            echo "  --release          Platform release archive (--dmg / --tar / --zip)"
            echo "  --write-local-config  Write ~/.dfm/setup.cfg for local dev"
            echo ""
            echo "  Default output: \${HOME}/dfm_distr"
            echo "  Release archives: builder/dist/DifferenceMachine-<version>-<platform>.*"
            echo "  Override with: DFM_DIST=/path/to/output ./builder/build.sh"
            echo ""
            echo "  GUI requires: Go, Node.js, Wails CLI (auto-installed if missing)."
            echo "  macOS: Xcode CLT · Linux: GTK3 + WebKitGTK dev · Windows: WebView2 + MinGW/MSVC"
            echo "  PATH is extended with \$(go env GOPATH)/bin (and Homebrew bins on macOS)."
            exit 0
            ;;
    esac
done

detect_platform
setup_dev_path

if [ "${BUILD_RELEASE}" = true ]; then
    case "${CURRENT_OS}" in
        macos) BUILD_DMG=true ;;
        linux) BUILD_TAR=true ;;
        windows) BUILD_ZIP=true ;;
        *)
            echo "ERROR: --release is not supported on ${CURRENT_OS}" >&2
            exit 1
            ;;
    esac
fi

echo ">>> Step 1: Build Forester"
bash "${SCRIPTS_DIR}/build_forester.sh"

if [ "${BUILD_GUI}" = true ]; then
    echo ""
    echo ">>> Step 1b: Build GUI (Wails, ${CURRENT_OS})"
    bash "${SCRIPTS_DIR}/build_gui.sh"
fi

echo ""
echo ">>> Step 2: Stage distribution"
BUILD_GUI="${BUILD_GUI}" bash "${SCRIPTS_DIR}/stage_dist.sh"

if [ "${WRITE_LOCAL_CONFIG}" = true ]; then
    echo ""
    echo ">>> Step 2b: Write ~/.dfm/setup.cfg"
    bash "${SCRIPTS_DIR}/write_setup_cfg.sh"
fi

if [ "${BUILD_DMG}" = true ]; then
    if [ "${CURRENT_OS}" != "macos" ]; then
        echo "ERROR: --dmg is macOS only (current: ${CURRENT_OS})" >&2
        exit 1
    fi
    echo ""
    echo ">>> Step 2c: Package macOS DMG"
    bash "${SCRIPTS_DIR}/package_macos_dmg.sh"
fi

if [ "${BUILD_TAR}" = true ]; then
    if [ "${CURRENT_OS}" != "linux" ]; then
        echo "ERROR: --tar is Linux only (current: ${CURRENT_OS})" >&2
        exit 1
    fi
    echo ""
    echo ">>> Step 2c: Package Linux tar.gz"
    bash "${SCRIPTS_DIR}/package_linux_tar.sh"
fi

if [ "${BUILD_ZIP}" = true ]; then
    if [ "${CURRENT_OS}" != "windows" ]; then
        echo "ERROR: --zip is Windows only (current: ${CURRENT_OS})" >&2
        exit 1
    fi
    echo ""
    echo ">>> Step 2c: Package Windows zip"
    bash "${SCRIPTS_DIR}/package_windows_zip.sh"
fi

echo ""
echo ">>> Step 3: Clean staging artifacts"
bash "${SCRIPTS_DIR}/clean_build.sh"

DFM_DIST="${DFM_DIST:-${HOME}/dfm_distr}"
echo ""
echo "Done: ${DFM_DIST}"
if [ "${BUILD_DMG}" = true ]; then
    echo "DMG: ${SCRIPT_DIR}/dist/DifferenceMachine-"*"-macos.dmg"
fi
if [ "${BUILD_TAR}" = true ]; then
    echo "Archive: ${SCRIPT_DIR}/dist/DifferenceMachine-"*"-linux.tar.gz"
fi
if [ "${BUILD_ZIP}" = true ]; then
    echo "Archive: ${SCRIPT_DIR}/dist/DifferenceMachine-"*"-windows.zip"
fi
