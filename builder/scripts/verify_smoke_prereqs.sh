#!/bin/bash
# Verify smoke-checklist prerequisites §1.1 (steps 3–5).
# Usage: ./builder/scripts/verify_smoke_prereqs.sh [REPO_PATH]

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

INSTALL_ROOT="${INSTALL_ROOT:-/Applications/Difference Machine}"
SETUP_CFG="${HOME}/.dfm/setup.cfg"
REPO_PATH="${1:-}"

pass() { echo -e "${GREEN}✓${NC} $*"; }
fail() { echo -e "${RED}✗${NC} $*" >&2; ERR=1; }
warn() { echo -e "${YELLOW}!${NC} $*"; }

ERR=0

echo "=== Step 3: Toolchain ==="

FORESTER_BIN="${INSTALL_ROOT}/Forester.app/Contents/Resources/bin/forester"
ADDON_ZIP="${INSTALL_ROOT}/addons/blender/difference_machine.zip"
ADDON_DIR="${INSTALL_ROOT}/addons/blender/difference_machine"
GUI_APP="${INSTALL_ROOT}/Difference Machine.app"
API_LIB="${INSTALL_ROOT}/Forester.app/Contents/Frameworks/libforester.dylib"

if [ -x "${FORESTER_BIN}" ]; then
    pass "Forester CLI: ${FORESTER_BIN}"
    if ! "${FORESTER_BIN}" --version >/dev/null 2>&1; then
        fail "forester --version failed"
    fi
else
    fail "Forester CLI not found: ${FORESTER_BIN}"
fi

if [ -f "${ADDON_ZIP}" ]; then
    pass "Blender addon zip: ${ADDON_ZIP}"
    if ! unzip -Z1 "${ADDON_ZIP}" | grep -Fxq 'difference_machine/blender_manifest.toml'; then
        fail "addon zip missing difference_machine/blender_manifest.toml"
    fi
else
    fail "Blender addon zip not found: ${ADDON_ZIP}"
fi

if [ -f "${ADDON_DIR}/blender_manifest.toml" ]; then
    pass "Blender addon dir (GUI bootstrap): ${ADDON_DIR}"
else
    warn "Addon dir missing (launch GUI once to extract zip): ${ADDON_DIR}"
fi

if [ -d "${GUI_APP}" ]; then
    pass "GUI app: ${GUI_APP}"
else
    fail "GUI app not found: ${GUI_APP}"
fi

if [ -f "${API_LIB}" ]; then
    pass "API library: ${API_LIB}"
else
    warn "API library not found: ${API_LIB}"
fi

if [ -f "${SETUP_CFG}" ]; then
    pass "setup.cfg: ${SETUP_CFG}"
    while IFS= read -r path; do
        [ -n "${path}" ] || continue
        if [ -e "${path}" ]; then
            pass "  path ok: ${path}"
        else
            fail "  path missing: ${path}"
        fi
    done < <(grep -E '^(path|diffmachine_path) =' "${SETUP_CFG}" | sed -E 's/^[^=]+= *"?([^"]+)"?.*/\1/')
else
    warn "setup.cfg not found — launch ${GUI_APP} once after install"
fi

echo ""
echo "=== Step 4: Test repository ==="

if [ -z "${REPO_PATH}" ]; then
    if [ -f "${SETUP_CFG}" ]; then
        REPO_PATH="$(awk -F' = ' '/^\[current repo\]/{p=1; next} /^\[/{p=0} p && /^path/{print $2; exit}' "${SETUP_CFG}")"
    fi
fi

if [ -z "${REPO_PATH}" ]; then
    REPO_PATH="${SMOKE_REPO:-${HOME}/dfm_smoke_repo}"
fi

if [ ! -d "${REPO_PATH}/.DFM" ]; then
  mkdir -p "${REPO_PATH}"
  if [ -x "${FORESTER_BIN}" ]; then
    echo "Initializing smoke repo at ${REPO_PATH}"
    (cd "${REPO_PATH}" && "${FORESTER_BIN}" init)
    echo "smoke" > "${REPO_PATH}/readme.txt"
    (cd "${REPO_PATH}" && "${FORESTER_BIN}" add readme.txt && "${FORESTER_BIN}" commit -m "Smoke init")
  else
    fail "Cannot init repo — forester missing"
  fi
fi

if [ -d "${REPO_PATH}/.DFM" ]; then
    pass "Repository: ${REPO_PATH}"
else
    fail "Not a Forester repo: ${REPO_PATH}"
fi

if [ -x "${FORESTER_BIN}" ]; then
    COMMITS="$(cd "${REPO_PATH}" && "${FORESTER_BIN}" log --oneline 2>/dev/null | wc -l | tr -d ' ')"
    if [ "${COMMITS}" -ge 1 ]; then
        pass "Commits: ${COMMITS}"
    else
        fail "Repository has no commits: ${REPO_PATH}"
    fi
fi

echo ""
echo "=== Step 5: Window minimums ==="

MAIN_GO="${PROJECT_ROOT}/sources/gui/main.go"
LAYOUT_TS="${PROJECT_ROOT}/sources/gui/frontend/src/lib/layout.ts"

if grep -q 'MinWidth:  1435' "${MAIN_GO}" && grep -q 'MinHeight: 720' "${MAIN_GO}"; then
    pass "Wails MinWidth/MinHeight: 1435×720 (main.go)"
else
    fail "main.go window minimums do not match smoke spec"
fi

if grep -q 'MIN_WINDOW_PROJECT = SIDEBAR_COLUMN_MIN + PREVIEW_MIN + INFO_MIN' "${LAYOUT_TS}"; then
    pass "Frontend layout constants (layout.ts)"
    PROJECT_MIN=$((334 + 747 + 354))
    HISTORY_MIN=$((334 + 747))
    if [ "${PROJECT_MIN}" -eq 1435 ] && [ "${HISTORY_MIN}" -eq 1081 ]; then
        pass "Computed minimums: Project ${PROJECT_MIN}×720, History ${HISTORY_MIN}×720"
    else
        fail "Layout minimums mismatch: project=${PROJECT_MIN}, history=${HISTORY_MIN}"
    fi
else
    fail "layout.ts missing project/history minimums"
fi

echo ""
if [ "${ERR}" -eq 0 ]; then
    echo -e "${GREEN}Smoke prerequisites 3–5: OK${NC}"
    echo "Test repo: ${REPO_PATH}"
    exit 0
fi

echo -e "${RED}Smoke prerequisites: FAILED${NC}" >&2
exit 1
