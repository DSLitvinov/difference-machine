#!/bin/bash
# Full build: Forester + API + Blender addon → ~/dfm_distr (or DFM_DIST).
# Usage: ./builder/build.sh [--write-local-config]

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
        -h|--help)
            echo "Usage: $(basename "$0") [--gui] [--dmg] [--write-local-config]"
            echo ""
            echo "  Builds forester, API, and Blender addon into DFM_DIST."
            echo "  --gui              Also build Wails GUI (.app, macOS only)"
            echo "  --dmg              macOS: build GUI + assemble DifferenceMachine-*.dmg"
            echo "  --write-local-config  Write ~/.dfm/setup.cfg for local dev"
            echo ""
            echo "  Default output: \${HOME}/dfm_distr"
            echo "  DMG output: builder/dist/DifferenceMachine-<version>-macos.dmg"
            echo "  Override with: DFM_DIST=/path/to/output ./builder/build.sh"
            echo ""
            echo "  GUI requires: Go, Node.js, Wails CLI (auto-installed if missing), Xcode CLT."
            echo "  PATH is extended with \$(go env GOPATH)/bin and Homebrew bins on macOS."
            exit 0
            ;;
    esac
done

detect_platform
setup_dev_path

echo ">>> Step 1: Build Forester"
bash "${SCRIPTS_DIR}/build_forester.sh"

if [ "${BUILD_GUI}" = true ]; then
    echo ""
    echo ">>> Step 1b: Build GUI (macOS Wails)"
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

echo ""
echo ">>> Step 3: Clean staging artifacts"
bash "${SCRIPTS_DIR}/clean_build.sh"

DFM_DIST="${DFM_DIST:-${HOME}/dfm_distr}"
echo ""
echo "Done: ${DFM_DIST}"
if [ "${BUILD_DMG}" = true ]; then
    echo "DMG: ${SCRIPT_DIR}/dist/DifferenceMachine-"*"-macos.dmg"
fi
