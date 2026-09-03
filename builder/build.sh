#!/bin/bash
# Delegates to the platform build script for the current OS.

set -euo pipefail

BUILDER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/detect_platform.sh
. "${BUILDER_DIR}/scripts/lib/detect_platform.sh"

detect_platform

case "${CURRENT_OS}" in
    macos)
        exec "${BUILDER_DIR}/macos/build.sh" "$@"
        ;;
    linux)
        exec "${BUILDER_DIR}/linux/build.sh" "$@"
        ;;
    windows)
        exec "${BUILDER_DIR}/windows/build.sh" "$@"
        ;;
    *)
        echo "ERROR: Unsupported platform: ${CURRENT_OS}" >&2
        echo "Use: builder/macos/build.sh | builder/linux/build.sh | builder/windows/build.sh" >&2
        exit 1
        ;;
esac
