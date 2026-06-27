#!/bin/bash
# Download a platform ffmpeg build into builder/.staging/forester/bin/
# Archives and extracted binaries are cached under builder/.cache/ffmpeg/ (survives clean).

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/detect_platform.sh
. "${SCRIPT_DIR}/lib/detect_platform.sh"
detect_platform
# shellcheck source=lib/ffmpeg_cache.sh
. "${SCRIPT_DIR}/lib/ffmpeg_cache.sh"

BUILDER_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
STAGING_DIR="${BUILDER_DIR}/.staging/forester"
STAGING_BIN="${STAGING_DIR}/bin"
CACHE_DIR="$(ffmpeg_archive_cache_dir)"
FFMPEG_RELEASE_TAG="${FFMPEG_RELEASE_TAG:-latest}"

if [ "${FFMPEG_SKIP:-false}" = "true" ]; then
    echo -e "${YELLOW}FFMPEG_SKIP=true — skipping bundled ffmpeg fetch${NC}"
    exit 0
fi

if [ "${CURRENT_OS}" = "unknown" ]; then
    echo -e "${RED}Unsupported platform for ffmpeg fetch${NC}"
    exit 1
fi

mkdir -p "${STAGING_BIN}" "${CACHE_DIR}"

ffmpeg_release_label() {
    if [ "${FFMPEG_RELEASE_TAG}" = "latest" ]; then
        echo "master-latest"
    else
        echo "${FFMPEG_RELEASE_TAG}"
    fi
}

resolve_ffmpeg_archive() {
    local label
    label="$(ffmpeg_release_label)"
    case "${CURRENT_OS}" in
        windows)
            echo "ffmpeg-${label}-win64-gpl.zip"
            ;;
        linux)
            case "$(uname -m)" in
                aarch64|arm64)
                    echo "ffmpeg-${label}-linuxarm64-gpl.tar.xz"
                    ;;
                *)
                    echo "ffmpeg-${label}-linux64-gpl.tar.xz"
                    ;;
            esac
            ;;
    esac
}

stage_ffmpeg_from_system_path() {
    local src=""
    if [ -n "${DFM_FFMPEG_PATH:-}" ]; then
        src="${DFM_FFMPEG_PATH}"
    elif command -v ffmpeg >/dev/null 2>&1; then
        src="$(command -v ffmpeg)"
    fi
    if [ -z "${src}" ] || [ ! -f "${src}" ]; then
        return 1
    fi
    cp "${src}" "${STAGING_BIN}/${FFMPEG_BIN_NAME}"
    chmod 755 "${STAGING_BIN}/${FFMPEG_BIN_NAME}" 2>/dev/null || true
    ffmpeg_persist_bin_cache "${STAGING_BIN}"
    echo -e "${GREEN}✓ ffmpeg staged from system: ${src}${NC}"
}

if [ "${CURRENT_OS}" = "macos" ]; then
    if [ -f "${STAGING_BIN}/${FFMPEG_BIN_NAME}" ] && [ "${FFMPEG_FORCE:-false}" != "true" ]; then
        echo -e "${GREEN}✓ Bundled ffmpeg already present: ${STAGING_BIN}/${FFMPEG_BIN_NAME}${NC}"
        exit 0
    fi

    if [ "${FFMPEG_FORCE:-false}" != "true" ]; then
        reuse_source="$(ffmpeg_stage_from_previous_builds "${STAGING_BIN}" "${BUILDER_DIR}" || true)"
        if [ -n "${reuse_source}" ] && [ -f "${STAGING_BIN}/${FFMPEG_BIN_NAME}" ]; then
            ffmpeg_persist_bin_cache "${STAGING_BIN}"
            case "${reuse_source}" in
                cache)
                    echo -e "${GREEN}✓ Reused ffmpeg from build cache: ${STAGING_BIN}/${FFMPEG_BIN_NAME}${NC}"
                    ;;
                dist)
                    echo -e "${GREEN}✓ Reused ffmpeg from previous dist payload: ${STAGING_BIN}/${FFMPEG_BIN_NAME}${NC}"
                    ;;
            esac
            exit 0
        fi
    fi

    echo "=== Fetch ffmpeg (macos) ==="
    echo -e "${YELLOW}BtbN/FFmpeg-Builds has no macOS builds; staging ffmpeg from PATH (e.g. Homebrew)${NC}"
    if stage_ffmpeg_from_system_path; then
        exit 0
    fi
    echo -e "${RED}ffmpeg not found — install with: brew install ffmpeg${NC}"
    echo -e "${RED}Or set FFMPEG_SKIP=true to build without bundling ffmpeg${NC}"
    exit 1
fi

ARCHIVE_NAME="$(resolve_ffmpeg_archive)"
ARCHIVE_PATH="${CACHE_DIR}/${ARCHIVE_NAME}"
DOWNLOAD_URL="https://github.com/BtbN/FFmpeg-Builds/releases/download/${FFMPEG_RELEASE_TAG}/${ARCHIVE_NAME}"

if [ -f "${STAGING_BIN}/${FFMPEG_BIN_NAME}" ] && [ "${FFMPEG_FORCE:-false}" != "true" ]; then
    echo -e "${GREEN}✓ Bundled ffmpeg already present: ${STAGING_BIN}/${FFMPEG_BIN_NAME}${NC}"
    exit 0
fi

if [ "${FFMPEG_FORCE:-false}" != "true" ]; then
    reuse_source="$(ffmpeg_stage_from_previous_builds "${STAGING_BIN}" "${BUILDER_DIR}" || true)"
    if [ -n "${reuse_source}" ] && [ -f "${STAGING_BIN}/${FFMPEG_BIN_NAME}" ]; then
        ffmpeg_persist_bin_cache "${STAGING_BIN}"
        case "${reuse_source}" in
            cache)
                echo -e "${GREEN}✓ Reused ffmpeg from build cache: ${STAGING_BIN}/${FFMPEG_BIN_NAME}${NC}"
                ;;
            dist)
                echo -e "${GREEN}✓ Reused ffmpeg from previous dist payload: ${STAGING_BIN}/${FFMPEG_BIN_NAME}${NC}"
                ;;
        esac
        exit 0
    fi
fi

echo "=== Fetch ffmpeg (${CURRENT_OS}) ==="
echo "URL: ${DOWNLOAD_URL}"

if [ ! -f "${ARCHIVE_PATH}" ] || [ "${FFMPEG_FORCE:-false}" = "true" ]; then
    if command -v curl >/dev/null 2>&1; then
        curl -fL --retry 3 --retry-delay 2 -o "${ARCHIVE_PATH}" "${DOWNLOAD_URL}"
    elif command -v wget >/dev/null 2>&1; then
        wget -O "${ARCHIVE_PATH}" "${DOWNLOAD_URL}"
    else
        echo -e "${RED}curl or wget is required to download ffmpeg${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Using cached archive: ${ARCHIVE_PATH}${NC}"
fi

EXTRACT_DIR="${CACHE_DIR}/extract-${ARCHIVE_NAME}"
rm -rf "${EXTRACT_DIR}"
mkdir -p "${EXTRACT_DIR}"

case "${ARCHIVE_NAME}" in
    *.zip)
        if command -v unzip >/dev/null 2>&1; then
            unzip -q "${ARCHIVE_PATH}" -d "${EXTRACT_DIR}"
        else
            echo -e "${RED}unzip is required to extract ffmpeg archive${NC}"
            exit 1
        fi
        ;;
    *.tar.xz)
        tar -xJf "${ARCHIVE_PATH}" -C "${EXTRACT_DIR}"
        ;;
    *)
        echo -e "${RED}Unsupported ffmpeg archive: ${ARCHIVE_NAME}${NC}"
        exit 1
        ;;
esac

FFMPEG_SRC="$(find "${EXTRACT_DIR}" -type f -name "${FFMPEG_BIN_NAME}" | head -n 1)"
if [ -z "${FFMPEG_SRC}" ]; then
    echo -e "${RED}ffmpeg binary not found in ${ARCHIVE_NAME}${NC}"
    exit 1
fi

FFMPEG_SRC_DIR="$(dirname "${FFMPEG_SRC}")"
cp "${FFMPEG_SRC}" "${STAGING_BIN}/${FFMPEG_BIN_NAME}"
chmod 755 "${STAGING_BIN}/${FFMPEG_BIN_NAME}" 2>/dev/null || true

if [ "${CURRENT_OS}" = "windows" ]; then
    shopt -s nullglob
    for dll in "${FFMPEG_SRC_DIR}"/*.dll; do
        cp "${dll}" "${STAGING_BIN}/"
    done
    shopt -u nullglob
fi

ffmpeg_persist_bin_cache "${STAGING_BIN}"

echo -e "${GREEN}✓ ffmpeg staged: ${STAGING_BIN}/${FFMPEG_BIN_NAME}${NC}"
