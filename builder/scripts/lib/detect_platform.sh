# Shared platform detection for builder scripts.
# Source this file: . "${SCRIPT_DIR}/lib/detect_platform.sh"

detect_platform() {
    case "$(uname -s)" in
        Linux*)
            CURRENT_OS="linux"
            FORESTER_CLI_NAME="forester"
            API_LIB_NAME="libforester.so"
            DEFAULT_PREFIX="/opt/DiffMachine"
            ;;
        Darwin*)
            CURRENT_OS="macos"
            FORESTER_CLI_NAME="forester"
            API_LIB_NAME="libforester.dylib"
            DEFAULT_PREFIX="/Applications/DiffMachine"
            ;;
        MINGW*|MSYS*|CYGWIN*)
            CURRENT_OS="windows"
            FORESTER_CLI_NAME="forester.exe"
            API_LIB_NAME="forester.dll"
            DEFAULT_PREFIX="C:\\Program Files\\DiffMachine"
            ;;
        *)
            CURRENT_OS="unknown"
            FORESTER_CLI_NAME="forester"
            API_LIB_NAME="libforester.so"
            DEFAULT_PREFIX="/opt/DiffMachine"
            ;;
    esac
}
