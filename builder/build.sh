#!/bin/bash
# Full build: Forester + API + Blender addon → ~/dfm_distr (or DFM_DIST).
# Usage: ./builder/build.sh [--write-local-config]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="${SCRIPT_DIR}/scripts"
WRITE_LOCAL_CONFIG=false

for arg in "$@"; do
    case "${arg}" in
        --write-local-config)
            WRITE_LOCAL_CONFIG=true
            ;;
        -h|--help)
            echo "Usage: $(basename "$0") [--write-local-config]"
            echo ""
            echo "  Builds forester, API, and Blender addon into DFM_DIST."
            echo "  Default output: \${HOME}/dfm_distr"
            echo "  Override with: DFM_DIST=/path/to/output ./builder/build.sh"
            exit 0
            ;;
    esac
done

echo ">>> Step 1: Build Forester"
bash "${SCRIPTS_DIR}/build_forester.sh"

echo ""
echo ">>> Step 2: Stage distribution"
bash "${SCRIPTS_DIR}/stage_dist.sh"

if [ "${WRITE_LOCAL_CONFIG}" = true ]; then
    echo ""
    echo ">>> Step 2b: Write ~/.dfm/setup.cfg"
    bash "${SCRIPTS_DIR}/write_setup_cfg.sh"
fi

echo ""
echo ">>> Step 3: Clean staging artifacts"
bash "${SCRIPTS_DIR}/clean_build.sh"

DFM_DIST="${DFM_DIST:-${HOME}/dfm_distr}"
echo ""
echo "Done: ${DFM_DIST}"
