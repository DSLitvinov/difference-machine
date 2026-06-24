#!/bin/bash
# Helpers to assemble minimal macOS .app bundles (Forester CLI wrapper).

# create_macos_app_bundle APP_DIR BUNDLE_NAME EXECUTABLE_PATH
create_macos_app_bundle() {
    local app_dir="$1"
    local bundle_name="$2"
    local executable_src="$3"

    if [ ! -f "${executable_src}" ]; then
        echo "Executable not found: ${executable_src}" >&2
        return 1
    fi

    local contents="${app_dir}/${bundle_name}.app/Contents"
    local macos_dir="${contents}/MacOS"
    local frameworks_dir="${contents}/Frameworks"
    local exec_name
    exec_name="$(basename "${executable_src}")"

    rm -rf "${app_dir}/${bundle_name}.app"
    mkdir -p "${macos_dir}" "${frameworks_dir}"

    cp "${executable_src}" "${macos_dir}/${exec_name}"
    chmod +x "${macos_dir}/${exec_name}"

    write_app_info_plist "${contents}/Info.plist" "${bundle_name}" "${exec_name}"
}

# create_forester_console_app APP_DIR REAL_FORESTER_BINARY_PATH
create_forester_console_app() {
    local app_dir="$1"
    local forester_bin="$2"
    local bundle_name="Forester"
    local launcher_name="Forester"

    if [ ! -f "${forester_bin}" ]; then
        echo "Forester binary not found: ${forester_bin}" >&2
        return 1
    fi

    local app_path="${app_dir}/${bundle_name}.app"
    local contents="${app_path}/Contents"
    local macos_dir="${contents}/MacOS"
    local resources_dir="${contents}/Resources"
    local frameworks_dir="${contents}/Frameworks"

    rm -rf "${app_path}"
    mkdir -p "${macos_dir}" "${resources_dir}" "${frameworks_dir}"

    cp "${forester_bin}" "${resources_dir}/forester"
    chmod +x "${resources_dir}/forester"

    mkdir -p "${resources_dir}/bin"
    cat > "${resources_dir}/bin/forester" << 'WRAPPER'
#!/bin/bash
set -euo pipefail

BIN_DIR="$(cd "$(dirname "$0")" && pwd)"
CONTENTS_DIR="$(cd "${BIN_DIR}/.." && pwd)"
FORESTER_BIN="${CONTENTS_DIR}/forester"
FRAMEWORKS_DIR="${CONTENTS_DIR}/Frameworks"

if [ -d "${FRAMEWORKS_DIR}" ]; then
    export DYLD_LIBRARY_PATH="${FRAMEWORKS_DIR}${DYLD_LIBRARY_PATH:+:${DYLD_LIBRARY_PATH}}"
fi

exec "${FORESTER_BIN}" "$@"
WRAPPER
    chmod +x "${resources_dir}/bin/forester"

    cat > "${macos_dir}/${launcher_name}" << 'LAUNCHER'
#!/bin/bash
set -euo pipefail

CONTENTS_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FORESTER_BIN="${CONTENTS_DIR}/Resources/forester"
FORESTER_BIN_DIR="${CONTENTS_DIR}/Resources/bin"
FRAMEWORKS_DIR="${CONTENTS_DIR}/Frameworks"

if [ -d "${FRAMEWORKS_DIR}" ]; then
    export DYLD_LIBRARY_PATH="${FRAMEWORKS_DIR}${DYLD_LIBRARY_PATH:+:${DYLD_LIBRARY_PATH}}"
fi

run_forester() {
    exec "${FORESTER_BIN}" "$@"
}

open_terminal_session() {
    osascript - "$FORESTER_BIN_DIR" <<'APPLESCRIPT' || return 1
on run argv
    set binDir to item 1 of argv
    set shCmd to "export PATH=" & quoted form of binDir & ":$PATH; echo ''; echo 'Forester CLI - examples: forester status | forester log | forester --help'; echo ''"
    tell application "Terminal" to activate
    tell application "Terminal" to do script shCmd
end run
APPLESCRIPT
}

if [ "$#" -gt 0 ]; then
    run_forester "$@"
fi

if open_terminal_session; then
    exit 0
fi

TMP_SCRIPT="$(mktemp -t forester-cli.XXXXXX).command"
cat > "${TMP_SCRIPT}" <<SCRIPT
#!/bin/bash
export PATH=$(printf '%q' "${FORESTER_BIN_DIR}"):\$PATH
echo ''
echo 'Forester CLI - examples: forester status | forester log | forester --help'
echo ''
SCRIPT
chmod +x "${TMP_SCRIPT}"
open "${TMP_SCRIPT}"
LAUNCHER

    chmod +x "${macos_dir}/${launcher_name}"
    write_app_info_plist "${contents}/Info.plist" "${bundle_name}" "${launcher_name}"
}

write_app_info_plist() {
    local plist_path="$1"
    local bundle_name="$2"
    local exec_name="$3"

    cat > "${plist_path}" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>en</string>
    <key>CFBundleExecutable</key>
    <string>${exec_name}</string>
    <key>CFBundleIdentifier</key>
    <string>com.difference-machine.${bundle_name// /}</string>
    <key>CFBundleName</key>
    <string>${bundle_name}</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>${APP_BUNDLE_VERSION:-1.0}</string>
    <key>CFBundleVersion</key>
    <string>${APP_BUNDLE_VERSION:-1}</string>
    <key>LSApplicationCategoryType</key>
    <string>public.app-category.developer-tools</string>
    <key>LSMinimumSystemVersion</key>
    <string>11.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
EOF
}
