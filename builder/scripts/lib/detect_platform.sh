# Shared platform detection for builder scripts.
# Source this file: . "${SCRIPT_DIR}/lib/detect_platform.sh"

detect_platform() {
    case "$(uname -s)" in
        Linux*)
            CURRENT_OS="linux"
            FORESTER_CLI_NAME="forester"
            API_LIB_NAME="libforester.so"
            FFMPEG_BIN_NAME="ffmpeg"
            DEFAULT_PREFIX="/opt/DiffMachine"
            GUI_WAILS_OUTPUT="difference-machine"
            GUI_STAGE_NAME="difference-machine"
            GUI_RELEASE_ARCHIVE_EXT="tar.gz"
            ;;
        Darwin*)
            CURRENT_OS="macos"
            FORESTER_CLI_NAME="forester"
            API_LIB_NAME="libforester.dylib"
            FFMPEG_BIN_NAME="ffmpeg"
            DEFAULT_PREFIX="/Applications/Difference Machine"
            GUI_WAILS_OUTPUT="difference-machine"
            GUI_STAGE_NAME="Difference Machine.app"
            GUI_RELEASE_ARCHIVE_EXT="dmg"
            ;;
        MINGW*|MSYS*|CYGWIN*)
            CURRENT_OS="windows"
            FORESTER_CLI_NAME="forester.exe"
            API_LIB_NAME="forester.dll"
            FFMPEG_BIN_NAME="ffmpeg.exe"
            DEFAULT_PREFIX="C:\\Program Files\\Difference Machine"
            GUI_WAILS_OUTPUT="difference-machine"
            GUI_STAGE_NAME="difference-machine.exe"
            GUI_RELEASE_ARCHIVE_EXT="zip"
            ;;
        *)
            CURRENT_OS="unknown"
            FORESTER_CLI_NAME="forester"
            API_LIB_NAME="libforester.so"
            FFMPEG_BIN_NAME="ffmpeg"
            DEFAULT_PREFIX="/opt/DiffMachine"
            GUI_WAILS_OUTPUT="difference-machine"
            GUI_STAGE_NAME="difference-machine"
            GUI_RELEASE_ARCHIVE_EXT="tar.gz"
            ;;
    esac
}
