#!/bin/bash
# Wrap Forester CLI + API dylib into Forester.app (macOS DMG layout).

set -euo pipefail

PLATFORM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILDER_DIR="$(cd "${PLATFORM_DIR}/.." && pwd)"
PROJECT_ROOT="$(cd "${BUILDER_DIR}/.." && pwd)"
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
FFMPEG_BIN="${DFM_DIST}/bin/${FFMPEG_BIN_NAME}"
API_LIB="${DFM_DIST}/lib/${API_LIB_NAME}"

if [ ! -f "${FORESTER_BIN}" ]; then
    echo "Forester binary not found: ${FORESTER_BIN}" >&2
    echo "Run ./builder/macos/build.sh first." >&2
    exit 1
fi

VERSION="$(head -1 "${DFM_DIST}/VERSION" 2>/dev/null || echo "1.0")"
APP_BUNDLE_VERSION="${VERSION}"

mkdir -p "${OUT_DIR}"

FORESTER_APP_ICON="${BUILDER_DIR}/.staging/forester/icons/AppIcon.icns"
if [ ! -f "${FORESTER_APP_ICON}" ]; then
    FORESTER_APP_ICON="${PROJECT_ROOT}/sources/backend/forester/icons/build/AppIcon.icns"
fi
if [ -f "${FORESTER_APP_ICON}" ]; then
    export FORESTER_APP_ICON
    echo "Using Forester app icon: ${FORESTER_APP_ICON}"
else
    echo "Warning: Forester AppIcon.icns not found (run build_forester.sh on macOS first)"
fi

create_forester_console_app "${OUT_DIR}" "${FORESTER_BIN}"

FORESTER_RESOURCES_BIN="${OUT_DIR}/Forester.app/Contents/Resources/bin"
if [ -f "${FFMPEG_BIN}" ]; then
    mkdir -p "${FORESTER_RESOURCES_BIN}"
    cp "${FFMPEG_BIN}" "${FORESTER_RESOURCES_BIN}/${FFMPEG_BIN_NAME}"
    chmod +x "${FORESTER_RESOURCES_BIN}/${FFMPEG_BIN_NAME}" 2>/dev/null || true
    echo "Bundled ffmpeg → Forester.app/Contents/Resources/bin/${FFMPEG_BIN_NAME}"
else
    echo "Warning: ffmpeg not found at ${FFMPEG_BIN} (thumbnail previews will not work)"
fi

if [ -f "${API_LIB}" ]; then
    cp "${API_LIB}" "${OUT_DIR}/Forester.app/Contents/Frameworks/${API_LIB_NAME}"
    chmod +x "${OUT_DIR}/Forester.app/Contents/Frameworks/${API_LIB_NAME}" 2>/dev/null || true
else
    echo "Warning: API library not found at ${API_LIB} (Forester.app will contain CLI only)"
fi

FORESTER_SHARE_SCRIPTS="${DFM_DIST}/share/scripts"
if [ -d "${FORESTER_SHARE_SCRIPTS}" ]; then
    mkdir -p "${OUT_DIR}/Forester.app/Contents/Resources/share/scripts"
    cp -R "${FORESTER_SHARE_SCRIPTS}/." "${OUT_DIR}/Forester.app/Contents/Resources/share/scripts/"
    echo "Bundled merge scripts → Forester.app/Contents/Resources/share/scripts/"
else
    echo "Warning: ${FORESTER_SHARE_SCRIPTS} not found (object merge will need blender.merge_apply_script in ~/.dfm/setup.cfg)"
fi

echo "Created ${OUT_DIR}/Forester.app"
