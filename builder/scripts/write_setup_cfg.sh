#!/bin/bash
# Write ~/.dfm/setup.cfg pointing at DFM_DIST (dev convenience; optional)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/detect_platform.sh
. "${SCRIPT_DIR}/lib/detect_platform.sh"
# shellcheck source=lib/dfm_dist.sh
. "${SCRIPT_DIR}/lib/dfm_dist.sh"
detect_platform

BUILDER_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ensure_dfm_dist "${BUILDER_DIR}"
CONFIG_DIR="${HOME}/.dfm"
CONFIG_FILE="${CONFIG_DIR}/setup.cfg"

FORESTER_BIN="${DFM_DIST}/bin/${FORESTER_CLI_NAME}"
API_LIB="${DFM_DIST}/lib/${API_LIB_NAME}"
ADDON_PATH="${DFM_DIST}/addons/blender/difference_machine"

if [ ! -d "${DFM_DIST}" ]; then
    echo "Distribution not found: ${DFM_DIST}"
    exit 1
fi

mkdir -p "${CONFIG_DIR}"

cat > "${CONFIG_FILE}" << EOF
[forester]
installed = true
path = ${FORESTER_BIN}

[api]
installed = true
path = ${API_LIB}

[addons]
diffmachine_path = ${ADDON_PATH}
EOF

echo "Wrote ${CONFIG_FILE}"
