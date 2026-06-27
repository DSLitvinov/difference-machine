#!/bin/bash
# Build Forester CLI and c-shared API into builder/.staging/forester/

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
FORESTER_DIR="${PROJECT_ROOT}/sources/forester"
if [ ! -d "${FORESTER_DIR}" ]; then
    FORESTER_DIR="${PROJECT_ROOT}/forester"
fi

STAGING_DIR="${BUILDER_DIR}/.staging/forester"
VERSION="${VERSION:-0.8}"

if [ "${CURRENT_OS}" = "unknown" ]; then
    echo -e "${RED}Unsupported platform${NC}"
    exit 1
fi

if [ ! -d "${FORESTER_DIR}" ]; then
    echo -e "${RED}Forester sources not found: ${FORESTER_DIR}${NC}"
    exit 1
fi

if ! command -v go >/dev/null 2>&1; then
    echo -e "${RED}Go is not installed${NC}"
    exit 1
fi

echo "=========================================="
echo "  Build Forester (${CURRENT_OS})"
echo "=========================================="
echo "Sources: ${FORESTER_DIR}"
echo "Staging: ${STAGING_DIR}"
echo ""

mkdir -p "${STAGING_DIR}/bin" "${STAGING_DIR}/lib"

echo "=== Generate Forester icons ==="
bash "${SCRIPT_DIR}/generate_forester_icons.sh"

cd "${FORESTER_DIR}"
go mod download
go mod tidy

BUILD_TIME="$(date -u '+%Y-%m-%d_%H:%M:%S')"
GIT_COMMIT="$(git -C "${PROJECT_ROOT}" rev-parse --short HEAD 2>/dev/null || echo "unknown")"
LDFLAGS="-X main.Version=${VERSION} -X main.BuildTime=${BUILD_TIME} -X main.GitCommit=${GIT_COMMIT}"

CLI_OUT="${STAGING_DIR}/bin/${FORESTER_CLI_NAME}"
echo "=== Building CLI ==="

FORESTER_ICO="${FORESTER_DIR}/icons/build/forester.ico"
WINDOWS_SYSO=""
if [ "${CURRENT_OS}" = "windows" ] && [ -f "${FORESTER_ICO}" ]; then
    WINDOWS_SYSO="${FORESTER_DIR}/cmd/forester/forester_windows.syso"
    echo "=== Embed Windows icon ==="
    if GO111MODULE=on go run github.com/tc-hib/go-winres@v0.3.3 simply \
        --icon "${FORESTER_ICO}" \
        --out "${WINDOWS_SYSO}" 2>/dev/null; then
        echo -e "${GREEN}✓ Windows resource: ${WINDOWS_SYSO}${NC}"
    else
        echo -e "${YELLOW}⚠ go-winres failed — building forester.exe without embedded icon${NC}"
        WINDOWS_SYSO=""
    fi
fi

go build -ldflags "${LDFLAGS}" -o "${CLI_OUT}" ./cmd/forester
if [ -n "${WINDOWS_SYSO}" ] && [ -f "${WINDOWS_SYSO}" ]; then
    rm -f "${WINDOWS_SYSO}"
fi
chmod +x "${CLI_OUT}" 2>/dev/null || true

echo "=== Building API (c-shared) ==="
API_OUT="${STAGING_DIR}/lib/${API_LIB_NAME}"
if go build -buildmode=c-shared -o "${API_OUT}" ./api; then
    chmod +x "${API_OUT}" 2>/dev/null || true
    echo -e "${GREEN}✓ API: ${API_OUT}${NC}"
else
    echo -e "${YELLOW}⚠ API build failed (CLI still available)${NC}"
fi

if [ "${CURRENT_OS}" = "macos" ] && [ "$(uname -m)" = "arm64" ]; then
    ARM_OUT="${STAGING_DIR}/lib/libforester_arm64.dylib"
    if GOOS=darwin GOARCH=arm64 go build -buildmode=c-shared -o "${ARM_OUT}" ./api 2>/dev/null; then
        chmod +x "${ARM_OUT}" 2>/dev/null || true
        echo -e "${GREEN}✓ API (arm64): ${ARM_OUT}${NC}"
    fi
fi

echo "${VERSION}" > "${STAGING_DIR}/VERSION"
echo "${GIT_COMMIT}" >> "${STAGING_DIR}/VERSION"

echo ""
echo -e "${GREEN}✓ Forester staged: ${STAGING_DIR}${NC}"

echo ""
if [ "${CURRENT_OS}" = "windows" ]; then
    if command -v powershell.exe >/dev/null 2>&1; then
        powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${SCRIPT_DIR}/fetch_ffmpeg.ps1"
    else
        bash "${SCRIPT_DIR}/fetch_ffmpeg.sh"
    fi
else
    bash "${SCRIPT_DIR}/fetch_ffmpeg.sh"
fi

if [ -d "${FORESTER_DIR}/icons/build" ]; then
    mkdir -p "${STAGING_DIR}/icons"
    cp -R "${FORESTER_DIR}/icons/build/." "${STAGING_DIR}/icons/"
    echo -e "${GREEN}✓ Forester icons staged${NC}"
fi
