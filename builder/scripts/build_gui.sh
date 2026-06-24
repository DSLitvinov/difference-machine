#!/bin/bash
# Build Wails GUI for macOS → builder/.staging/gui/*.app

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/detect_platform.sh
. "${SCRIPT_DIR}/lib/detect_platform.sh"
# shellcheck source=lib/setup_dev_path.sh
. "${SCRIPT_DIR}/lib/setup_dev_path.sh"

detect_platform
setup_dev_path

BUILDER_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROJECT_ROOT="$(cd "${BUILDER_DIR}/.." && pwd)"
GUI_DIR="${PROJECT_ROOT}/sources/gui"
STAGING_GUI="${BUILDER_DIR}/.staging/gui"
INSTALL_WAILS="${INSTALL_WAILS:-true}"
WAILS_PACKAGE="${WAILS_PACKAGE:-github.com/wailsapp/wails/v2/cmd/wails@latest}"

if [ "${CURRENT_OS}" != "macos" ]; then
    echo -e "${RED}GUI build is supported on macOS only (current: ${CURRENT_OS}).${NC}" >&2
    exit 1
fi

if [ ! -d "${GUI_DIR}" ]; then
    echo -e "${RED}GUI sources not found: ${GUI_DIR}${NC}" >&2
    exit 1
fi

echo "=========================================="
echo "  Build GUI (Wails, macOS)"
echo "=========================================="
echo "Sources: ${GUI_DIR}"
echo ""

setup_dev_path

echo "=== Toolchain checks ==="
require_command go "Install Go 1.22+: brew install go" || exit 1
require_command node "Install Node.js 20+ LTS: brew install node" || exit 1
require_command npm "npm should ship with Node.js" || exit 1

GO_VERSION="$(go version)"
echo -e "${GREEN}✓ Go: ${GO_VERSION}${NC}"
echo -e "${GREEN}✓ Node: $(node --version)${NC}"
echo -e "${GREEN}✓ npm: $(npm --version)${NC}"

if ! xcode-select -p >/dev/null 2>&1; then
    echo -e "${RED}Xcode Command Line Tools are required.${NC}" >&2
    echo "Run: xcode-select --install" >&2
    exit 1
fi
echo -e "${GREEN}✓ Xcode Command Line Tools${NC}"

if ! command -v wails >/dev/null 2>&1; then
    if [ "${INSTALL_WAILS}" = true ]; then
        echo -e "${YELLOW}Wails CLI not found — installing via go install...${NC}"
        go install "${WAILS_PACKAGE}"
        setup_dev_path
    fi
fi

if ! command -v wails >/dev/null 2>&1; then
    echo -e "${RED}Wails CLI not found in PATH.${NC}" >&2
    echo "Ensure \$(go env GOPATH)/bin is on PATH, or run:" >&2
    echo "  go install ${WAILS_PACKAGE}" >&2
    exit 1
fi

echo -e "${GREEN}✓ Wails: $(wails version 2>/dev/null | head -1 || wails --version 2>/dev/null || echo wails)${NC}"

if command -v wails >/dev/null 2>&1; then
    echo ""
    echo "=== wails doctor (summary) ==="
    if ! wails doctor 2>&1 | tail -20; then
        echo -e "${YELLOW}⚠ wails doctor reported issues (continuing build)${NC}"
    fi
fi

echo ""
echo "=== wails build ==="
cd "${GUI_DIR}"
wails build

BUILD_BIN="${GUI_DIR}/build/bin"
if [ ! -d "${BUILD_BIN}" ]; then
    echo -e "${RED}Wails build output not found: ${BUILD_BIN}${NC}" >&2
    exit 1
fi

shopt -s nullglob
APP_BUNDLES=("${BUILD_BIN}"/*.app)
shopt -u nullglob

if [ "${#APP_BUNDLES[@]}" -eq 0 ]; then
    echo -e "${RED}No .app bundle in ${BUILD_BIN}${NC}" >&2
    exit 1
fi

APP_SRC="${APP_BUNDLES[0]}"
GUI_APP_NAME="Difference Machine.app"

echo ""
echo "=== Stage GUI app ==="
rm -rf "${STAGING_GUI}"
mkdir -p "${STAGING_GUI}"
cp -R "${APP_SRC}" "${STAGING_GUI}/${GUI_APP_NAME}"

echo -e "${GREEN}✓ ${STAGING_GUI}/${GUI_APP_NAME}${NC}"
echo ""
echo -e "${GREEN}GUI build complete.${NC}"
