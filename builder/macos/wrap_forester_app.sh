#!/bin/bash
# Wrap Forester CLI + API dylib into Forester.app (macOS DMG layout).

set -euo pipefail

PLATFORM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILDER_DIR="$(cd "${PLATFORM_DIR}/.." && pwd)"
SCRIPTS_DIR="${BUILDER_DIR}/scripts"

# shellcheck source=../scripts/lib/detect_platform.sh
. "${SCRIPTS_DIR}/lib/detect_platform.sh"
# shellcheck source=lib/app_bundle.sh
. "${PLATFORM_DIR}/lib/app_bundle.sh"
# shellcheck source=../scripts/lib/dfm_dist.sh
. "${SCRIPTS_DIR}/lib/dfm_dist.sh"

detect_platform
ensure_dfm_dist "${BUILDER_DIR}"
OUT_DIR="${OUT_DIR:-${BUILDER_DIR}/.staging/macos_installer}"

FORESTER_BIN="${DFM_DIST}/bin/${FORESTER_CLI_NAME}"
API_LIB="${DFM_DIST}/lib/${API_LIB_NAME}"

if [ ! -f "${FORESTER_BIN}" ]; then
    echo "Forester binary not found: ${FORESTER_BIN}" >&2
    echo "Run ./builder/macos/build.sh first." >&2
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
