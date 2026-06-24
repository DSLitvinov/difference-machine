#!/bin/bash
# Wrap Forester CLI + API dylib into Forester.app

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/detect_platform.sh
. "${SCRIPT_DIR}/lib/detect_platform.sh"
# shellcheck source=lib/macos_app_bundle.sh
. "${SCRIPT_DIR}/lib/macos_app_bundle.sh"

detect_platform

if [ "${CURRENT_OS}" != "macos" ]; then
    echo "Forester.app wrapper is macOS only (current: ${CURRENT_OS})" >&2
    exit 1
fi

BUILDER_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
DFM_DIST="${DFM_DIST:-${HOME}/dfm_distr}"
OUT_DIR="${OUT_DIR:-${BUILDER_DIR}/.staging/macos_installer}"

FORESTER_BIN="${DFM_DIST}/bin/${FORESTER_CLI_NAME}"
API_LIB="${DFM_DIST}/lib/${API_LIB_NAME}"

if [ ! -f "${FORESTER_BIN}" ]; then
    echo "Forester binary not found: ${FORESTER_BIN}" >&2
    echo "Run ./builder/build.sh first." >&2
    exit 1
fi

VERSION="$(head -1 "${DFM_DIST}/VERSION" 2>/dev/null || echo "1.0")"
APP_BUNDLE_VERSION="${VERSION}"

mkdir -p "${OUT_DIR}"

create_forester_console_app "${OUT_DIR}" "${FORESTER_BIN}"

if [ -f "${API_LIB}" ]; then
    cp "${API_LIB}" "${OUT_DIR}/Forester.app/Contents/Frameworks/${API_LIB_NAME}"
    chmod +x "${OUT_DIR}/Forester.app/Contents/Frameworks/${API_LIB_NAME}" 2>/dev/null || true
else
    echo "Warning: API library not found at ${API_LIB} (Forester.app will contain CLI only)"
fi

echo "Created ${OUT_DIR}/Forester.app"
