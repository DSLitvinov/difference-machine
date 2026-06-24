# Shared Wails GUI toolchain checks and build helpers.
# Source after detect_platform.sh and setup_dev_path.sh.

INSTALL_WAILS="${INSTALL_WAILS:-true}"
WAILS_PACKAGE="${WAILS_PACKAGE:-github.com/wailsapp/wails/v2/cmd/wails@latest}"

ensure_wails_cli() {
    if command -v wails >/dev/null 2>&1; then
        return 0
    fi

    if [ "${INSTALL_WAILS}" = true ]; then
        echo -e "${YELLOW:-}Wails CLI not found — installing via go install...${NC:-}" >&2
        go install "${WAILS_PACKAGE}"
        setup_dev_path
    fi

    if ! command -v wails >/dev/null 2>&1; then
        echo "Wails CLI not found in PATH." >&2
        echo "Ensure \$(go env GOPATH)/bin is on PATH, or run:" >&2
        echo "  go install ${WAILS_PACKAGE}" >&2
        return 1
    fi
}

check_wails_go_node() {
    local go_hint node_hint

    case "${CURRENT_OS}" in
        macos)
            go_hint="Install Go 1.22+: brew install go"
            node_hint="Install Node.js 20+ LTS: brew install node"
            ;;
        linux)
            go_hint="Install Go 1.22+: sudo apt install golang-go or https://go.dev/dl/"
            node_hint="Install Node.js 20+ LTS from your distro or https://nodejs.org/"
            ;;
        windows)
            go_hint="Install Go 1.22+: https://go.dev/dl/"
            node_hint="Install Node.js 20+ LTS: https://nodejs.org/"
            ;;
        *)
            go_hint="Install Go 1.22+"
            node_hint="Install Node.js 20+ LTS"
            ;;
    esac

    require_command go "${go_hint}" || return 1
    require_command node "${node_hint}" || return 1
    require_command npm "npm should ship with Node.js" || return 1

    echo -e "${GREEN}✓ Go: $(go version)${NC}"
    echo -e "${GREEN}✓ Node: $(node --version)${NC}"
    echo -e "${GREEN}✓ npm: $(npm --version)${NC}"
}

check_wails_platform_deps() {
    case "${CURRENT_OS}" in
        macos)
            if ! xcode-select -p >/dev/null 2>&1; then
                echo -e "${RED}Xcode Command Line Tools are required.${NC}" >&2
                echo "Run: xcode-select --install" >&2
                return 1
            fi
            echo -e "${GREEN}✓ Xcode Command Line Tools${NC}"
            ;;
        linux)
            require_command gcc "Install build-essential: sudo apt install build-essential" || return 1
            require_command pkg-config "Install pkg-config: sudo apt install pkg-config" || return 1
            echo -e "${GREEN}✓ gcc: $(gcc --version | head -1)${NC}"
            echo -e "${GREEN}✓ pkg-config: $(pkg-config --version)${NC}"

            if ! pkg-config --exists gtk+-3.0 2>/dev/null; then
                echo -e "${RED}libgtk-3-dev is required (pkg-config gtk+-3.0).${NC}" >&2
                echo "Install: sudo apt install libgtk-3-dev" >&2
                return 1
            fi
            echo -e "${GREEN}✓ gtk+-3.0${NC}"

            if pkg-config --exists webkit2gtk-4.0 2>/dev/null; then
                echo -e "${GREEN}✓ webkit2gtk-4.0${NC}"
            elif pkg-config --exists webkit2gtk-4.1 2>/dev/null; then
                echo -e "${GREEN}✓ webkit2gtk-4.1 (build tag webkit2_41)${NC}"
            else
                echo -e "${RED}WebKitGTK dev package is required.${NC}" >&2
                echo "Install: sudo apt install libwebkit2gtk-4.1-dev" >&2
                echo "Or on older distros: sudo apt install libwebkit2gtk-4.0-dev" >&2
                return 1
            fi
            ;;
        windows)
            if ! command -v gcc >/dev/null 2>&1; then
                echo -e "${YELLOW}⚠ gcc not found in PATH (MinGW-w64 or MSVC may still work via wails doctor)${NC}" >&2
            else
                echo -e "${GREEN}✓ gcc: $(gcc --version | head -1)${NC}"
            fi
            ;;
    esac
}

detect_linux_wails_tags() {
    WAILS_BUILD_TAGS=""

    if [ "${CURRENT_OS}" != "linux" ]; then
        return 0
    fi

    if pkg-config --exists webkit2gtk-4.0 2>/dev/null; then
        WAILS_BUILD_TAGS=""
        return 0
    fi

    if pkg-config --exists webkit2gtk-4.1 2>/dev/null; then
        WAILS_BUILD_TAGS="webkit2_41"
        return 0
    fi

    return 1
}

run_wails_doctor_summary() {
    if ! command -v wails >/dev/null 2>&1; then
        return 0
    fi

    echo ""
    echo "=== wails doctor (summary) ==="
    if ! wails doctor 2>&1 | tail -20; then
        echo -e "${YELLOW}⚠ wails doctor reported issues (continuing build)${NC}"
    fi
}

run_wails_build() {
    local gui_dir="$1"

    detect_linux_wails_tags

    echo ""
    echo "=== wails build ==="
    cd "${gui_dir}"

    if [ -n "${WAILS_BUILD_TAGS:-}" ]; then
        echo "Using build tags: ${WAILS_BUILD_TAGS}"
        wails build -tags "${WAILS_BUILD_TAGS}"
    else
        wails build
    fi
}
